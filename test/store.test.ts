import createStore, { MemDb } from "../src";
import { KeyError } from "../src/keys";
import randomString from "./random-string";

let db = MemDb();

describe("Level Store", () => {
  // ...
  it("finds nothing", async () => {
    const things = createStore(db, "things");
    const x = await things.findMany();
    expect(x).toMatchObject([]);
  });

  it("Add , Remove, Find removed", async () => {
    const things = createStore<{ name: string }>(db, "things");
    await things.clear();
    expect(await things.add({ $id: "a", name: "aaa" })).toBe(undefined);
    // ...
    expect(await things.clear()).toBe(1);
    expect(await things.add({ $id: "a", name: "aaa" })).toBe(undefined);
    expect(await things.findOne("a")).toMatchObject({ name: "aaa", $id: "a" });
    expect(await things.remove("a")).toBe(undefined);
    expect(await things.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });

  it("10000's", async () => {
    // 1089ms, 950ms with memdown
    // 1575ms with leveldown
    // jest.setTimeout(60000);

    const store = createStore<{ name: string }>(db, "things3");
    console.time("add:1");
    await store.add({ $id: "1", name: "1" });
    console.timeEnd("add:1");
    console.time("add:x10000");
    for (let i = 0; i < 10000; i++) {
      await store.add({ $id: `indexed${i}`, name: `x${i}` });
    }
    console.timeEnd("add:x10000");

    const one = 9999;
    console.time(`findOne:${one}`);
    expect((await store.findOne(`indexed${one}`)).name).toBe(`x${one}`);
    console.timeEnd(`findOne:${one}`);

    const many = 10001;
    console.time(`findMany:${many}`);
    expect((await store.findMany()).length).toBe(many);
    console.timeEnd(`findMany:${many}`);
  });

  it("is not found error", async () => {
    const store = createStore<{ name: string }>(db, "things13", [
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    const id = randomString();
    const aName = randomString();
    await store.add({ $id: id, name: aName });
    await store.remove(id);
    const found = await store.findOne(id).catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
  });

  it("IDS: rejects duplicated id", async () => {
    const store = createStore<{}>(db, "things3");
    const $id = randomString();
    await store.add({ $id });
    const x = await store.add({ $id }).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });

  it("IDS: rejects bad id", async () => {
    const store = createStore<{}>(db, "things3");
    expect(await store.add({ $id: "_%$#@" }).catch(x => x)).toBeInstanceOf(
      KeyError,
    );
  });

  it("IDS: throws not found", async () => {
    const things = createStore<{ name: string }>(db, "things");
    const x = await things.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });

  it("Updates: keeps other values", async () => {
    const store = createStore<{ name: string; xyz: string }>(db, "things125");
    {
      const id = randomString();
      await store.add({ $id: id, name: "bob", xyz: "z" });
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "z",
        $id: id,
      });
      await store.update({ $id: id, xyz: "y" }); // same name
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "y",
        $id: id,
      });
    }
  });
  it("Updates: rejects invalid Or missig key", async () => {
    const store = createStore(db, "xxx-" + randomString());
    await store.add({ $id: "1" });
    const ret = await store
      .update({
        /* NO ID */
      })
      .catch(x => x);
    expect(ret).toBeInstanceOf(KeyError);
    expect(ret.message).toBe(KeyError.invalidOrMissig("$id").message);
  });

  it("Works alt $id", async () => {
    const store = createStore<{ xname: string; id: string }>(db, "things", [
      { key: "id", primaryKey: true },
    ]);
    await store.clear();
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    // ...
    expect(await store.clear()).toBe(1);
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findOne("a")).toMatchObject({ xname: "aaa", id: "a" });
    expect(await store.remove("a")).toBe(undefined);
    expect(await store.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });
});
