import { keyEncoder } from "./key-encoder";
import schema, { Schema } from "./schema";
import { StoreRecord, Store } from "./types";
/** */
function isNotFoundError(error: Error) {
  return error instanceof (Error) && error.name === "NotFoundError";
}
/** */
const catchNotFound = (returns: any = null) => (error: Error) => {
  return isNotFoundError(error)
    ? returns
    : Promise.reject(error);
};

interface LevelLike {
  createReadStream(o?: {
    gt?: any;
    lt?: any;
    /** @default true */
    keys?: boolean;
    /** @default true */
    values?: boolean;
    /** @default -1 */
    limit?: number;
    reverse?: boolean;
  }): NodeJS.ReadableStream;
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<any>;
  del(key: string): Promise<any>;
}

export class KeyError extends Error {
  constructor(message: string) {
    super(message);
  }
}
export const cache = () => {

}
/**
 *
 */
export default async <T extends { [key: string]: any } = {}>(
  db: LevelLike,
  partitionName: string,
  schemas: Schema<T>[] = []
): Promise<Store<T>> => {

  const { encode, decode, isMatch } = keyEncoder(partitionName);
  const getKeys = () =>
    new Promise<string[]>((resolve, reject) => {
      try {
        const stream = db.createReadStream({ values: false });
        let result: string[] = [];
        stream.on("data", key => {
          if (isMatch(key)) {
            result.push(decode(key));
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

  const findOne = (id: string): Promise<T> =>
    db.get(encode(id)).then((value: any) => value);

  const findMany = () =>
    new Promise<StoreRecord<T>[]>((resolve, reject) => {
      try {
        const stream = db.createReadStream();
        let result: StoreRecord<T>[] = [];
        stream.on("data", ({ key, value }) => {
          if (isMatch(key)) {
            result.push([decode(key), value]);
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

  // todo:is this faster than saving indexes ?
  const uniqueIndex = (ignore?: (keyof T)[]) =>
    Promise.all(
      schemas
        .filter(schema => schema.unique && (!ignore || ignore.indexOf(schema.key) === -1))
        .map(({ key }) =>
          findMany()
            .then(x => x.map(([_id, value]) => value[key]))
            .then(values => ({ key, values })),
        ),
    );

  // todo: is this faster than reading from db ?
  let indexes = await uniqueIndex();

  // todo: is this faster than reading from db ?
  const addToIndex = (data: T) => {
    for (const u of schemas.filter(schema => schema.unique)) {
      const x = indexes.find(x => x.key === u.key);
      if (x) x.values.push(data[x.key]);
    }
    return <X>(x: X): X => x;
  };

  const reindex = () => {
    return async <X>(x: X): Promise<X> => {
      indexes = await uniqueIndex();
      return x;
    };
  };

  let primaryKeys = await getKeys();

  const addPrimaryKey = (id: string) => <X>(x: X): X => {
    primaryKeys.push(id);
    return x;
  };

  const removePrimaryKey = (id: string) => <X>(x: X): X => {
    primaryKeys = primaryKeys.filter(k => k !== id);
    return x;
  };

  const clearPrimaryKeys = () => <X>(x: X): X => {
    primaryKeys = [];
    return x;
  };

  /** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
  const isValidPrimaryKey = (x: any) => {
    return typeof x === "string" && /^[a-zA-Z0-9]*$/.test(x);
  }

  const _schema = schema(schemas, partitionName);

  return {
    /** */
    add: async (id: string, data: T) => {
      // Unique PRI-KEY
      if (primaryKeys.indexOf(id) !== -1) return Promise.reject(new KeyError(`Duplicated key: ${id}`));
      if (!isValidPrimaryKey(id)) return Promise.reject(new KeyError(`Invalid key: ${id}`));
      try {
        // Validate Schema: Warning: adds default values
        data = _schema.validate(data, indexes);
      } catch (error) {
        return Promise.reject(error);
      }
      //
      return db
        .put(encode(id), data)
        .then(addToIndex(data))
        .then(addPrimaryKey(id));
    },
    /** */
    update: async (id: string, data: Partial<T>) => {
      try {
        const found = await findOne(id).catch(catchNotFound(null));
        if (!found) return Promise.reject(new Error(`Not Found key: ${id}`));
        data = _schema.validate(
          data as T, // hack:
          indexes,
          /* ignore*/ found,
        );
      } catch (error) {
        return Promise.reject(error);
      }
      return (
        db
          .put(encode(id), data)
          // problem: uniques values are append only ?
          .then(reindex())
      );
    },
    findMany,
    findOne: (id: string) => findOne(id).catch(e =>
      isNotFoundError(e)
        ? Promise.reject(new KeyError(`Key '${id}' Not Found`))
        : Promise.reject(e)),
    /** */
    async remove(id: string): Promise<any> {
      await findOne(id); //throws
      return db.del(encode(id)).then(removePrimaryKey(id)).then(reindex());
    },
    /** */
    clear: () =>
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
      }).then(clearPrimaryKeys()).then(reindex()),
  };
};


