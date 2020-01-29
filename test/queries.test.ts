import createStore, { MemDb } from "../src";
import randomString from "./util/random-string";

let db = MemDb();

describe("Queries", () => {
  it("finds value", async () => {
    const store = createStore<{ name: string }>(db, randomString());
    const id = randomString();
    const name = randomString();
    await store.add({ $id: id, name });
    const ret = await store.findMany({ name: { $in: [name] } });
    const x = ret[0];
    expect(x).toBeTruthy();
    expect(x.name).toBe(name);
    const none = await store.findMany({ name: { $in: ["bob"] } })
    expect(none).toMatchObject([]);
    const found = await store.findMany({ $id: { $in: [id] } })
    expect(found.length).toBe(1);
    expect(found[0].$id).toBe(id);
  });
});
