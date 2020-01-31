import jsonquery, { Query } from "jsonquery";
import { LevelUp } from "levelup";
import {
  Add,
  Delete,
  Exists,
  FindMany,
  FindOne,
  StoreRecord,
  Update,
} from "./types";
import {
  isNotFoundError,
  toPromise,
  NotImplementedError,
  KeyError,
  isValidID
} from "./internal";
/**
 *
 * @param level sublevel
 * @param schemapOrList
 */
const createStore = <T>(level: LevelUp, primaryKey: keyof StoreRecord<T>) => {
  //const { primaryKey, validate } = schema<T>(schemapOrList);
  /**
   *
   * @param args id or jsonquery
   */
  const exists: Exists<StoreRecord<T>> = async args => {
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
  const findOne: FindOne<T> = async (args): Promise<T> => {
    if (typeof args === "string") {
      try {
        const value = await level.get(args); //throws ?
        return { ...value, id: args };
      } catch (error) {
        return Promise.reject(error);
      }
    }
    if (typeof args === "object")
      return toPromise<StoreRecord<T>>(
        level.createValueStream({ limit: 1 }).pipe(jsonquery(args)),
      ).then(values => values[0]);
    return Promise.reject(
      new NotImplementedError(
        `@args "${args}" of type ${typeof args} is Not Implemented`,
      ),
    );
  };
  /**
   *
   * @param data
   * @param {boolean} force force update 'ignore if exist', as in Upsert
   */
  const add: Add<T> = async (data: StoreRecord<T>) => {
    try {
      if (!data) throw new Error("StoreRecord required");
      const id = data[primaryKey];
      if (!isValidID(id)) throw KeyError.invalidOrMissigID(primaryKey, id);
      if (await exists(id)) throw KeyError.idNotFound(primaryKey, id);
      const ret = await level.put(id, {
        ...data,
        [primaryKey]: id,
      });
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const update: Update<T> = async (data: Partial<StoreRecord<T>>) => {
    try {
      if (!data) throw new Error("@param data required");
      const id = data[primaryKey];
      if (!isValidID(id)) throw KeyError.invalidOrMissigID(primaryKey, id);
      const prev = await findOne(id); // throws not found
      // const value = await validate({ ...prev, ...data, [primaryKey]: id }, findMany); // throws
      const ret = await level.put(id, {
        ...prev,
        ...data,
        [primaryKey]: id,
      }); //key exception inscope
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const findMany: FindMany<T> = (query?: Query<StoreRecord<T>>) => {
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
  const remove: Delete<T> = async args => {
    if (typeof args === "string" && args === "*") {
      // delete all keys
      const keys = await toPromise<string>(level.createKeyStream());
      await level.clear(); //is it faster to use del?
      return keys.length;
    }
    if (typeof args === "string") {
      // its an id
      if (!(await exists(args))) {
        return Promise.reject(KeyError.idNotFound(primaryKey, args));
      }
      await level.del(args);
      return Promise.resolve(1);
    }
    if (typeof args === "object") {
      // delete some criteria based
      const values = await toPromise<StoreRecord<T>>(
        // needs values to process querie
        level.createValueStream().pipe(jsonquery(args)),
      );
      return Promise.all(values.map(x => level.del(x[primaryKey]))).then(
        () => values.length,
      );
    }
    return Promise.reject(
      new NotImplementedError(
        `@args "${args}" of type ${typeof args} is Not Implemented`,
      ),
    );
  };
  const store = {
    add,
    exists,
    findMany,
    findOne,
    remove,
    update,
  };
  return store;
};
export default createStore;
