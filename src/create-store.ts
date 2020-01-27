import { keyEncoder } from "./key-encoder";
import schema from "./schema";
import { Schema, Store, StoreRecord, KeyEncoder } from "./types";
import KeyError from "./KeyError";
import isNotFoundError from "./isNotFoundError";
import { LevelUp } from "levelup";

const idExists = (db: LevelUp) => async (id: string) => {
  try {
    await db.get(id);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
};

/** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
const isValidPrimaryKey = (x: any) => {
  return typeof x === "string" && /^[a-zA-Z0-9]*$/.test(x);
};

const findOne = (db: LevelUp) => <T>(encoder: KeyEncoder) => async (
  id: string,
): Promise<T> => {
  try {
    const value = await db.get(encoder.encode(id));
    return value;
  } catch (error) {
    return Promise.reject(error);
  }
};

const findMany = (db: LevelUp) => <T>(enc: KeyEncoder) => () =>
  new Promise<StoreRecord<T>[]>((resolve, reject) => {
    try {
      const stream = db.createReadStream();
      let result: StoreRecord<T>[] = [];
      stream.on("data", ({ key, value }) => {
        if (enc.isMatch(key)) {
          result.push([enc.decode(key), value]);
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
const createStore = async <T extends { [key: string]: any } = {}>(
  db: LevelUp,
  partitionName: string,
  schemas: Schema<T>[] = [],
): Promise<Store<T>> => {
  const { encode } = keyEncoder(partitionName);

  const _schema = schema(schemas, partitionName);

  const store = {
    idExists: (id: string) => idExists(db)(encode(id)),
    /** */
    add: async (id: string, data: T) => {
      try {
        if (!isValidPrimaryKey(id))
          return Promise.reject(new KeyError(`Invalid id: ${id}`));

        const encoded = encode(id);
        if (await store.idExists(id)) {
          return Promise.reject(new KeyError(`Duplicated id: "${id}"`));
        }
        const value = _schema.applyDefaultValues(data);
        await _schema.validate([id, value], store.findMany);

        const ret = await db.put(encoded, value);
        return ret;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    /** */
    update: async (id: string, data: Partial<T>) => {
      try {
        await store.findOne(id); // throw not found
        await _schema.validate([id, data], store.findMany);
        const ret = await db.put(encode(id), data);
        return ret;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    findMany: findMany(db)<T>(keyEncoder(partitionName)),
    findOne: findOne(db)<T>(keyEncoder(partitionName)),
    /** */
    remove: (id: string) => db.del(encode(id)),
    /** */
    clear: clear(db)(keyEncoder(partitionName)),
  };

  return store;
};
export type CreateStore = typeof createStore;
export default createStore;
