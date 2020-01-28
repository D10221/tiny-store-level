import { randomBytes } from "crypto";
import createStore, { MemDb } from "../src";

let db = MemDb();
const randomString = () => randomBytes(16).toString("hex");

describe("Queries", () => {  

  it("finds value", async ()=>{
    const store = await createStore<{ name: string }>(db, "things14");
    await store.add(randomString(), { name: "bob14"})
    
    expect((await store.findMany({ "value.name": { $in: ["bob14"] }}))[0][1].name).toBe("bob14");
    expect((await store.findMany({ name: { $in: [ "bob"]  }}))).toMatchObject([]);
})
});

