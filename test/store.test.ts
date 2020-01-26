import { randomBytes } from "crypto";
import createStore, { MemDb } from "../src";
import { toDate } from "../src/dates";
import KeyError from "../src/KeyError";
import mapOut from "../src/map-out";
import SchemaError from "../src/schema-error";

interface Thing extends Object {
  name: string;
}

let db = MemDb();
const randomString = () => randomBytes(16).toString("hex");

describe("Level Store", () => {
  // ...
  it("finds many empty", async () => {
    const things = await createStore<Thing>(db, "things");
    const x = await things.findMany();
    expect(x).toMatchObject([]);
  });

  it("throws not found", async () => {
    const things = await createStore<Thing>(db, "things");
    const x = await things.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });

  it("Add , Remove, Find removed", async () => {
    const things = await createStore<Thing>(db, "things");
    await things.clear();
    expect(await things.add("a", { name: "aaa" })).toBe(undefined);
    // ...
    expect(await things.clear()).toBe(1);
    expect(await things.add("a", { name: "aaa" })).toBe(undefined);
    expect(await things.findOne("a")).toMatchObject({ name: "aaa" });
    expect(await things.remove("a")).toBe(undefined);
    expect(await things.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });

  it("maps out", async () => {
    const things = await createStore<Thing>(db, "things");
    const bt = mapOut(things, x => ({ ...x[1], id: x[0] }));
    await bt.add("x", { name: "x" });
    const x = await bt.findOne("x");
    expect(x.id).toBe("x");
  });

  it("10000's", async () => {

    // 1089ms, 950ms with memdown
    // 1575ms with leveldown
    // 40s with jsondown
    // jest.setTimeout(60000);

    const store = await createStore<Thing>(db, "things3");
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

  it("rejects duplicated id", async () => {
    const store = await createStore<{}>(db, "things3");
    const id = randomString();
    await store.add(id, {});
    const x = await store.add(id, {}).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });
  
  it("rejects bad id", async () => {
    const store = await createStore<{}>(db, "things3");
    expect(await store.add("_%$#@", {}).catch(x => x)).toBeInstanceOf(KeyError);
  });
  
  it("Schema rejects not in schema", async () => {
    const store = await createStore<Thing>(db, "things4", [
      { key: "name", notNull: true, unique: true },
    ]);
    const x = await store.add("a", { x: "aaa" } as any).catch(e => e);
    expect(x).toBeInstanceOf(SchemaError);
  });
  
  it("Schema rejects bad type", async () => {
    const store = await createStore<Thing>(db, "things5", [
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    const e = await store
      .add("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { name: 1 as any })
      .catch(e => e);
    expect(e).toBeInstanceOf(SchemaError);
  });
  
  it("Schema rejects bad types", async () => {
    const store = await createStore<Thing>(db, "things6", [
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
    }>(db, "things7", [
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

  it("updates same value, when schema is unique", async () => {
    const store = await createStore<{
      name: string;
      createdAt?: string | number | Date | undefined;
    }>(db, "things9", [
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
    }>(db, "things10", [
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
    }>(db, "things11", [
      // schema
      { key: "name", notNull: true, unique: true, type: "string" },
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
    }>(db, "things12", [
      {
        //schema
        key: "name",
        notNull: true,
        unique: true,
        type: "string",
      },
    ]);

    const id = randomString();
    await store.add(id, { name: randomString() });

    const update = () =>
      store.update(id, { name: randomBytes(8) as any }).catch(e => e);

    expect(await update()).toBeInstanceOf(SchemaError);
  });

  it("is not found error", async () => {
    const store = await createStore<{ name: string }>(db, "things13", [
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    const id = randomString();
    const aName = randomString();
    await store.add(id, { name: aName });
    await store.remove(id);
    const found = await store.findOne(id).catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
  });
});
