import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";
import {
  isNotFoundError,
  toPromise,
  NotImplementedError,
  isNullOrUndefined,
  isValidID,
  KeyError,
} from "./internal";
// keeps typescript happy, or need to import all level types and re-export them
const merge = <A, B>(a: A, b: B): A & B => Object.assign(a, b);
/**
 *
 */
export default function createStore<T>(
  options:
    | (keyof T & string)
    | {
        pkey: keyof T & string;
        idtest?: (x: T[keyof T] | undefined) => boolean;
      },
  level: LevelUp,
) {
  const { pkey, idtest } =
    typeof options === "object"
      ? {
          idtest: isValidID,
          ...options,
        }
      : {
          pkey: options,
          idtest: isValidID,
        };
  type PK = keyof T & string;
  type Record = { [key in keyof T]: T[key] };
  /**
   *
   * @param args id or jsonquery
   */
  const exists = async (args: T[PK] | Query<Record>) => {
    if (typeof args === "string") {
      try {
        await level.get(args);
        return true;
      } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error;
      }
    }
    if (typeof args === "object")
      return toPromise(
        level
          .createReadStream({
            values: true,
            keys: false,
            limit: 1,
          })
          .pipe(jsonquery(args)),
      ).then(x => Boolean(x.length));
    return Promise.reject(
      new NotImplementedError(
        `@args "${args}" of type ${typeof args} is Not Implemented`,
      ),
    );
  };
  /**
   *
   * @param args id or jsonquery
   */
  const findOne = async (args: T[PK] | Query<Record>) => {
    try {
      switch (typeof args) {
        case "string":
          return level.get(args); //throws ?
        case "object": {
          //it's aquery
          return toPromise<Record>(
            level.createValueStream({ limit: 1 }).pipe(jsonquery(args)),
          ).then(values => values[0]);
        }
        default:
          return Promise.reject(
            new NotImplementedError(
              `@args "${args}" of type ${typeof args} is Not Implemented`,
            ),
          );
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };
  /** internal */
  const putRecord = (record: Record) =>
    level.put(record[pkey], {
      ...record,
      [pkey]: record[pkey],
    });
  async function setRecord(record: Record) {
    try {
      if (isNullOrUndefined(record))
        throw new Error("@arg record cannot be null|undefined");
      const id = record[pkey];
      if (!idtest(id)) throw KeyError.invalidOrMissigID(pkey, id);
      return putRecord(record);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  const add = async (record: Record) => {
    try {
      if (isNullOrUndefined(record))
        throw new Error("@arg record cannot be null|undefined");
      const id = record[pkey];
      if (!idtest(id)) throw KeyError.invalidOrMissigID(pkey, id);
      if (await exists(id)) return Promise.reject(KeyError.idExists(pkey, id));
      return putRecord(record);
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const update = async (record: Partial<Record>): Promise<void> => {
    try {
      if (isNullOrUndefined(record))
        throw new Error("@arg record cannot be null|undefined");
      const id = record[pkey];
      if (!idtest(id)) throw KeyError.invalidOrMissigID(pkey, id);
      const prev = await level.get(id);
      return putRecord({ ...prev, ...record });
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const findMany = (query?: Query<Record>): Promise<Record[]> => {
    if (query) {
      return toPromise(level.createValueStream().pipe(jsonquery(query)));
    } else {
      return toPromise(level.createValueStream());
    }
  };
  /**
   *
   * @param args id or "*" or jsonquery
   */
  const remove = async (args: "*" | T[PK] | Query<Record>) => {
    if (typeof args === "string" && args === "*") {
      // delete all keys
      const keys = await toPromise<string>(level.createKeyStream());
      await level.clear(); //is it faster to use del?
      return keys.length;
    } else if (typeof args === "string") {
      // its an id
      if (!(await exists(args))) {
        return Promise.reject(KeyError.idNotFound(pkey, args));
      }
      await level.del(args);
      return Promise.resolve(1);
    } else if (typeof args === "object") {
      // delete some criteria based
      const values = await toPromise<Record>(
        // needs values to process querie
        level.createValueStream().pipe(jsonquery(args)),
      );
      return Promise.all(values.map(x => level.del(x[pkey]))).then(
        () => values.length,
      );
    } else
      return Promise.reject(
        new NotImplementedError(
          `@args "${args}" of type ${typeof args} is Not Implemented`,
        ),
      );
  };
  //Attach to instance
  const store = {
    add,
    exists,
    findMany,
    findOne,
    putRecord,
    remove,
    setRecord,
    update,
  };
  const ret = merge(level, store);
  return ret;
}
