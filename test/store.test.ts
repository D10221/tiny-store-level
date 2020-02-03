import { createStore } from "../src";
import { KeyError, isNullOrUndefined, toPromiseOf } from "../src/internal";
import { sublevel } from "./level";

function randomString(length = 16, enc = "hex") {
  return require("crypto")
    .randomBytes(length)
    .toString(enc);
}

type WithID<T> = T & { id: string };

describe("Add", () => {
  const store = createStore<WithID<{ name: string }>>(
    "id",
    sublevel(randomString()),
  );
  beforeAll(async () => {
    await store.batch([
      { key: "1", value: { id: "1", name: "one" }, type: "put" },
    ]);
  });
  it("adds id", async () => {
    await store.add({ id: "2", name: "two" });
    expect(await store.get("2")).toMatchObject({
      id: "2",
      name: "two",
    });
  });
  it("rejects existing id", async () => {
    expect(
      await store.add({ id: "1", name: "!" }).catch(e => e),
    ).toBeInstanceOf(Error);
  });
  it("rejects missing or bad id", async () => {
    expect(
      await store.add({ id: undefined as any, name: "xxx" }).catch(e => e),
    ).toBeInstanceOf(KeyError);
    expect(
      await store.add({ id: null as any, name: "xxx" }).catch(e => e),
    ).toBeInstanceOf(KeyError);
    expect(
      await store.add({ id: ([] as any) as any, name: "xxx" }).catch(e => e),
    ).toBeInstanceOf(KeyError);
    expect(
      await store.add({ id: ({} as any) as any, name: "xxx" }).catch(e => e),
    ).toBeInstanceOf(KeyError);
    expect(
      await store.add({ id: "$$$", name: "xxx" }).catch(e => e),
    ).toBeInstanceOf(KeyError);
  });
});
describe("Updates", () => {
  const store = createStore<WithID<{ name: string; xyz: string }>>(
    "id",
    sublevel(randomString()),
  );
  beforeAll(async () => {
    await store.batch([
      { key: "1", value: { id: "1", name: "one", xyz: "x" }, type: "put" },
      { key: "2", value: { id: "2", name: "two", xyz: "y" }, type: "put" },
      { key: "3", value: { id: "3", name: "three", xyz: "z" }, type: "put" },
    ]);
  });

  it("Updates: keeps other values", async () => {
    {
      await store.update({ id: "1", xyz: "xx" }); // same name
      expect(await store.get("1")).toMatchObject({
        id: "1",
        name: "one",
        xyz: "xx",
      });
    }
  });
  it("rejects missig key", async () => {
    expect(
      await store
        .update({
          /* NO ID */
        })
        .catch(x => x),
    ).toBeInstanceOf(KeyError);
  });
  it("rejects invalid key", async () => {
    expect(
      await store
        .update({
          id: "*&%$#",
        })
        .catch(x => x),
    ).toBeInstanceOf(KeyError);
  });
  it("rejects invalid payload", async () => {
    expect(
      await store.update(undefined as any).catch((x: any) => x),
    ).toBeInstanceOf(Error);
    expect(await store.update(null as any).catch((x: any) => x)).toBeInstanceOf(
      Error,
    );
    expect(await store.update([] as any).catch((x: any) => x)).toBeInstanceOf(
      KeyError,
    );
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

describe("find", () => {
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
    expect((await store.find("*")).length).toBe(100);
  });
  it("finds with Query", async () => {
    const some = await store.find({ id: { $in: ["5", "50"] } });
    expect(some).toMatchObject([
      { id: "5", name: "x5" },
      { id: "50", name: "x50" },
    ]);
  });
  it("finds with filter", async () => {
    const some = await store.find(x => {
      return Number(x.id) === 3 && x.name === "x3";
    });
    expect(some).toMatchObject([{ id: "3", name: "x3" }]);
  });
  it("finds nothing", async () => {
    // empty
    const { find } = createStore<{ id: string }>(
      "id",
      sublevel(randomString()),
    );
    expect(await find("*")).toMatchObject([]);
    expect(await find({})).toMatchObject([]);
    expect(await find({ id: { $gt: "0" } })).toMatchObject([]);
    expect(await find(_ => true)).toMatchObject([]);
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
    expect(await remove(x => x.id === "1" && x.name === "x1")).toBe(1);
    expect(await count()).toBe(99);
    {
      const errName = await store.get("1").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
    // ...
    expect(await remove(x => x.id === "2" && x.name === "x2")).toBe(1);
    expect(await count()).toBe(98);
    {
      const errName = await store.get("2").catch(e => e.name);
      expect(errName).toBe("NotFoundError");
    }
  });
});
describe("put record", () => {
  const store = createStore<WithID<{ name: string }>>(
    "id",
    sublevel(randomString()),
  );
  it("works", async () => {
    store.put("x", "x", {}, (err: any) => {
      // ...
    });
    await store.put("x", "x"); //forward
    await store.put("x", { id: "x" }); //put record
    expect(await store.put({}).catch((err: any) => err)).toBeInstanceOf(
      KeyError,
    ); //put record fails
    await new Promise((resolve, reject) => {
      // forward
      store.put("x", undefined, (err: any) => {
        if (err) {
          if (err.name === "WriteError") {
            resolve();
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  });
});
