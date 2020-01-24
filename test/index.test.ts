import { randomBytes } from "crypto";
import { existsSync, unlinkSync } from "fs";
import path from "path";
import rimraf from "rimraf";
import createStore, { LevelDB, MemDb } from "../src";
import { toDate } from "../src/dates";
import { SchemaError } from "../src/schema-error";
import { Store, LevelLike } from "../src/types";
import mapOut from "../src/map-out";
import { KeyError } from "../src/create-store";

interface Thing extends Object {
  name: string;
}

const jsonDbPath = path.resolve(process.cwd(), "json-test-store.json");


let memStore: Store<Thing>;

if (existsSync(jsonDbPath)) {
  unlinkSync(jsonDbPath);
}
let leveldb: any;
const leveldbpath = "./testdb";
beforeAll(() => {
  rimraf.sync(leveldbpath);
  leveldb = LevelDB(leveldbpath);
});

let memDB: LevelLike;
beforeEach(async () => {
  if (memDB) {
    await memDB.close();
    memDB = null as any;
  }
  memDB = MemDb();
  memStore = await createStore<Thing>(memDB, "things");
});

it("finds many", async () => {
  expect(await memStore.findMany()).toMatchObject([]);
});
it("throws not found", async () => {
  expect(await memStore.findOne("a").catch(error => error)).toBeInstanceOf(
    KeyError,
  );
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
  const store2 = await createStore(memDB, "moreThings");
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

it("10000's", async () => {
  // 1089ms with memdown
  // 1575ms with leveldown
  // 40s with jsondown
  // jest.setTimeout(60000);
  const store = await createStore<Thing>(leveldb, "things3");
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
  const store = await createStore<{}>(leveldb, "things3");
  const id = randomString();
  await store.add(id, {});
  const x = await store.add(id, {}).catch(e => e);
  expect(x).toBeInstanceOf(KeyError);
});
it("rejects bad id", async () => {
  const store = await createStore<{}>(leveldb, "things3");
  expect(await store.add("_%$#@", {}).catch(x => x)).toBeInstanceOf(KeyError);
});
it("Schema rejects not in schema", async () => {
  const store = await createStore<Thing>(memDB, "things4", [
    { key: "name", notNull: true, unique: true },
  ]);
  const x = await store.add("a", { x: "aaa" } as any).catch(e => e);
  expect(x).toBeInstanceOf(SchemaError);
});
it("Schema rejects bad type", async () => {
  const store = await createStore<Thing>(memDB, "things5", [
    { key: "name", notNull: true, unique: true, type: "string" },
  ]);
  const e = await store
    .add("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { name: 1 as any })
    .catch(e => e);
  expect(e).toBeInstanceOf(SchemaError);
});
const randomString = () => randomBytes(16).toString("hex");
it("Schema rejects bad types", async () => {
  const store = await createStore<Thing>(memDB, "things6", [
    { key: "name", notNull: true, unique: true, type: ["string", "number"] },
  ]);
  expect(
    await store
      .add(randomBytes(16).toString("hex"), { name: true as any })
      .catch(e => e),
  ).toBeInstanceOf(SchemaError);
  await store.add(randomString(), { name: 1 as any });
  await store.add(randomString(), { name: "1" as any });
});
it("defaults values", async () => {
  const newName = randomString();
  const store = await createStore<{
    name: string;
    createdAt?: string | number | Date | undefined;
  }>(memDB, "things7", [
    {
      key: "name",
      notNull: true,
      unique: true,
      type: "string",
      default: () => newName,
    },
    { key: "createdAt", default: () => new Date() },
  ]);
  const id = randomString();
  await store.add(id, { name: null as any });
  const found = await store.findOne(id);
  expect(found.name).toBe(newName);
  expect(toDate(found.createdAt).getDate()).toBe(new Date().getDate());
});

it("updates same value", async () => {
  const store = await createStore<{
    name: string;
    createdAt?: string | number | Date | undefined;
  }>(memDB, "things9", [
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
});
it("updates other value", async () => {
  const store = await createStore<{
    name: string;
    createdAt?: string | number | Date | undefined;
  }>(memDB, "things10", [
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
});

it("updates not dup name", async () => {
  const store = await createStore<{
    name: string;
    createdAt?: string | number | Date | undefined;
  }>(memDB, "things11", [
    { key: "name", notNull: true, unique: true, type: "string" },
    { key: "createdAt", default: () => new Date() },
  ]);
  {
    const name1 = randomString();
    const id1 = randomString();
    await store.add(id1, { name: name1 });
    const name2 = randomString();
    await store.add(randomString(), { name: name2 });
    expect(
      await store.update(id1, { name: name2 }).catch(e => e),
    ).toBeInstanceOf(SchemaError);
  }
});

it("updates checking type", async () => {
  const store = await createStore<{
    name: string;
    createdAt?: string | number | Date | undefined;
  }>(memDB, "things12", [
    { key: "name", notNull: true, unique: true, type: "string" },
  ]);
  const id = randomString();
  await store.add(id, { name: randomString() });
  expect(
    await store.update(id, { name: randomBytes(8) as any }).catch(e => e),
  ).toBeInstanceOf(SchemaError);
});

it("deletes and clears indexes", async () => {
  const store = await createStore<{ name: string }>(memDB, "things13", [
    { key: "name", notNull: true, unique: true, type: "string" },
  ]);
  const id = randomString();
  const aName = randomString();
  await store.add(id, { name: aName });
  await store.remove(id);
  expect(await store.findOne(id).catch(e => e)).toBeInstanceOf(KeyError);
  expect(await store.add(id, { name: aName })).toBe(undefined);
});
