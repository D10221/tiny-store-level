import createStore, { MemDb } from "../src";
import randomString from "./util/random-string";

let db = MemDb();

describe("Queries", () => {
  it("finds value & key", async () => {
    const store = createStore<{ name: string }>(db, randomString());
    const id = randomString();
    const name = "finds key";
    await store.add({ "_id_": id, name });
    const all = await store.findMany();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe(name);
    expect(all[0]["_id_"]).toBe(id);
    let found = await store.findMany({ name: { $in: [name] } })
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0]["_id_"]).toBe(id);
    found = await store.findMany({ _id_: { $in: [id] } })
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0]["_id_"]).toBe(id);
  })
  // it("finds value", async () => {
  //   const store = createStore<{ name: string }>(db, randomString());
  //   const id = randomString();
  //   const name = randomString();
  //   await store.add({ $id: id, name });
  //   const ret = await store.findMany({ name: { $in: [name] } });
  //   const x = ret[0];
  //   expect(x).toBeTruthy();
  //   expect(x.name).toBe(name);
  //   const none = await store.findMany({ name: { $in: ["bob"] } })
  //   expect(none).toMatchObject([]);
  //   const found = await store.findMany({ $id: { $in: [id] } })
  //   expect(found.length).toBe(1);
  //   expect(found[0].$id).toBe(id);
  // });
});
