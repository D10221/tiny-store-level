/**
 * @type {import("../").CreateStore}
 */
const { default: createStore, MemDb } = require("../");

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}

describe("Tiny Store Level", () => {
  it("works", async () => {
    const db = await MemDb();
    const stuff = await createStore(db, "stuff");
    const id = randomString();
    await stuff.add({ _id_: id, hello: "world" });
    const x = await stuff.findOne(id);
    expect(x).toEqual({ hello: "world", _id_: id });
    const many = await stuff.findMany();
    expect(
      many.find(x => x._id_ === id), // filter, find ...etc
    ).toEqual({ hello: "world", _id_: id });
    await db.close(); // 13ms
  });
});
