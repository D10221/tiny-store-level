import { createStore } from "../src";
import {
  KeyError,
  isNotFoundError,
  isNullOrUndefined,
  toPromiseOf,
} from "../src/internal";
import { sublevel } from "./level";

function randomString(length = 16, enc = "hex") {
  return require("crypto")
    .randomBytes(length)
    .toString(enc);
}

type WithID<T> = T & { id: string };

describe("ids", () => {
  it("rejects existing", async () => {
    const store = createStore<WithID<{}>>("id", sublevel(randomString()));
    const id = randomString();
    await store.add({ id });
    const x = await store.add({ id }).catch(e => e);
    expect(x).toBeInstanceOf(KeyError);
  });

  it("rejects invalid", async () => {
    const store = createStore<WithID<{}>>("id", sublevel(randomString()));
    const e = await store.add({ id: "_%$#@" }).catch(x => x);
    expect(e).toBeInstanceOf(KeyError);
  });

  it("throws not found", async () => {
    const store = createStore<WithID<{ name: string }>>(
      "id",
      sublevel(randomString()),
    );
    const x = await store.findOne("a").catch(error => error);
    expect(x.name).toBe("NotFoundError");
  });
});

describe("Level Store", () => {
  it("Updates: keeps other values", async () => {
    const store = createStore<WithID<{ name: string; xyz: string }>>(
      "id",
      sublevel(randomString()),
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
      "id",
      sublevel("xxx-" + randomString()),
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
});

describe("configuration", () => {
  it("accepts. idTest", async () => {
    const store = createStore<{ id: string }>(
      {
        pkey: "id",
        idtest: x => x !== "aaa",
      },
      sublevel(randomString()),
    );
    const { add } = store;
    const err = await add({ id: "aaa" }).catch(e => e);
    expect(err).toBeInstanceOf(KeyError);
    await add({ id: "aab" });
  });
});

function* range(from: number, to: number) {
  while (from <= to) {
    yield from++;
  }
}
const fromRange = (from: number, to: number) => Array.from(range(from, to));

describe("findMany", () => {
  const store = createStore<{ name: string; id: string }>(
    "id",
    sublevel(randomString()),
  );
  beforeAll(async () => {
    await store.batch(
      fromRange(1, 100).map(x => ({
        key: `${x}`,
        value: { id: `${x}`, name: `x${x}` },
        type: "put",
      })),
    );
  });
  it("Finds All", async () => {
    expect((await store.findMany("*")).length).toBe(100);
  });
  it("finds with Query", async () => {
    const some = await store.findMany({ id: { $in: ["5", "50"] } });
    expect(some).toMatchObject([
      { id: "5", name: "x5" },
      { id: "50", name: "x50" },
    ]);
  });
  it("finds with filter", async () => {
    const some = await store.findMany(x => {
      return Number(x.id) === 3 && x.name === "x3";
    });
    expect(some).toMatchObject([{ id: "3", name: "x3" }]);
  });
  it("finds nothing", async () => {
    // empty
    const { findMany } = createStore<{ id: string }>(
      "id",
      sublevel(randomString()),
    );
    expect(await findMany("*")).toMatchObject([]);
    expect(await findMany({})).toMatchObject([]);
    expect(await findMany({ id: { $gt: "0" } })).toMatchObject([]);
    expect(await findMany(_ => true)).toMatchObject([]);
  });
});
describe("findOne", () => {
  const store = createStore<WithID<{ name: string }>>(
    "id",
    sublevel(randomString()),
  );
  beforeAll(async () => {
    await store.batch(
      fromRange(1, 100).map(x => ({
        key: `${x}`,
        value: { id: `${x}`, name: `x${x}` },
        type: "put",
      })),
    );
  });
  const { findOne } = store;
  it("is NotFoundError error", async () => {
    const found = await findOne("101").catch(e => e);
    expect(found).toBeInstanceOf(Error);
    expect((found as Error).name === "NotFoundError").toBe(true);
    expect(isNotFoundError(found)).toBe(true);
  });
  it("Finds id", async () => {
    const found = await findOne("7").catch(e => e);
    expect(found).toMatchObject({ id: "7", name: "x7" });
  });
  it("Finds Query", async () => {
    const found = await findOne({ id: { $in: ["7"] } }).catch(e => e);
    expect(found).toMatchObject({ id: "7", name: "x7" });
  });
  it("Finds filter", async () => {
    const found = await findOne(x => x.id === "7" && x.name === "x7");
    expect(found).toMatchObject({ id: "7", name: "x7" });
  });
  it("finds Nothing (Query)", async () => {
    const found = await findOne({ id: { $in: ["1000"] } });
    expect(found === null || found === undefined).toBe(true);
    expect(isNullOrUndefined(found)).toBe(true);
  });
  it("finds Nothing (Filter)", async () => {
    const found = await findOne(x => x.id === "1000");
    expect(found === null || found === undefined).toBe(true);
    expect(isNullOrUndefined(found)).toBe(true);
  });
});
describe("Remove", () => {
  const store = createStore<WithID<{ name: string }>>(
    "id",
    sublevel(randomString()),
  );
  function setup() {
    return store.batch(
      fromRange(1, 100).map(x => ({
        key: `${x}`,
        value: { id: `${x}`, name: `x${x}` },
        type: "put",
      })),
    );
  }
  beforeEach(async () => {
    await setup();
  });
  const { remove } = store;
  const count = () => toPromiseOf(prev => prev + 1, 0)(store.createKeyStream());

  it("Deletes All", async () => {
    expect(await remove("*")).toBe(100);
    expect(await count()).toBe(0);
  });
  it("Delets nothing", async () => {
    await store.clear();
    expect(await remove("*")).toBe(0);
  });
  it("Throws KeyError", async () => {
    expect(await remove("101").catch(e => e)).toBeInstanceOf(KeyError);
  });
  it("Deletes Query", async () => {
    expect(await remove({ id: { $in: ["1"] } })).toBe(1);
    expect(await count()).toBe(99);
    {
      const errName = await store.get("1").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
    // ...
    expect(await remove({ id: { $in: ["2"] } })).toBe(1);
    expect(await count()).toBe(98);
    {
      const errName = await store.get("2").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
  });
  it("Deletes Filter", async () => {
    expect(await remove(x=>x.id === "1" && x.name === "x1")).toBe(1);
    expect(await count()).toBe(99);
    {
      const errName = await store.get("1").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
    // ...
    expect(await remove(x=>x.id === "2" && x.name === "x2")).toBe(1);
    expect(await count()).toBe(98);
    {
      const errName = await store.get("2").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
  });
});
