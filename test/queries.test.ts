import createStore from "../src";
import randomString from "./util/random-string";
import subleveldown from "subleveldown";
import db from "./util/db";
const level = (name: string) =>
  subleveldown(db, name, { valueEncoding: "json" });

describe("Queries", () => {
  it("finds value & key", async () => {
    const store = createStore<{ name: string; id: string }>(
      level(randomString()),
      "id",
    );
    const id = randomString();
    const name = "finds key";
    await store.add({ id: id, name });
    const all = await store.findMany();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe(name);
    expect(all[0].id).toBe(id);
    let found = await store.findMany({ name: { $in: [name] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0].id).toBe(id);
    found = await store.findMany({ id: { $in: [id] } });
    expect(found && found[0] && found[0].name).toBe(name);
    expect(found && found[0] && found[0].id).toBe(id);
  });
});
