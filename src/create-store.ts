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

  const pushRecord: Reducer<Record, Record[]> = (prev, next) => {
    prev.push(next);
    return prev;
  };
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
  /** internal? */
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
  /**
   *
   * @param args id or jsonquery
   */
  const findOne = async (
    args: string | Query<Record> | ((x: Record) => boolean),
  ) => {
    try {
      switch (typeof args) {
        case "string":
          // ... text query
          throw new NotImplementedError(
            `@args "${args}" of type ${typeof args} is Not Implemented`,
          );
        case "function":
          // Its a filter
          const filter = (prev: Record[], next: Record) => {
            if (args(next)) {
              prev.push(next);
              return prev;
            }
            return prev;
          };
          const first = <X>(values: X[]): X => values[0];
          return toPromiseOf(
            filter,
            [] as Record[],
          )(level.createValueStream()).then(first);
        case "object": {
          //it's a jsonquery
          const first = <X>(values: X[]): X => values[0];
          return toPromiseOf(
            pushRecord,
            [],
          )(level.createValueStream({}).pipe(jsonquery(args))).then(first);
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
  const findMany = (
    args: "*" | string | Query<Record> | ((x: Record) => boolean),
  ): Promise<Record[]> => {
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
   * @param args id or "*" or jsonquery
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
  // TODO: add with prototype instead of cheap clone ?
  // TODO: extra object level.repo?
  // None of the above ?
  const ret = merge(level, store);
  return ret;
}
