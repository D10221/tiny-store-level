import createStore from "../src";
import { KeyError } from "../src/keys";
import { MemDb } from "./util/level";
import randomString from "./util/random-string";

let db = MemDb();

describe("Level Store", () => {
  // ...
  it("finds nothing", async () => {
    const things = createStore(db, "things");
    const x = await things.findMany();
    expect(x).toMatchObject([]);
  });

  it("is not found error", async () => {
    const store = createStore<{ name: string }>(db, "things13", [
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    const id = randomString();
    const aName = randomString();
    await store.add({ _id_: id, name: aName });
    await store.delete(id);
    const found = await store.findOne(id).catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
  });

  it("IDS: rejects duplicated id", async () => {
    const store = createStore<{}>(db, "things3");
    const _id_ = randomString();
    await store.add({ _id_ });
    const x = await store.add({ _id_ }).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });

  it("IDS: rejects bad id", async () => {
    const store = createStore<{}>(db, "things3");
    expect(await store.add({ _id_: "_%$#@" }).catch(x => x)).toBeInstanceOf(
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
      await store.add({ _id_: id, name: "bob", xyz: "z" });
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "z",
        _id_: id,
      });
      await store.update({ _id_: id, xyz: "y" }); // same name
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "y",
        _id_: id,
      });
    }
  });
  it("Updates: rejects invalid Or missig key", async () => {
    const store = createStore(db, "xxx-" + randomString());
    await store.add({ _id_: "1" });
    const ret = await store
      .update({
        /* NO ID */
      })
      .catch(x => x);
    expect(ret).toBeInstanceOf(KeyError);
    expect(ret.message).toBe(KeyError.invalidOrMissigID("_id_").message);
  });
  it("Works alt _id_", async () => {
    const store = createStore<{ xname: string; id: string }>(
      db,
      randomString(),
      [{ key: "id", primaryKey: true }],
    );
    expect(await store.delete("*")).toBe(0);
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findMany()).toMatchObject([{ id: "a", xname: "aaa" }]);
    expect(await store.delete("*")).toBe(1);
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findOne("a")).toMatchObject({ xname: "aaa", id: "a" });
    expect(await store.delete("a")).toBe(1);
    expect(await store.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });
});
