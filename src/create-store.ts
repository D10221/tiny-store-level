import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";
import {
  isNotFoundError,
  NotImplementedError,
  isNullOrUndefined,
  isValidID,
  KeyError,
  toPromiseOf,
  Reducer,
  isFunction,
} from "./internal";
import { AbstractOptions, AbstractGetOptions } from "abstract-leveldown";
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

  const pushRecord: Reducer<Record, Record[]> = (prev, next) => {
    prev.push(next);
    return prev;
  };
  const get = level.get.bind(level);
  type ErrorValueCallback = (err: Error | undefined, value: Record | null) => void
  const _get: (
    ((key: string, callback: ErrorValueCallback) => void) &
    ((key: string, options: AbstractGetOptions, callback: ErrorValueCallback) => void) &
    ((key: string, options?: AbstractGetOptions) => Promise<Record | null>)
  ) = async (...args: any[]) => {
    const [key, ...options] = args;
    const callback = options.find(isFunction);
    if (callback) {
      return get(key, options, (err, val) => {
        if (err) {
          if (isNotFoundError(err)) {
            callback(undefined, null);
          } else {
            callback(err, null);
          }
        } else {
          callback(err, val);
        }
      });
    } else {
      try {
        const x = await get(key, ...options);
        return x;
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
      }
    }
  }
  /**
   *   
   */
  const exists = async (args: T[PK] | Query<Record>) => {
    if (typeof args === "string") {
      try {
        await get(args);
        return true;
      } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error;
      }
    }
    if (typeof args === "object")
      return toPromiseOf(
        pushRecord,
        [] as Record[],
      )(level.createValueStream().pipe(jsonquery(args))).then(x =>
        Boolean(x.length),
      );
    return Promise.reject(
      new NotImplementedError(
        `@args "${args}" of type ${typeof args} is Not Implemented`,
      ),
    );
  };
  /**
   * internal   
   */
  const putRecord = (record: Record) =>
    level.put(record[pkey], {
      ...record,
      [pkey]: record[pkey],
    });
  /**
   * UPSERT   
   */
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
  /**
   * 
   */
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
  /**
   * 
   */
  const update = async (record: Partial<Record>): Promise<void> => {
    try {
      if (isNullOrUndefined(record))
        throw new Error("@arg record cannot be null|undefined");
      const id = record[pkey];
      if (!idtest(id)) throw KeyError.invalidOrMissigID(pkey, id);
      const prev = await get(id);
      return putRecord({ ...prev, ...record });
    } catch (error) {
      return Promise.reject(error);
    }
  };
  type FindArgs = "*" | string | Query<Record> | ((x: Record) => boolean);
  /**
   *    
   */
  const find = (args: FindArgs): Promise<Record[]> => {
    switch (typeof args) {
      case "string": {
        switch (args) {
          case "*":
            return toPromiseOf(
              pushRecord,
              [] as Record[],
            )(level.createValueStream());
          default:
            throw new NotImplementedError(
              `@args "${args}" of type ${typeof args} is Not Implemented`,
            );
        }
      }
      case "function": {
        const filter = (prev: Record[], next: Record) => {
          if (args(next)) {
            prev.push(next);
            return prev;
          }
          return prev;
        };
        return toPromiseOf(filter, [] as Record[])(level.createValueStream());
      }
      case "object": {
        return toPromiseOf(
          pushRecord,
          [] as Record[],
        )(level.createValueStream().pipe(jsonquery(args)));
      }
      default:
        throw new NotImplementedError(
          `@args "${args}" of type ${typeof args} is Not Implemented`,
        );
    }
  };
  /**
   *   
   */
  const remove = async (
    args: "*" | T[PK] | Query<Record> | ((x: Record) => boolean),
  ) => {
    try {
      switch (typeof args) {
        case "string": {
          switch (args) {
            case "*": {
              // delete all keys
              const keys = await toPromiseOf((prev: string[], next: string) => {
                prev.push(next);
                return prev;
              }, [])(level.createKeyStream());
              await level.clear(); //is it faster to use del?
              return keys.length;
            }
            default: {
              // its an id
              if (!(await exists(args))) {
                throw KeyError.idNotFound(pkey, args);
              }
              return level.del(args).then(() => 1);
            }
          }
        }
        case "function": {
          const filter = (prev: Record[], next: Record) => {
            if ((args as any)(next)) {
              // Problems with TK & string ? , TypeScript says it might not be callable
              prev.push(next);
              return prev;
            }
            return prev;
          };
          const values = await toPromiseOf(
            filter,
            [],
          )(level.createValueStream());
          for (const x of values) {
            await level.del(x[pkey]);
          }
          return values.length;
        }
        case "object": {
          // delete some" criteria based
          const values = await toPromiseOf(
            pushRecord,
            [],
          )(
            // needs values to process querie
            level.createValueStream().pipe(jsonquery(args)),
          );
          for (const x of values) {
            await level.del(x[pkey]);
          }
          return values.length;
        }
        default: {
          throw new NotImplementedError(
            `@args "${args}" of type ${typeof args} is Not Implemented`,
          );
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };
  type ErrorCallback = (err: Error | undefined) => any
  //original func
  const put = level.put.bind(level);
  // TODO: types
  const _put:
    ((key: string, value: Record, callback: ErrorCallback) => void) &
    ((key: string, value: Record, options: AbstractOptions, callback: ErrorCallback) => void) &
    ((key: string, value: Record, options?: AbstractOptions) => Promise<void>) &
    ((record: Record) => Promise<void>) = (...args: any) => {
      const [key, value, ...options] = args;
      switch (typeof key) {
        case "string": {
          const reject = (error: any) => {
            if (options) {
              const callback = options.find(isFunction);
              if (typeof callback === "function") {
                callback(error);
              } else {
                throw error;
              }
            }
            return error
          }
          if (!idtest(key as any)) {
            return reject(KeyError.invalidOrMissigID(pkey, key));
          }
          if (typeof value !== "object") {
            return reject(new Error("value must be a record:{}"))
          }
          value[pkey] = key;
          return put(key, value, ...options);
        }
        case "object": {
          try {
            // isRecord
            const id = key[pkey];
            if (!idtest(id)) {
              throw KeyError.invalidOrMissigID(pkey, id);
            }
            return putRecord(key);
          } catch (error) {
            return Promise.reject(error);
          }
        }
        default: throw new NotImplementedError(`put args "${args}" of type ${typeof key} is not Implemented`);
      }
    };
  const store = {
    add,
    exists,
    find,
    get: _get,
    put: _put,
    remove,
    set: setRecord,
    update,
  };
  // keeps typescript happy, or need to import all level types and re-export them
  const merge = <A, B>(a: A, b: B): A & B => Object.assign(a, b);
  return merge(level, store);
}
