import { Query } from "jsonquery";
import { LevelUp } from "levelup";
import { AbstractOptions } from "abstract-leveldown";
export type RecordOf<T> = {
  [key in keyof T]: T[key];
};
export type Exists<T> = (
  args: T[Pk<T>] | Query<RecordOf<T>>,
) => Promise<boolean>;
export type Pk<T> = keyof T & string;
export type Add<T> = (record: RecordOf<T>) => Promise<void>;
export type Update<T> = (record: Partial<RecordOf<T>>) => Promise<void>;
type FindArgs<T> =
  | "*"
  | string
  | Query<RecordOf<T>>
  | ((x: RecordOf<T>) => boolean);
export type Find<T> = (args: FindArgs<T>) => Promise<RecordOf<T>[]>;
export type Remove<T> = (
  args: "*" | T[Pk<T>] | Query<RecordOf<T>> | ((x: RecordOf<T>) => boolean),
) => Promise<any>;
export type Set<T> = (record: RecordOf<T>) => Promise<void>;
export type ErrorCallback = (err: Error | undefined) => void;
export type IDTest<T> = (x: T[keyof T] | undefined) => boolean;
export type Put<T> = ((
  key: string,
  value: any,
  callback: ErrorCallback,
) => void) &
  ((
    key: string,
    value: any,
    options: AbstractOptions,
    callback: ErrorCallback,
  ) => void) &
  ((key: string, value: any, options?: AbstractOptions) => Promise<void>) &
  ((record: RecordOf<T>) => Promise<void>);
export type Store<T> = LevelUp & {
  add: Add<T>;
  update: Update<T>;
  remove: Remove<T>;
  exists: Exists<T>;
  find: Find<T>;
  set: Set<T>;
  put: Put<T>;
  type: any;
};
