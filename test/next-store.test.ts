import nextStore from "../src/next-store";
import { MemDb } from "./util/level";
import randomString from "./util/random-string";

let db = MemDb();

describe("NextStore", () => {
  // ...
  it("finds nothing", async () => {
    const things = nextStore(db, "things");
    const x = await things.findMany();
    expect(x).toMatchObject([]);
  });

  it("is not found error", async () => {
    const store = nextStore<{ name: string }>(db, "things13", [
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    const id = randomString();
    const aName = randomString();
    await store.add({ id, name: aName });
    await store.remove(id);
    const found = await store.findOne(id).catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
  });

  it("IDS: rejects duplicated id", async () => {
    const store = nextStore<{}>(db, "things3");
    const id = randomString();
    await store.add({ id });
    const x = await store.add({ id }).catch(e => e);
    expect(x).toBeInstanceOf(Error);
  });

  it("IDS: rejects bad id", async () => {
    const store = nextStore<{}>(db, "things3");
    expect(await store.add({ id: "_%$#@" }).catch(x => x)).toBeInstanceOf(
      Error,
    );
  });

  it("IDS: throws not found", async () => {
    const things = nextStore<{ name: string }>(db, "things");
    const x = await things.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });

  it("Updates: keeps other values", async () => {
    const store = nextStore<{ name: string; xyz: string }>(db, "things125");
    {
      const id = randomString();
      await store.add({ id, name: "bob", xyz: "z" });
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "z",
        id,
      });
      await store.update({ id, xyz: "y" }); // same name
      expect(await store.findOne(id)).toMatchObject({
        name: "bob",
        xyz: "y",
        id,
      });
    }
  });
  it("Updates: rejects invalid Or missig key", async () => {
    const store = nextStore(db, "xxx-" + randomString());
    await store.add({ id: "1" });
    const ret = await store
      .update({
        /* NO ID */
      })
      .catch(x => x);
    expect(ret).toBeInstanceOf(Error);
  });
  it("Works alt id", async () => {
    const store = nextStore<{ xname: string; id: string }>(
      db,
      randomString(),
      [{ key: "id", primaryKey: true }],
    );
    expect(await store.remove("*")).toBe(0);
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    /**
     * Array [
        Object {
    +     "key": "a",
    +     "value": Object {
            "id": "a",
            "xname": "aaa",
    +     },
        },
     */
    expect(await store.findMany()).toMatchObject([{ id: "a", xname: "aaa" }]);
    expect(await store.remove("*")).toBe(1);
    expect(await store.add({ id: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findOne("a")).toMatchObject({ xname: "aaa", id: "a" });
    expect(await store.remove("a")).toBe(1);
    expect(await store.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });
});
