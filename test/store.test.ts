import createStore from "../src";
import { KeyError, randomString } from "../src/internal";
import subleveldown from "subleveldown";
import db from "./db";

const level = (name: string) =>
  subleveldown(db, name, { valueEncoding: "json" });

type WithID<T> = T & { id: string };

describe("Level Store", () => {
  // ...
  it("finds nothing", async () => {
    const store = createStore<WithID<{}>>(level(randomString()), "id");

    const x = await store.findMany();
    expect(x).toMatchObject([]);
  });

  it("is not found error", async () => {
    const store = createStore<WithID<{ name: string }>>(
      level(randomString()),
      "id",
    );
    const id = randomString();
    const aName = randomString();
    await store.add({ id, name: aName });
    await store.remove(id);
    const found = await store.findOne(id).catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
  });

  it("IDS: rejects duplicated id", async () => {
    const store = createStore<WithID<{}>>(level(randomString()), "id");
    const id = randomString();
    await store.add({ id });
    const x = await store.add({ id }).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });

  it("IDS: rejects bad id", async () => {
    const store = createStore<WithID<{}>>(level(randomString()), "id");
    const e = await store.add({ id: "_%$#@" }).catch(x => x);
    expect(e).toBeInstanceOf(KeyError);
  });

  it("IDS: throws not found", async () => {
    const store = createStore<WithID<{ name: string }>>(
      level(randomString()),
      "id",
    );
    const x = await store.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });

  it("Updates: keeps other values", async () => {
    const store = createStore<WithID<{ name: string; xyz: string }>>(
      level(randomString()),
      "id",
    );
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
    const store = createStore<{ id: string }>(
      level("xxx-" + randomString()),
      "id",
    );
    await store.add({ id: "1" });
    const ret = await store
      .update({
        /* NO ID */
      })
      .catch(x => x);
    expect(ret).toBeInstanceOf(KeyError);
    expect(ret.message).toBe(KeyError.invalidOrMissigID("id").message);
  });
  it("Works alt id", async () => {
    const store = createStore<{ xname: string; xid: string }>(
      level(randomString()),
      "xid",
    );
    expect(await store.remove("*")).toBe(0);
    expect(await store.add({ xid: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findMany()).toMatchObject([{ xid: "a", xname: "aaa" }]);
    expect(await store.remove("*")).toBe(1);
    expect(await store.add({ xid: "a", xname: "aaa" })).toBe(undefined);
    expect(await store.findOne("a")).toMatchObject({ xname: "aaa", id: "a" });
    expect(await store.remove("a")).toBe(1);
    expect(await store.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });

  it("Deletes", async () => {
    type Target = { name: string; id: string };
    const store1 = createStore<Target>(level("store1-" + randomString()), "id");
    const store2 = createStore<Target>(level("store1-" + randomString()), "id");
    store2.add({ id: randomString(), name: "survive-" + randomString() });
    // ...
    expect(await store1.remove("*")).toBe(0);
    expect(await store1.add({ id: "1", name: "one" })).toBe(undefined);
    expect(await store1.remove("*")).toBe(1);
    expect((await store1.findMany()).length).toBe(0);
    expect(await store1.add({ id: "2", name: "two" })).toBe(undefined);
    expect(await store1.add({ id: "3", name: "three" })).toBe(undefined);
    expect((await store1.findMany()).length).toBe(2);
    const all = await store1.findMany();
    expect(all.length).toBe(2);
    expect(await store1.remove("*")).toBe(2);
    //should not throw key exists
    expect(await store1.add({ id: "a", name: "aaa" })).toBe(undefined);
    expect(await store1.add({ id: "b", name: "bbb" })).toBe(undefined);
    expect((await store1.findMany()).length).toBe(2); //all there
    const r = await store1.findMany({ id: { $in: ["a"] } }); //that one there
    expect(r[0].id).toBe("a");
    // should remove exactly 1
    expect(await store1.remove({ id: { $in: ["a"] } })).toBe(1);
    expect(await store1.remove({ id: { $in: ["b"] } })).toBe(1);
    // Should throw Not found if parameter is an ID
    expect(await store1.findOne("a").catch(e => e.name)).toBe("NotFoundError");
    // Should Not remove other stores
    const xxx = await store2.findMany();
    expect(Array.isArray(xxx)).toBe(true);
    expect(xxx[0] && xxx[0].name && xxx[0].name.startsWith("survive-")).toBe(
      true,
    );
  });
});

describe("Queries", () => {
  it("finds value & key", async () => {
    const store = createStore<{ name: string; id: string }>(
      level(randomString()),
      "id",
    );
    const id = randomString();
    const name = "finds key";
    await store.add({ id: id, name });
    const all = await store.findMany();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe(name);
    expect(all[0].id).toBe(id);
    let found = await store.findMany({ name: { $in: [name] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0].id).toBe(id);
    found = await store.findMany({ id: { $in: [id] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0].id).toBe(id);
  });
});
