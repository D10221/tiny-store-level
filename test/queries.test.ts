import { randomBytes } from "crypto";
import createStore, { MemDb } from "../src";

let db = MemDb();
const randomString = () => randomBytes(16).toString("hex");

describe("Queries", () => {
  it("finds value", async () => {
    const store = createStore<{ xname: string }>(db, "things14");
    await store.add({ $id: randomString(), xname: "bob14" });
    const ret = await store.findMany({ xname: { $in: ["bob14"] } });
    expect(ret[0].xname).toBe("bob14");
    expect(await store.findMany({ xname: { $in: ["bob"] } })).toMatchObject([]);
  });
});
