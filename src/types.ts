import { Query } from "jsonquery";

export type StoreRecord<T> = T & { $id?: string | undefined } & {
  [key in keyof T]: T[key];
};

export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "date";

export type Schema<T> = {
  primaryKey?: boolean;
  key: keyof T & string;
  notNull?: boolean | undefined;
  unique?: boolean | undefined;
  default?: any | undefined;
  /**
   * whatever returns typeof
   * replace with valid(x)=> boolean?
   */
  type?: ValueType | ValueType[];
};
export type ID<T> = T[keyof T] & string;
export type Exists<T> = (idOrQuery: ID<T> | Query<StoreRecord<T>>) => Promise<boolean>;
export type Add<T> = (record: StoreRecord<T>, force?: boolean) => Promise<void>;
export type Update<T> = (data: Partial<StoreRecord<T>>) => Promise<void>;
export type FindOne<T> = (isOrquery?: ID<T> | Query<StoreRecord<T>>) => Promise<StoreRecord<T>>
export type FindMany<T> = (query?: Query<StoreRecord<T>>) => Promise<StoreRecord<T>[]>
export type Delete<T> = (idOrQuery: "*" | ID<T> | Query<StoreRecord<T>>) => Promise<number>;

export interface Store<T> {
  exists: Exists<T>;
  add: Add<T>;
  update: Update<T>;
  findOne: FindOne<T>;
  findMany: FindMany<T>;
  delete: Delete<T>;
}
