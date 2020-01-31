import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";

const isNullOrUndefined = <T>(x: T | null | undefined): x is null | undefined =>
  x === null || x === undefined;
export function isNotFoundError(error: Error): error is Error {
  return error instanceof Error && error.name === "NotFoundError";
}
const toPromise = <X>(stream: NodeJS.ReadableStream) =>
  new Promise<X[]>((resolve, reject) => {
    try {
      let result: X[] = [];
      stream.on("data", chunk => {
        result.push(chunk);
      });
      stream.on("error", error => {
        reject(error);
      });
      stream.on("end", () => {
        resolve(result);
        stream.readable = false;
      });
    } catch (error) {
      reject(error);
    }
  });
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`"${what}" Not Implemented`);
  }
}
export class KeyError extends Error {
  constructor(message: string) {
    super(message);
  }
  static invalidOrMissingKey(key: any) {
    return new KeyError(`Invalid or missing key="${key}"`);
  }
  static invalidOrMissigID(key: any, id?: any) {
    return new KeyError(`Invalid or missing "${key}"="${id}"`);
  }
  static idExists(key: any, id?: any) {
    return new KeyError(`Key/ID exists "${key}=${id}"`);
  }
  static idNotFound(key: any, id?: any) {
    return new KeyError(`Key/ID Not Found"${key}=${id}" not found`);
  }
}
/** a long Value */
export const ID_MAX_VALUE = String.fromCharCode(0xdbff).repeat(64);
const ID_REGEX = /^[a-zA-Z0-9]+$/;
interface RegexLike {
  test(strng: string): boolean;
}
export function isValidID(x: any, regex: RegexLike = ID_REGEX): x is string {
  return typeof x === "string" && regex.test(x) && x < ID_MAX_VALUE;
}
interface Options<PK> {
  pkey: PK;
  idtest?: RegexLike;
}
/**
 *
 */
export function createStore<T>(
  options: (keyof T & string) | Options<keyof T & string>,
  level: LevelUp,
) {
  const { pkey, idtest } =
    typeof options === "object"
      ? {
          idtest: ID_REGEX,
          ...options,
        }
      : {
          pkey: options,
          idtest: ID_REGEX,
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
    if (typeof args === "string") {
      try {
        const value = await level.get(args); //throws ?
        return { ...value, id: args };
      } catch (error) {
        return Promise.reject(error);
      }
    }
    if (typeof args === "object")
      return toPromise<Record>(
        level.createValueStream({ limit: 1 }).pipe(jsonquery(args)),
      ).then(values => values[0]);
    return Promise.reject(
      new NotImplementedError(
        `@args "${args}" of type ${typeof args} is Not Implemented`,
      ),
    );
  };
  const put = (data: Record) =>
    level.put(data[pkey], {
      ...data,
      [pkey]: data[pkey],
    });
  async function set(data: Record, mode?: "insert" | "update") {
    try {
      if (isNullOrUndefined(data))
        throw new Error("@arg data cannot be null|undefined");
      const id = data[pkey];
      if (!isValidID(id, idtest)) throw KeyError.invalidOrMissigID(pkey, id);
      return put(data);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  const add = async (data: Record) => {
    try {
      if (isNullOrUndefined(data))
        throw new Error("@arg data cannot be null|undefined");
      const id = data[pkey];
      if (!isValidID(id, idtest)) throw KeyError.invalidOrMissigID(pkey, id);
      if (await exists(id)) return Promise.reject(KeyError.idExists(pkey, id));
      return put(data);
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const update = async (data: Partial<Record>): Promise<void> => {
    try {
      if (isNullOrUndefined(data))
        throw new Error("@arg data cannot be null|undefined");
      const id = data[pkey];
      if (!isValidID(id, idtest)) throw KeyError.invalidOrMissigID(pkey, id);
      const prev = await level.get(id);
      return put({ ...prev, ...data });
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
  return {
    add,
    exists,
    findMany,
    findOne,
    remove,
    set,
    update,
    put
  };
}
