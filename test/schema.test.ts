import createStore from "../src";
import { SchemaError } from "../src/schema";
import { toDate } from "./util/dates";
import randomString from "./util/random-string";
import { MemDb } from "./util/level";

interface Thing extends Object {
  name: string;
}

let db = MemDb();

describe("Schema", () => {
  it("Schema rejects not in schema", async () => {
    const store = createStore<Thing>(db, "things4", [
      { key: "name", notNull: true, unique: true },
    ]);
    const x = await store.add({ _id_: "a", x: "aaa" } as any).catch(e => e);
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
    await store.add({ ok: true, _id_: "1" });
    const ret = await store.update({ ok: "", _id_: "1" }).catch(x => x);
    expect(ret).toBeInstanceOf(SchemaError);
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
        .add({ _id_: randomString(), name: true })
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
        .add({ _id_: randomString(), name: {} })
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
        .add({ _id_: randomString(), name: null })
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
        .add({ _id_: randomString(), name: undefined })
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
        .add({ _id_: randomString(), name: function() {} })
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
    await store.add({ _id_: id, name: null as any });
    const found = await store.findOne(id);

    expect(found.name).toBe(newName);

    expect(toDate(found.createdAt).getDate()).toBe(new Date().getDate());
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
      await store.add({ _id_: id1, name: name1 });
      const name2 = randomString();
      await store.add({ _id_: randomString(), name: name2 });
      expect(
        await store.update({ _id_: id1, name: name2 }).catch(e => e),
      ).toBeInstanceOf(SchemaError);
    }
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
      await store.add({ _id_: id, xname: newName });
      await store.update({ _id_: id, xname: newName }); // same name
      expect((await store.findOne(id)).xname).toBe(newName);
    }
  });

  it("Not primary (override)", async () => {
    expect(() => {
      return createStore<{ _id_: string }>(db, randomString(), [
        { key: "_id_" }, // Not primary , but _id_ is been overriden
      ]);
    }).toThrow(SchemaError);
  });

  it("Too many keys", async () => {
    expect(() => {
      createStore<{ idx: string; idz: string }>(db, randomString(), [
        { key: "idx", primaryKey: true },
        { key: "idz", primaryKey: true },
      ]);
    }).toThrowError(SchemaError);
  });

  it("Bad Key", async () => {
    expect(() => {
      createStore<{ idx: string }>(db, randomString(), [
        { key: "idx", primaryKey: true, unique: true, notNull: false },
      ]);
    }).toThrowError(SchemaError);
    expect(() => {
      createStore<{ idx: string }>(db, randomString(), [
        { key: "idx", primaryKey: true, unique: true, notNull: false },
      ]);
    }).toThrowError(SchemaError);
    expect(() => {
      createStore<{ idx: string }>(db, randomString(), [
        {
          key: "idx",
          primaryKey: true,
          unique: true,
          default: () => undefined,
        },
      ]);
    }).toThrowError(SchemaError);
    expect(() => {
      createStore<{ idx: string }>(db, randomString(), [
        { key: "idx", primaryKey: true, type: "number" },
      ]);
    }).toThrowError(SchemaError);
  });
});
