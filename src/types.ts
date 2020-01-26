/** @description Tuple, [0]=id, [1]=value */
export type StoreRecord<T> = [string, T];

export interface Store<T> {
  idExists(id: string): Promise<boolean>;
  add(id: string, data: T): Promise<any>;
  update(id: string, data: Partial<T>): Promise<any>;
  findOne(id: string): Promise<T>;
  findMany(): Promise<StoreRecord<T>[]>;
  remove(id: string): Promise<any>;
  clear(): Promise<any>;
}

export type Serializer = {
  serialize: (a: any) => string;
  deserialize: (value: string | Buffer) => any;
};

export type KeyEncoder = {
  encode(s: string): string;
  decode(s: string): string;
  isMatch: (s: string | Buffer) => boolean;
};

export interface LevelLike {
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
  close(): any;
}

export type Schema<T> = {
  key: keyof T;
  notNull?: boolean | undefined;
  unique?: boolean | undefined;
  default?: any | undefined;
  /**
   * whatever returns typeof
   */
  type?: string | string[];
};
