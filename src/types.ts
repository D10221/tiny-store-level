import jsonquery = require("jsonquery");

export type StoreRecord<T> = T & { $id?: string | undefined } & {
    [key in keyof T]: T[key];
  };

export interface Store<T> {
  idExists(id: T[keyof T] & string): Promise<boolean>;
  add(record: StoreRecord<T>): Promise<any>;
  update(data: Partial<StoreRecord<T>>): Promise<any>;
  findOne(id: T[keyof T] & string): Promise<T>;
  findMany(
    query?: jsonquery.Query<T & { $key: string }>,
  ): Promise<StoreRecord<T>[]>;
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
