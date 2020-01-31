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
  Schema,
  Schemap,
} from "./types";
import { isNotFoundError, toPromise, NotImplementedError } from "./util";
import schema from "./schema";
import { isValidID, KeyError } from "./keys";
/**
 * 
 * @param level sublevel
 * @param schemapOrList 
 */
const createStore = <T>(
  level: LevelUp, 
  schemapOrList?: Schemap<StoreRecord<T>> | Schema<StoreRecord<T>>[],
) => {
  const { primaryKey, validate } = schema<T>(schemapOrList);
  const exists: Exists<StoreRecord<T>> = async queryOrId => {
    if (typeof queryOrId === "string") {
      try {
        await level.get(queryOrId);
        return true;
      } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error;
      }
    }
    return toPromise(
      level
        .createReadStream({
          values: true,
          keys: false,
          limit: 1,
        })
        .pipe(jsonquery(queryOrId)),
    ).then(x => Boolean(x.length));
  };

  const findOne: FindOne<T> = async (queryOrId): Promise<T> => {
    if (typeof queryOrId === "string") {
      try {
        const value = await level.get(queryOrId); //throws ?
        return { ...value, id: queryOrId };
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return toPromise<StoreRecord<T>>(
      level.createValueStream({ limit: 1 }).pipe(jsonquery(queryOrId)),
    ).then(values => values[0]);
  };
  /**
   *
   * @param data
   * @param {boolean} force force update 'ignore if exist', as in Upsert
   */
  const add: Add<T> = async (data: StoreRecord<T>, force: boolean = false) => {
    try {
      if (!data) throw new Error("StoreRecord required");
      const id = data[primaryKey.key];

      if (!isValidID(id)) KeyError.invalidOrMissigID(primaryKey.key, id);
      if (!force && (await exists(id)))
        throw KeyError.idNotFound(primaryKey.key, id);

      // const value = await validate(applyDefaults(data), findMany);
      const ret = await level.put(id, {
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
      if (!isValidID(id)) throw KeyError.invalidOrMissigID(primaryKey.key, id);
      const prev = await findOne(id); // throws not found
      // const value = await validate({ ...prev, ...data, [primaryKey.key]: id }, findMany); // throws
      const ret = await level.put(id, {
        ...prev,
        ...data,
        [primaryKey.key]: id,
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
  const remove: Delete<T> = async idOrquery => {
    if (typeof idOrquery === "string" && idOrquery === "*") {
      // delete all keys
      const keys = await toPromise<string>(level.createKeyStream());
      await level.clear(); //is it faster to use del?
      return keys.length;
    }
    if (typeof idOrquery === "string") {
      // its an id
      if (!(await exists(idOrquery))) {
        return Promise.reject(KeyError.idNotFound(primaryKey.key, idOrquery));
      }
      await level.del(idOrquery);
      return Promise.resolve(1);
    }
    if (typeof idOrquery === "object") {
      // delete some criteria based
      const keys = await toPromise<string>(level.createKeyStream());
      return Promise.all(keys.map(key => level.del(key))).then(
        () => keys.length,
      );
    }
    return Promise.reject(
      new NotImplementedError(
        `@arg idOrquery=${idOrquery} of type ${typeof idOrquery} is Not Implemented`,
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
