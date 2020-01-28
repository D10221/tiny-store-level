/**
 * @type {import("../").CreateStore}
 */
const { default: createStore, MemDb } = require("../");

function randomString() {
  return require("crypto")
    .randomBytes(20)
    .toString("hex");
}

describe("Tiny Store Level", () => {
  it("works", async () => {
    const db = await MemDb();
    const stuff = await createStore(db, "stuff");
    const $id = randomString();
    await stuff.add({ $id, hello: "world" });
    const x = await stuff.findOne($id);
    expect(x).toEqual({ hello: "world", $id });
    const many = await stuff.findMany();
    expect(
      many.find(x => x.$id === $id), // filter, find ...etc
    ).toEqual({ hello: "world", $id });
    await db.close(); // 13ms
  });
});
