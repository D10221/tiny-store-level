import jsonquery from "jsonquery";
import { LevelUp } from "levelup";
import { Transform } from "stream";
import keyEncoder, { isValidID, KEY_MAX_VALUE, KeyError } from "./keys";
import schema from "./schema";
import { Schema, Store, StoreRecord } from "./types";

function isNotFoundError(error: Error): error is Error {
  return error instanceof Error && error.name === "NotFoundError";
}
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
export default function createStore<T extends { [key: string]: any } = {}>(
  db: LevelUp,
  partitionName: string,
  schemas: Schema<T>[] = [],
) {
  const { encode, decode, base, isMatch } = keyEncoder(partitionName);
  const { primaryKey, applyDefaultValues, validate } = schema(
    schemas,
    partitionName,
  );
  async function idExists(id: keyof T & string) {
    try {
      await db.get(encode(id));
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }
  async function findOne(id: keyof T & string): Promise<T> {
    try {
      const value = await db.get(encode(id));
      return value;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async function add(data: StoreRecord<T>) {
    try {
      if (!data) throw new Error("StoreRecord required");
      const id = data[primaryKey.key];

      if (!isValidID(id)) throw KeyError.invalidOrMissig(primaryKey.key, id);

      if (await idExists(id)) throw KeyError.idExists(primaryKey.key, id);

      const value = applyDefaultValues(data);
      await validate(value, findMany);
      const ret = await db.put(encode(id), value);
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async function update(data: Partial<StoreRecord<T>>) {
    try {
      if (!data) throw new Error("@param data required");

      const id = data[primaryKey.key];
      if (!isValidID(id)) throw KeyError.invalidOrMissig(primaryKey.key, id);

      const prev = await findOne(id as any); // throw not found

      await validate({ [primaryKey.key]: id, ...data }, findMany); // throws

      const ret = await db.put(encode(id), { ...prev, ...data }); //key exception inscope
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  function findMany(query?: jsonquery.Query<T & { $key: string }>) {
    const transform = new Transform({
      objectMode: true,
      transform: function({ key, value }, _encoding_, callback) {
        this.push({ ...value, [primaryKey.key]: decode(key) });
        callback();
      },
    });
    const stream = db
      .createReadStream({
        gt: base(),
        lt: encode(KEY_MAX_VALUE),
      })
      .pipe(transform);
    return toPromise<StoreRecord<T>>(
      query ? stream.pipe(jsonquery(query)) : stream,
    );
  }
  function clear() {
    return new Promise<any>((resolve, reject) => {
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
  }
  const remove = (id: keyof T & string) => db.del(encode(id));
  // ...
  const store: Store<T> = {
    idExists,
    add,
    update,
    findMany,
    findOne,
    remove,
    clear,
  };
  return store;
}
