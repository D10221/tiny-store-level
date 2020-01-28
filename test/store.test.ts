import createStore, { MemDb } from "../src";
import { toDate } from "./dates";
import { KeyError } from "../src/keys";
import { SchemaError } from "../src/schema";
import randomString from "./random-string";

interface Thing extends Object {
  name: string;
}

let db = MemDb();

describe("Level Store", () => {
  // ...
  it("finds many empty", async () => {
    const things = createStore<Thing>(db, "things");
    const x = await things.findMany();
    expect(x).toMatchObject([]);
  });

  it("throws not found", async () => {
    const things = createStore<Thing>(db, "things");
    const x = await things.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });

  it("Add , Remove, Find removed", async () => {
    const things = createStore<Thing>(db, "things");
    await things.clear();
    expect(await things.add({ $id: "a", name: "aaa" })).toBe(undefined);
    // ...
    expect(await things.clear()).toBe(1);
    expect(await things.add({ $id: "a", name: "aaa" })).toBe(undefined);
    expect(await things.findOne("a")).toMatchObject({ name: "aaa" });
    expect(await things.remove("a")).toBe(undefined);
    expect(await things.findOne("a").catch(e => e.name)).toBe("NotFoundError");
  });

  it("10000's", async () => {
    // 1089ms, 950ms with memdown
    // 1575ms with leveldown
    // jest.setTimeout(60000);

    const store = createStore<Thing>(db, "things3");
    console.time("add:1");
    await store.add({ $id: "1", name: "1" });
    console.timeEnd("add:1");
    console.time("add:x10000");
    for (let i = 0; i < 10000; i++) {
      await store.add({ $id: `indexed${i}`, name: `x${i}` });
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
    const store = createStore<{}>(db, "things3");
    const $id = randomString();
    await store.add({ $id });
    const x = await store.add({ $id }).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });

  it("rejects bad id", async () => {
    const store = createStore<{}>(db, "things3");
    expect(await store.add({ $id: "_%$#@" }).catch(x => x)).toBeInstanceOf(
      KeyError,
    );
  });

  it("Schema rejects not in schema", async () => {
    const store = createStore<Thing>(db, "things4", [
      { key: "name", notNull: true, unique: true },
    ]);
    const x = await store.add({ $id: "a", x: "aaa" } as any).catch(e => e);
    expect(x).toBeInstanceOf(SchemaError);
  });
  it("Schema rejects bad types (UPDATE)", async () => {
    const store = createStore<{
      ok: any;
    }>(db, "things-" + randomString(), [
      {
        key: "ok",
        notNull: true,
        unique: true,
        type: "boolean",
      },
    ]);
  });
  it("Schema rejects bad types (ADD)", async () => {
    expect(
      await createStore<{
        name: any;
      }>(db, "things-" + randomString(), [
        {
          key: "name",
          notNull: true,
          unique: true,
          type: ["string", "number"],
        },
      ])
        .add({ $id: randomString(), name: true })
        .catch(e => e),
    ).toBeInstanceOf(SchemaError);

    expect(
      await createStore<{
        name: any;
      }>(db, "things-" + randomString(), [
        {
          key: "name",
          notNull: true,
          unique: true,
          type: ["string", "number"],
        },
      ])
        .add({ $id: randomString(), name: {} })
        .catch(e => e),
    ).toBeInstanceOf(SchemaError);

    expect(
      await createStore<{
        name: any;
      }>(db, "things-" + randomString(), [
        {
          key: "name",
          notNull: true,
          unique: true,
          type: ["string", "number"],
        },
      ])
        .add({ $id: randomString(), name: null })
        .catch(e => e),
    ).toBeInstanceOf(SchemaError);

    expect(
      await createStore<{
        name: any;
      }>(db, "things-" + randomString(), [
        {
          key: "name",
          notNull: true,
          unique: true,
          type: ["string", "number"],
        },
      ])
        .add({ $id: randomString(), name: undefined })
        .catch(e => e),
    ).toBeInstanceOf(SchemaError);

    expect(
      await createStore<{
        name: any;
      }>(db, "things-" + randomString(), [
        {
          key: "name",
          notNull: true,
          unique: true,
          type: ["string", "number"],
        },
      ])
        .add({ $id: randomString(), name: function() {} })
        .catch(e => e),
    ).toBeInstanceOf(SchemaError);
  });

  it("defaults values", async () => {
    const newName = randomString();

    const store = createStore<{
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
    await store.add({ $id: id, name: null as any });
    const found = await store.findOne(id);

    expect(found.name).toBe(newName);

    expect(toDate(found.createdAt).getDate()).toBe(new Date().getDate());
  });

  it("updates same value, when schema is unique", async () => {
    const store = createStore<{
      xname: string;
      createdAt?: string | number | Date | undefined;
    }>(db, "things9", [
      { key: "xname", notNull: true, unique: true, type: "string" },
    ]);
    {
      const newName = "xname-" + randomString();
      const id = randomString();
      await store.add({ $id: id, xname: newName });
      await store.update({ $id: id, xname: newName }); // same name
      expect((await store.findOne(id)).xname).toBe(newName);
    }
  });

  it("updates not dup name", async () => {
    const store = createStore<{
      name: string;
      createdAt?: string | number | Date | undefined;
    }>(db, "things11", [
      // schema
      { key: "name", notNull: true, unique: true, type: "string" },
    ]);
    {
      const name1 = randomString();
      const id1 = randomString();
      await store.add({ $id: id1, name: name1 });
      const name2 = randomString();
      await store.add({ $id: randomString(), name: name2 });
      expect(
        await store.update({ $id: id1, name: name2 }).catch(e => e),
      ).toBeInstanceOf(SchemaError);
    }
  });

  it("updates keeps othe values", async () => {
    const store = createStore<{ name: string; xyz: string }>(db, "things125");
    {
      const id = randomString();
      await store.add({ $id: id, name: "bob", xyz: "z" });
      expect(await store.findOne(id)).toMatchObject({ name: "bob", xyz: "z" });
      await store.update({ $id: id, xyz: "y" }); // same name
      expect(await store.findOne(id)).toMatchObject({ name: "bob", xyz: "y" });
    }
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
});
