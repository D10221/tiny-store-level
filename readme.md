# Tiny-Store level

Leveldb backed implementaion of `Store<T>`  
Where `Store<T>` is a simple {}'s repo/access interface

TODO:

```
  // exists query?
  idExists(id: T[keyof T] & string): Promise<boolean>;
  // Set? upsert ?
  add(record: StoreRecord<T>): Promise<any>;
  update(data: Partial<StoreRecord<T>>): Promise<any>;
  // alow query ?
  findOne(id: T[keyof T] & string): Promise<T>;
  findMany(
    query?: jsonquery.Query<T & { $key: string }>,
  ): Promise<StoreRecord<T>[]>;
  // remove and clear as One ?
  remove(id: T[keyof T] & string): Promise<number??>;
  clear(): Promise<number??>;
```
