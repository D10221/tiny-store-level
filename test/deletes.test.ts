import createStore from "../src";
import { MemDb } from "./util/level";
import randomString from "./util/random-string";

let db = MemDb();

describe("Store Deletes", () => {
  it("Deletes", async () => {
    type Target = { name: string };
    const store1 = createStore<Target>(db, "store1-" + randomString());
    const store2 = createStore<Target>(db, "store2-" + randomString());
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
