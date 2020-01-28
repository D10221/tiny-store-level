import jsonquery from "jsonquery";
import { LevelUp } from "levelup";
import { Transform } from "stream";
import isNotFoundError from "./isNotFoundError";
import keyEncoder from "./key-encoder";
import KeyError from "./KeyError";
import { isValidPrimaryKey, PRIMARY_KEY_MAX_VALUE } from "./primaryKeys";
import schema from "./schema";
import { Schema, Store, StoreRecord } from "./types";

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
/**
 *
 */
const createStore = <T extends { [key: string]: any } = {}>(
  db: LevelUp,
  partitionName: string,
  schemas: Schema<T>[] = [],
): Store<T> => {
  const { encode, decode, base, isMatch } = keyEncoder(partitionName);
  const { primaryKey, applyDefaultValues, validate } = schema(schemas, partitionName);

  const idExists = async (id: keyof T & string) => {
    try {
      await db.get(encode(id));
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  };

  const findOne = async (
    id: keyof T & string,
  ): Promise<T> => {
    try {
      const value = await db.get(encode(id));
      return value;
    } catch (error) {
      return Promise.reject(error);
    }
  };
  /** */
  async function add(data: StoreRecord<T>) {
    try {
      if (!data) return Promise.reject(new Error("StoreRecord required"))
      const id = data[primaryKey.key];
      if (!isValidPrimaryKey(id)) {
        return Promise.reject(new KeyError(`Invalid id: ${JSON.stringify(id)}`));
      }
      if (await store.idExists(id)) return Promise.reject(new KeyError(`Duplicated id: "${id}"`));
      const value = applyDefaultValues(data);
      await validate(value, store.findMany);
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
      const id = data[primaryKey.key];
      if (!isValidPrimaryKey(id)) return Promise.reject(new Error("Invalid key"));
      const prev = await store.findOne(id as any); // throw not found
      await validate({ [primaryKey.key]: id, ...data }, store.findMany);
      const ret = await db.put(encode(id), { ...prev, ...data });
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const findMany = (
    query?: jsonquery.Query<T & { $key: string }>,
  ) => {
    const transform = new Transform({
      objectMode: true,
      transform: function ({ key, value }, _encoding_, callback) {
        this.push({ ...value, [primaryKey.key]: decode(key) });
        callback();
      }
    });
    const stream = query
      ? db
        .createReadStream({
          gt: base(),
          lt: encode(PRIMARY_KEY_MAX_VALUE),
        })
        .pipe(transform)
        .pipe(jsonquery(query))
      : // ...
      db
        .createReadStream({
          gt: base(),
          lt: encode(PRIMARY_KEY_MAX_VALUE),
        })
        .pipe(transform)
    return toPromise<StoreRecord<T>>(stream);
  }
  const clear = () =>
    new Promise<any>((resolve, reject) => {
      try {
        const stream = db.createReadStream();
        let result = 0;
        stream.on("data", async ({ key }) => {
          if (isMatch(key)) {
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
  // ... 
  const store = {
    idExists,
    add,
    update,
    findMany,
    findOne,
    remove: (id: keyof T & string) => db.del(encode(id)),
    clear,
  };
  return store;
};
export type CreateStore = typeof createStore;
export default createStore;
