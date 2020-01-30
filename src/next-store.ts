import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";
import sublevelDown from "subleveldown";
import { Add, Delete, Exists, FindMany, FindOne, StoreRecord, Update, Schema, Schemap } from "./types";
export type PromiseReducer<T, R> = (result: R, data: T) => Promise<R>;

function concat<T>(
    condition: (x: T) => boolean,
): PromiseReducer<T, T[]> {
    return (result, data) => {
        return Promise.resolve(condition(data) ? [...result, data] : result);
    };
}
function count<T>(
    action: (x: T) => void | Promise<void>,
): PromiseReducer<T, number> {
    return async (result, data) => {
        await action(data);
        return result + 1;
    };
}
const toPromise = <Data, Result>(
    reduce: PromiseReducer<Data, Result>,
    acc: Result,
) => (stream: NodeJS.ReadableStream) =>
        new Promise<Result>((resolve, reject) => {
            try {
                let result = acc;
                stream.on("data", async data => {
                    result = await reduce(result, data);
                });
                stream.on("error", error => {
                    reject(error);
                });
                // stream.on("close", () => {});
                stream.on("end", () => {
                    resolve(result);
                });
            } catch (error) {
                reject(error);
            }
        });
const DEFAULT_SCHEMA: Schema<StoreRecord<any>> = {
    key: "id",
    primaryKey: true,
    notNull: true,
    type: "string",
};

function isNotFoundError(error: Error): error is Error {
    return error instanceof Error && error.name === "NotFoundError";
}

export class NotImplementedError extends Error {
    constructor(what: string) {
        super(`"${what}" Not Implemented`);
    }
}
const memoize = <P, R>(f: (arg: P) => R) => {
    let cache: any[] = [undefined, undefined];
    return (arg: P): R => {
        if (arg === cache[0]) return cache[1];
        cache = [arg, f(arg)];
        return cache[1];
    };
};
const keys = memoize(Object.keys);

const fromMap = <T>(schemas?: Schemap<StoreRecord<T>>) => {
    schemas =
        schemas ||
        ({ [DEFAULT_SCHEMA.key]: DEFAULT_SCHEMA } as Schemap<StoreRecord<T>>);
    const schemaKeys: (keyof StoreRecord<T>)[] = keys(schemas) as any;
    const schemaList = schemaKeys.map(k => schemas![k]);
    // default schema
    if (schemaList.filter(isKey).length < 1) {
        schemas = {
            ...schemas,
            [DEFAULT_SCHEMA.key]: DEFAULT_SCHEMA,
        };
    }
    return {
        schemas,
        schemaList,
        schemaKeys,
    };
};

const isKey = (x: Schema<StoreRecord<any>>) => Boolean(x.primaryKey);

const fromList = <T>(input: Schema<StoreRecord<T>>[]) => {
    const schemaList = input || [DEFAULT_SCHEMA];
    // default schema
    if (schemaList.filter(isKey).length < 1) {
        schemaList.push(DEFAULT_SCHEMA);
    }
    const schemaKeys = schemaList.map(x => x.key) as (keyof StoreRecord<T>)[];
    return {
        schemas: schemaKeys.reduce((out, key) => {
            out[key] = schemaList.find(x => x.key === key)!;
            return out;
        }, {} as Schemap<StoreRecord<T>>),
        schemaList,
        schemaKeys,
    };
};

const filter = memoize(<X>(xxx: X[]) => Array.prototype.filter.bind(xxx));

const nextStore = <T>(_db: LevelUp, name: string, schemapOrList?: Schemap<StoreRecord<T>> | Schema<StoreRecord<T>>[]) => {

    const { schemas, schemaList, schemaKeys } = Array.isArray(schemapOrList)
        ? fromList(schemapOrList)
        : fromMap(schemapOrList);

    const sublevel = sublevelDown(_db, name, { valueEncoding: 'json' });
    const primaryKeys = filter(schemaList)(isKey);
    const primaryKey: Schema<StoreRecord<T>> = primaryKeys[0];

    const exists: Exists<StoreRecord<T>> = async (queryOrId) => {
        if (typeof queryOrId === "string") {
            try {
                await sublevel.get(queryOrId);
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
                const value = await sublevel.get(queryOrId); //throws ?
                return { ...value, id: queryOrId };
            } catch (error) {
                return Promise.reject(error);
            }
        }
        throw new NotImplementedError("FindOne(query)");
    };
    /**
    *
    * @param data
    * @param {boolean} force force update 'ignore if exist'
    */
    const add: Add<T> = async (data: StoreRecord<T>, force: boolean = false) => {
        try {
            if (!data) throw new Error("StoreRecord required");
            const id = data[primaryKey.key];

            if (!id) throw Error(`Missing ${primaryKey.key}`);

            //if (!force && (await exists(id)))throw KeyError.idExists(primaryKey.key, id);

            //const value = await validate(applyDefaults(data), findMany);
            const ret = await sublevel.put(id, {
                ...data,
                [primaryKey.key]: id,
            });
            return ret;
        } catch (error) {
            return Promise.reject(error);
        }
    };
    const update: Update<T> = async (data: Partial<StoreRecord<T>>) => {
        try {
            if (!data) throw new Error("@param data required");
            const id = data[primaryKey.key];
            if (!id) throw new Error(`Missing ${primaryKey.key}`);
            const prev = await findOne(id); // throws not found
            // const value = await validate({ ...prev, ...data, [primaryKey.key]: id }, findMany); // throws
            const ret = await sublevel.put(id, { ...prev, ...data, [primaryKey.key]: id }); //key exception inscope
            return ret;
        } catch (error) {
            return Promise.reject(error);
        }
    };
    const findMany: FindMany<T> = (query?: Query<StoreRecord<T>>) => {
        const stream = sublevel.createReadStream();
        const reduce = concat<StoreRecord<T>>(Boolean);
        const _toPromise = toPromise(reduce, []);
        if (query) {
            return _toPromise(stream.pipe(jsonquery(query)));
        } else {
            return _toPromise(stream);
        }
    };
    const remove: Delete<T> = async idOrquery => {
        if (typeof idOrquery === "string" && idOrquery === "*") {
            // delete all keys
            const stream = sublevel.createReadStream();
            return new Promise<number>((resolve, reject) => {
                try {
                    let result = 0;
                    stream.on("data", async ({ key }) => {
                        await sublevel.del(key);
                        result = result + 1;
                    });
                    stream.on("error", error => {
                        reject(error);
                    });
                    // stream.on("close", () => {});
                    stream.on("end", () => {
                        resolve(result);
                    });
                } catch (error) {
                    reject(error);
                }
            });
        }
        if (typeof idOrquery === "string") {
            // its an id
            if (!(await exists(idOrquery))) {
                return Promise.reject(new Error(`${primaryKey.key} "${idOrquery}" Not found`));
            }
            await sublevel.del(idOrquery);
            return Promise.resolve(1);
        }
        if (typeof idOrquery === "object") {
            // delete some criteria based
            return toPromise(
                count<StoreRecord<T>>(async data => {
                    await sublevel.del(data[primaryKey.key]);
                }),
                0,
            )(
                sublevel.createReadStream()
                    .pipe(jsonquery(idOrquery)),
            );
        }
        return Promise.reject(new Error("Not Implemented"));
    };
    const store = {
        exists,
        add,
        update,
        findMany,
        findOne,
        remove,
    };
    return store;
}
export default nextStore;