import createStore from "../src";
import randomString from "./util/random-string";
import { MemDb } from "./util/level";

let db = MemDb();

describe("Queries", () => {
  it("finds value & key", async () => {
    const store = createStore<{ name: string }>(db, randomString());
    const id = randomString();
    const name = "finds key";
    await store.add({ _id_: id, name });
    const all = await store.findMany();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe(name);
    expect(all[0]["_id_"]).toBe(id);
    let found = await store.findMany({ name: { $in: [name] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0]["_id_"]).toBe(id);
    found = await store.findMany({ _id_: { $in: [id] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0]["_id_"]).toBe(id);
  });
});
