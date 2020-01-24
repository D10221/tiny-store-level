/**
 * @type {import("../").CreateStore}
 */
const { default: createStore, MemDb } = require("../");

function newid() {
  return require("crypto")
    .randomBytes(20)
    .toString("hex");
}
describe("resolve package", () => {
  it("works", async () => {
    const db = await MemDb();
    const store = await createStore(db, "stuff");
    const id = newid();
    await store.add( id, { hello: "world" });    
    const x = await store.findOne(id);
    expect(x).toEqual({ hello: "world" });
    await db.close();// 13ms
  });
});
