import { randomBytes } from "crypto";
import { existsSync, unlinkSync } from "fs";
import path from "path";
import rimraf from "rimraf";
import levelStore, { JsonDb, LevelDB, MemDb } from "../src";
import { toDate } from "../src/dates";
import { SchemaError } from "../src/schema-error";
import { Store } from "../src/types";
import mapOut from "../src/map-out";
import { KeyError } from "../src/create-store";

interface Thing extends Object {
  name: string;
}

const jsonDbPath = path.resolve(process.cwd(), "json-test-store.json");

let memDB: any;
let memStore: Store<Thing>;

if (existsSync(jsonDbPath)) {
  unlinkSync(jsonDbPath);
}
let jsonDB: any = JsonDb(jsonDbPath);
let leveldb: any;
const leveldbpath = "./testdb";
beforeAll(() => {
  rimraf.sync(leveldbpath);
  leveldb = LevelDB(leveldbpath);
});
beforeEach(async () => {
  if (memDB) {
    await memDB.close();
    memDB = null;
  }
  memDB = MemDb()
  memStore = await levelStore<Thing>(memDB, "things");
});
it("finds many", async () => {
  expect(await memStore.findMany()).toMatchObject([]);
});
it("throws not found", async () => {
  expect(await memStore.findOne("a").catch(error => error)).toBeInstanceOf(KeyError)
});
it("adds new, etc ...", async () => {
  await memStore.clear();
  expect(await memStore.add("a", { name: "aaa" })).toBe(undefined);
  // ...
  expect(await memStore.clear()).toBe(1);
  expect(await memStore.add("a", { name: "aaa" })).toBe(undefined);
  expect(await memStore.findOne("a")).toMatchObject({ name: "aaa" });
  expect(await memStore.remove("a")).toBe(undefined);
  expect(await memStore.findOne("a").catch(e => e)).toBeInstanceOf(KeyError);
});
it("more stores", async () => {
  const store2 = await levelStore(memDB, "moreThings");
  expect(await memStore.add("a", { name: "aaa" })).toBe(undefined);
  expect(await store2.add("a", { name: "aaa" })).toBe(undefined);
  expect(await memStore.add("a1", { name: "aaa1" })).toBe(undefined);
  expect(await store2.add("a1", { name: "aaa1" })).toBe(undefined);
});

//
it("maps out", async () => {
  const bt = mapOut(memStore, x => ({ ...x[1], id: x[0] }));
  await bt.add("x", { name: "x" });
  const x = await bt.findOne("x");
  expect(x.id).toBe("x");
});
it("persisted/json-db", async () => {
  const store = (await levelStore(jsonDB, "moreThings2"));
  const value = { name: "aaa" };
  expect(await store.add("a", value)).toBe(undefined);
  // await jsonDB.close();  
  const dbFile = require(jsonDbPath);
  expect(dbFile["things/a"]).toBe(undefined);
  expect(dbFile["moreThings/a"]).toBe(undefined);
  expect(dbFile["moreThings2/a"]).toBe(JSON.stringify(value));
})
it("validates: 1000/jsons", async () => {
  // 1089ms with memdown
  // jest.setTimeout(60000);
  const s = await levelStore<Thing>(jsonDB, "things2", [
    { key: "name", notNull: true, unique: true },
  ]);
  // 10000 records with 40.202s with jsonDown
  for (let i = 0; i < 1000; i++) {
    await s.add(`indexed${i}`, { name: `x${i}` });
  }
  expect(await s.add("y", { name: null }).catch(err => err))
    .toBeInstanceOf(SchemaError);

  expect(
    await s.add("y1", { name: undefined }).catch(err => err),
  ).toBeInstanceOf(SchemaError);

  expect(await s.add("xxxx", { name: "x0" }).catch(error => error)).toBeInstanceOf(SchemaError);
});
it("10000's", async () => {
  // 1089ms with memdown
  // 1575ms with leveldown
  // 40s with jsondown
  // jest.setTimeout(60000);
  const store = await levelStore<Thing>(leveldb, "things3");
  console.time("add:1");
  await store.add("1", { name: "1" });
  console.timeEnd("add:1");
  console.time("add:x10000");
  for (let i = 0; i < 10000; i++) {
    await store.add(`indexed${i}`, { name: `x${i}` });
  }
  console.timeEnd("add:x10000");
  console.time("get:x9999");
  expect((await store.findOne("indexed9")).name).toBe("x9");
  console.timeEnd("get:x9999");
  console.time("find:x10000");
  expect((await store.findMany()).length).toBe(10001);
  console.timeEnd("find:x10000");
});
it("rejects dup id", async () => {
  const store = await levelStore<{}>(leveldb, "things3");
  const id = randomString();
  await store.add(id, {});
  const x = await (store.add(id, {}).catch(e => e));
  expect(x).toBeInstanceOf(KeyError);
})
it("rejects bad id", async () => {
  const store = await levelStore<{}>(leveldb, "things3");
  expect(await store.add("_%$#@", {}).catch(x => x)).toBeInstanceOf(KeyError);
})
it("Schema rejects not in schema", async () => {
  const store = await levelStore<Thing>(jsonDB, "things4", [
    { key: "name", notNull: true, unique: true },
  ]);
  const x = await store.add("a", { x: "aaa" } as any).catch(e => e);
  expect(x).toBeInstanceOf(SchemaError)
})
it("Schema rejects bad type", async () => {
  const store = await levelStore<Thing>(jsonDB, "things5", [
    { key: "name", notNull: true, unique: true, type: "string" },
  ]);
  const e = await store.add("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { name: 1 as any }).catch(e => e);
  expect(e)
    .toBeInstanceOf(SchemaError);
})
const randomString = () => randomBytes(16).toString("hex");
it("Schema rejects bad types", async () => {
  const store = await levelStore<Thing>(jsonDB, "things6", [
    { key: "name", notNull: true, unique: true, type: ["string", "number"] },
  ]);
  expect(await store.add(randomBytes(16).toString("hex"), { name: true as any }).catch(e => e))
    .toBeInstanceOf(SchemaError);
  await store.add(randomString(), { name: 1 as any });
  await store.add(randomString(), { name: "1" as any });
})
it("defaults values", async () => {
  const newName = randomString();
  const store = await levelStore<{ name: string, createdAt?: string | number | Date | undefined }>(jsonDB, "things7", [
    { key: "name", notNull: true, unique: true, type: "string", default: () => newName },
    { key: "createdAt", default: () => new Date() },
  ]);
  const id = randomString();
  await store.add(id, { name: null });
  const found = await store.findOne(id);
  expect(found.name).toBe(newName);
  expect(toDate(found.createdAt).getDate()).toBe(new Date().getDate());
})

it("updates same value", async () => {
  const store = await levelStore<{ name: string, createdAt?: string | number | Date | undefined }>(jsonDB, "things9", [
    { key: "name", notNull: true, unique: true, type: "string" },
    { key: "createdAt", default: () => new Date() },
  ]);
  {
    const newName = randomString();
    const id = randomString();
    await store.add(id, { name: newName });
    await store.update(id, { name: newName }); // same name
    expect((await store.findOne(id)).name).toBe(newName);
  }
})
it("updates other value", async () => {
  const store = await levelStore<{ name: string, createdAt?: string | number | Date | undefined }>(jsonDB, "things10", [
    { key: "name", notNull: true, unique: true, type: "string" },
    { key: "createdAt", default: () => new Date() },
  ]);
  {
    const aName = randomString();
    const id = randomString();
    await store.add(id, { name: aName });
    const newName = randomString();
    await store.update(id, { name: newName }); // same name
    expect((await store.findOne(id)).name).toBe(newName);
  }
})

it("updates not dup name", async () => {
  const store = await levelStore<{ name: string, createdAt?: string | number | Date | undefined }>(jsonDB, "things11", [
    { key: "name", notNull: true, unique: true, type: "string" },
    { key: "createdAt", default: () => new Date() },
  ]);
  {
    const name1 = randomString();
    const id1 = randomString();
    await store.add(id1, { name: name1 });
    const name2 = randomString();
    await store.add(randomString(), { name: name2 });
    expect((await store.update(id1, { name: name2 }).catch(e => e))).toBeInstanceOf(SchemaError);
  }
})

it("updates checking type", async () => {
  const store = await levelStore<{ name: string, createdAt?: string | number | Date | undefined }>(jsonDB, "things12", [
    { key: "name", notNull: true, unique: true, type: "string" }
  ]);
  const id = randomString();
  await store.add(id, { name: randomString() });
  expect(await store.update(id, { name: randomBytes(8) as any }).catch(e => e)).toBeInstanceOf(SchemaError);
})

it("deletes and clears indexes", async () => {
  const store = await levelStore<{ name: string }>(jsonDB, "things13", [
    { key: "name", notNull: true, unique: true, type: "string" }
  ]);
  const id = randomString();
  const aName = randomString();
  await store.add(id, { name: aName });
  await store.remove(id);
  expect(await store.findOne(id).catch(e => e)).toBeInstanceOf(KeyError);
  expect(await store.add(id, { name: aName })).toBe(undefined);
})