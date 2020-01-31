import createStore from "../src";
import { KeyError } from "../src/internal";
import randomString from "./util/random-string";
import subleveldown from "subleveldown";
import db from "./util/db";

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
});
