import createStore, { MemDb } from "../src";
import randomString from "./util/random-string";

let db = MemDb();

describe("Level Store", () => {
 
  it("Deletes", async () => {
    type Target = { name: string }
    const store1 = createStore<Target>(db, "store1-" + randomString());
    const store2 = createStore<Target>(db, "store2-" + randomString());
    // ...
    expect(await store2.delete("*")).toBe(0);
    expect(await store1.add({ _id_: "1", name: "one" })).toBe(undefined);
    expect(await store1.delete("*")).toBe(1);
    expect((await store1.findMany()).length).toBe(0);
    expect(await store1.add({ _id_: "2", name: "two" })).toBe(undefined);
    expect(await store1.add({ _id_: "3", name: "three" })).toBe(undefined);
    expect((await store1.findMany()).length).toBe(2);
    const all = await store1.findMany()
    expect(all.length).toBe(2);
    expect(await store1.delete("*")).toBe(2);
    //should not throw key exists    
    expect(await store1.add({ _id_: "a", name: "aaa" })).toBe(undefined);
    expect(await store1.add({ _id_: "b", name: "bbb" })).toBe(undefined);    
    expect((await store1.findMany()).length).toBe(2); //all there
    const r = await store1.findMany({ _id_: { $in: ["a"] } }); //that one there
    expect(r[0]._id_).toBe("a");
    // should delete exactly 1
    expect(await store1.delete({ _id_: { $in: ["a"] } })).toBe(1);
    expect(await store1.delete({ _id_: { $in: ["b"] } })).toBe(1);
    // Should throw Not found if parameter is an ID
    expect(await store1.findOne("a").catch(e => e.name)).toBe("NotFoundError");
    // Should Not delete other stores
    expect((await store2.findMany())[0]).toMatchObject({ _id_: "1", name: "one" });
  });
});
