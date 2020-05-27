import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";

import { AbstractOptions, AbstractGetOptions } from "abstract-leveldown";

import {
  getType,
  typePrefix,
  NotImplementedError,
  isValidID,
  Reducer,
  isFunction,
  isNotFoundError,
  toPromiseOf,
  isNullOrUndefined,
  KeyError,
  subType,
} from "./internal";

import {
  IDTest,
  Store,
  Pk,
  RecordOf,
  Exists,
  Add,
  Update,
  Find,
} from "./types";

/** */
export default function createStore<T>(
  level: LevelUp,
  pkey: keyof T & string,
  options?: { idtest: IDTest<T> },
): Store<T> {
  const type = getType(level);
  if (typeof type === "string" && type.startsWith(typePrefix)) {
    throw new NotImplementedError("Recursive store!");
  }
  type PK = Pk<T>;
  type Record = RecordOf<T>;
  // **
  const idtest = options && options.idtest ? options.idtest : isValidID;

  const pushRecord: Reducer<Record, Record[]> = (prev, next) => {
    prev.push(next);
    return prev;
  };
  const get = level.get.bind(level);
  type ErrorValueCallback = (
    err: Error | undefined,
    value: Record | null,
  ) => void;
  const _get: ((key: string, callback: ErrorValueCallback) => void) &
    ((
      key: string,
      options: AbstractGetOptions,
      callback: ErrorValueCallback,
    ) => void) &
    ((
      key: string,
      options?: AbstractGetOptions,
    ) => Promise<Record | null>) = async (...args: any[]) => {
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
  };
  /**
   *
   */
  const exists: Exists<T> = async args => {
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
  const add: Add<T> = async record => {
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
  const update: Update<T> = async record => {
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
  /**
   *
   */
  const find: Find<T> = args => {
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
  type ErrorCallback = (err: Error | undefined) => any;
  //original func
  const put = level.put.bind(level);
  // TODO: types
  const _put: ((key: string, value: Record, callback: ErrorCallback) => void) &
    ((
      key: string,
      value: Record,
      options: AbstractOptions,
      callback: ErrorCallback,
    ) => void) &
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
          return error;
        };
        if (!idtest(key as any)) {
          return reject(KeyError.invalidOrMissigID(pkey, key));
        }
        if (typeof value !== "object") {
          return reject(new Error("value must be a record:{}"));
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
      default:
        throw new NotImplementedError(
          `put args "${args}" of type ${typeof key} is not Implemented`,
        );
    }
  };

  const store = {
    add,
    exists,
    find,
    remove,
    update,
    // .. level
    get: _get,
    put: _put,
    set: setRecord,
    type: subType(getType(level), pkey),
  };
  // keeps typescript happy, or need to import all level types and re-export them
  const merge = <A, B>(a: A, b: B): A & B => Object.assign(a, b);
  return merge(level, store);
}
