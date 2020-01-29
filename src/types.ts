import jsonquery = require("jsonquery");

export type StoreRecord<T> = T & { $id?: string | undefined } & {
    [key in keyof T]: T[key];
  };

export interface Store<T> {
  // exists query?
  idExists(id: T[keyof T] & string): Promise<boolean>;
  // Set? upsert ?
  add(record: StoreRecord<T>): Promise<void>;
  update(data: Partial<StoreRecord<T>>): Promise<void>;
  // alow query ?
  findOne(id: T[keyof T] & string): Promise<StoreRecord<T>>;
  findMany(
    query?: jsonquery.Query<T & { $key: string }>,
  ): Promise<StoreRecord<T>[]>;
  // merge: remove clear as One ?
  remove(id: T[keyof T] & string): Promise<any>;
  clear(): Promise<any>;
}

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
