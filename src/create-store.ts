import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";
import { Transform } from "stream";
import keyEncoder, { isValidID, KeyError } from "./keys";
import schema from "./schema";
import { Schema, StoreRecord, Delete, FindMany, Update, Add, FindOne, Exists, ID, } from "./types";
import { toPromise, reduce, Reduce } from "./streams";

class NotImplementedError extends Error {
  constructor(what: string) {
    super(`"${what}" Not Implemented`);
  }
}
function isNotFoundError(error: Error): error is Error {
  return error instanceof Error && error.name === "NotFoundError";
}
/**
 *
 */
export default function createStore<T extends { [key: string]: any } = {}>(
  db: LevelUp,
  partitionName: string,
  schemas: Schema<T>[] = [],
) {
  const { encodeKey, decodeKey, scopedStream } = keyEncoder(partitionName);
  const { primaryKey, applyDefaultValues, validate } = schema(
    schemas,
    partitionName,
  );
  const exists: Exists<T> = async (queryOrId) => {
    if (typeof queryOrId === "string") {
      try {
        await db.get(encodeKey(queryOrId));
        return true;
      } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error;
      }
    }
    throw new NotImplementedError("exists(query)");
  }
  const findOne: FindOne<T> = async (queryOrId): Promise<T> => {
    if (typeof queryOrId === "string") {
      try {
        const value = await db.get(encodeKey(queryOrId));
        return { ...value, [primaryKey.key]: queryOrId };
      } catch (error) {
        return Promise.reject(error);
      }
    }
    throw new NotImplementedError("FindOne(query)");
  }
  /**
   * 
   * @param data 
   * @param {boolean} force force update 'ignore if exist'
   */
  const add: Add<T> = async (data: StoreRecord<T>, force: boolean = false) => {
    try {
      if (!data) throw new Error("StoreRecord required");
      const id = data[primaryKey.key];

      if (!isValidID(id)) throw KeyError.invalidOrMissigID(primaryKey.key, id);

      if (!force && await exists(id)) throw KeyError.idExists(primaryKey.key, id);

      const value = applyDefaultValues(data);
      await validate(value, findMany);
      const ret = await db.put(encodeKey(id), value);
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const update: Update<T> = async (data: Partial<StoreRecord<T>>) => {
    try {
      if (!data) throw new Error("@param data required");

      const id = data[primaryKey.key];
      if (!isValidID(id)) throw KeyError.invalidOrMissigID(primaryKey.key, id);

      const prev = await findOne(id as any); // throw not found

      await validate({ [primaryKey.key]: id, ...data }, findMany); // throws

      const ret = await db.put(encodeKey(id), { ...prev, ...data }); //key exception inscope
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const transform = (convert: (kv: { key: string, value: any }) => any) => new Transform({
    objectMode: true,
    transform: function (kv, _encoding_, callback) {
      this.push(convert(kv));
      callback();
    },
  });

  const decodeKeyValue = (schema: Schema<T>) => (kv: { key: string, value: any }) => {
    const { key, value } = kv;
    return ({ ...value, [schema.key]: decodeKey(key) })
  }

  const findMany: FindMany<T> = (query?: Query<StoreRecord<T>>) => {
    if (query) {
      return toPromise(reduce as Reduce<StoreRecord<T>>, [])
        (scopedStream(db)
          .pipe(transform(decodeKeyValue(primaryKey)))
          .pipe(jsonquery(query)))
    }
    return toPromise(reduce as Reduce<StoreRecord<T>>, [])(scopedStream(db).pipe(transform(decodeKeyValue(primaryKey))))
  }

  const $delete: Delete<T> = async (idOrquery) => {
    if (typeof idOrquery === "string" && idOrquery === "*") {
      // delete all keys
      const stream = scopedStream(db);
      return new Promise<number>((resolve, reject) => {
        try {
          let result = 0;
          stream.on("data", async ({ key }) => {
            await db.del(key);
            result = result + 1;
          });
          stream.on("error", error => {
            reject(error);
          });
          // stream.on("close", () => {});
          stream.on("end", () => {
            resolve(result);
          });
        }
        catch (error) {
          reject(error);
        }
      });
    }
    if (typeof idOrquery === "string") {
      // its an $ID
      if (!(await exists(idOrquery))) {
        return Promise.reject(KeyError.idNotFound(idOrquery))
      }
      const key = encodeKey(idOrquery);
      await db.get(key); //throws
      await db.del(key);
      return Promise.resolve(1);
    }
    if (typeof idOrquery === "object") {
      // delete some criteria based             
      const deletes = async (result: number, keyValue: { key: string, value: any }) => {
        const { key, value } = keyValue;
        const encodedKey = encodeKey(value[key]);
        await db.del(encodedKey);
        return result + 1;
      };
      return toPromise(deletes, 0)(scopedStream(db)
        .pipe(transform(decodeKeyValue(primaryKey)))
        .pipe(jsonquery(idOrquery)));
    }
    return Promise.reject(new Error("Not Implemented"));
  }
  // ...
  const store = {
    exists,
    add,
    update,
    findMany,
    findOne,
    delete: $delete
  };
  return store;
}
