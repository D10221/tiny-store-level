import { Store, StoreRecord } from "./types";
/**
 * Transfor Store<T> into Store<T,R> where T Input Type And R  Output Type
 * why?
 * Mainly because of (id, data) => { id, ...data }
 * */
export default <T, R>(store: Store<T>, mapOut: (r: StoreRecord<T>) => R) => {
  const { add, clear, findMany, findOne, remove, update } = store;
  return {
    add,
    update,
    findMany: () => findMany().then(records => records.map(mapOut)),
    findOne: (id: string) => findOne(id).then(x => mapOut([id, x])),
    // same
    clear,
    remove,
  };
};
