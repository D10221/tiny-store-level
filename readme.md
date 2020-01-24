# Tiny-Store level

Leveldb backed implementaion of `Store<T>`  
Where `Store<T>` is a simple repo/access interface

```typescript
interface Store<T> {
  add(id: string, data: T): Promise<any>;
  update(id: string, data: Partial<T>): Promise<any>;
  findOne(id: string): Promise<T>;
  findMany(): Promise<StoreRecord<T>[]>;
  remove(id: string): Promise<any>;
  clear(): Promise<any>;
}
```

```typescript
/** @description Tuple, [0]=id, [1]=value */
export type StoreRecord<T> = [string, T];
```

Each store is a db/key partition;

```javascript
import createStore = {  MemDb, LevelDB } from "@d10221/tiny-store-level"
```

```javascript
const { default: createStore, MemDb } = require("@d10221/tiny-store-level");
```

```javascript
function newid() {
  return require("crypto")
    .randomBytes(10)
    .toString("hex");
}

/**
 * Mapping result to something
 * @param {[string, {}][]} values
 * @returns {{id: string }[]}
 */
function mapIDs(values) {
  return values.map(([id, value]) => ({ id, ...value }));
}

describe("Tiny Store Level", () => {
  it("works", async () => {
    const db = await MemDb();
    const stuff = await createStore(db, "stuff");
    const id = newid();
    await stuff.add(id, { hello: "world" });
    const x = await stuff.findOne(id);
    expect(x).toEqual({ hello: "world" });

    const many = await stuff
      .findMany()
      // map Results
      .then(mapIDs);

    expect(
      many.find(x => x.id === id), // filter, find ...etc
    ).toEqual({ hello: "world", id });

    await db.close(); // 13ms
  });
});
```
