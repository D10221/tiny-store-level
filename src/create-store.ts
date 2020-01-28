import jsonquery from "jsonquery";
import { LevelUp } from "levelup";
import { Transform } from "stream";
import isNotFoundError from "./isNotFoundError";
import keyEncoder from "./key-encoder";
import KeyError from "./KeyError";
import { isValidPrimaryKey, PRIMARY_KEY_MAX_VALUE } from "./primaryKeys";
import schema from "./schema";
import { KeyEncoder, Schema, Store, StoreRecord } from "./types";
const idExists = (db: LevelUp) => async (id: string) => {
  try {
    await db.get(id);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
};
const findOne = (db: LevelUp) => <T>(encoder: KeyEncoder) => async (
  id: keyof T & string,
): Promise<T> => {
  try {
    const value = await db.get(encoder.encode(id));
    return value;
  } catch (error) {
    return Promise.reject(error);
  }
};
function toPromise<T>(stream: NodeJS.ReadableStream) {
  return new Promise<T[]>((resolve, reject) => {
    try {
      let result: T[] = [];
      stream.on("data", data => {
        ///if (enc.isMatch(key)) { }
        data && result.push(data);
      });
      stream.on("error", error => {
        reject(error);
      });
      // stream.on("close", () => {});
      stream.on("end", () => {
        resolve(result);
      });
    } catch (error) {
      return reject(error);
    }
  });
}
const findMany = (db: LevelUp) => <T>(enc: KeyEncoder) => (
  query?: jsonquery.Query<T & { $key: string }>,
) => {
  const transform = new Transform({
    objectMode: true,
    transform: function ({ key, value }, _encoding_, callback) {
      this.push({ ...value, $id: enc.decode(key) });
      callback();
    }
  });
  const stream = query
    ? db
      .createReadStream({
        gt: enc.base(),
        lt: enc.encode(PRIMARY_KEY_MAX_VALUE),
      })
      .pipe(transform)
      .pipe(jsonquery(query))
    : // ...
    db
      .createReadStream({
        gt: enc.base(),
        lt: enc.encode(PRIMARY_KEY_MAX_VALUE),
      })
      .pipe(transform);

  return toPromise<StoreRecord<T>>(stream);
}
const clear = (db: LevelUp) => (enc: KeyEncoder) => () =>
  new Promise<any>((resolve, reject) => {
    try {
      const stream = db.createReadStream();
      let result = 0;
      stream.on("data", async ({ key }) => {
        if (enc.isMatch(key)) {
          result = result + 1;
          await db.del(key);
        }
      });
      stream.on("error", error => {
        reject(error);
      });
      // stream.on("close", () => {});
      stream.on("end", () => {
        resolve(result);
      });
    } catch (error) {
      return reject(error);
    }
  });
/**
 *
 */
const createStore = <T extends { [key: string]: any } = {}>(
  db: LevelUp,
  partitionName: string,
  schemas: Schema<T>[] = [],
): Store<T> => {
  const { encode } = keyEncoder(partitionName);
  const _schema = schema(schemas, partitionName);
  /** */
  async function add(data: StoreRecord<T>) {
    try {
      if (!data) return Promise.reject(new Error("StoreRecord required"))
      const id = data[_schema.primaryKey.key];
      if (!isValidPrimaryKey(id)) {
        return Promise.reject(new KeyError(`Invalid id: ${JSON.stringify(id)}`));
      }
      if (await store.idExists(id)) return Promise.reject(new KeyError(`Duplicated id: "${id}"`));
      const value = _schema.applyDefaultValues(data);
      await _schema.validate(value, store.findMany);
      const ret = await db.put(encode(id), value);
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  /** */
  async function update(data: Partial<StoreRecord<T>>) {
    try {
      if (!data) return Promise.reject(new Error("StoreRecord required"))
      const id = data[_schema.primaryKey.key];
      if (!isValidPrimaryKey(id)) return Promise.reject(new Error("Invalid key"));
      const prev = await store.findOne(id); // throw not found
      await _schema.validate({ $id: id, ...data }, store.findMany);
      const ret = await db.put(encode(id), { ...prev, ...data });
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  const store = {
    idExists: (id: string) => idExists(db)(encode(id)),
    add,
    update,
    findMany: findMany(db)<T>(keyEncoder(partitionName)),
    findOne: findOne(db)<T>(keyEncoder(partitionName)),
    remove: (id: string) => db.del(encode(id)),
    clear: clear(db)(keyEncoder(partitionName)),
  };

  return store;
};
export type CreateStore = typeof createStore;
export default createStore;
