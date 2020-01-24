/**
 * @type {import("../").CreateStore}
 */
const { default: createStore, MemDb } = require("../");

function newid() {
  return require("crypto")
    .randomBytes(20)
    .toString("hex");
}
/**
 *
 * @param {[string, {}][]} values
 * @returns {{id: string }[]}
 */
function mapIDs(values) {
  return values.map(([id, value]) => ({ id, ...value }));
}

describe("Tiny Store Level", () => {
  it("works", async () => {
    const db = await MemDb();
    const stuff = await createStore(db, "stuff");
    const id = newid();
    await stuff.add(id, { hello: "world" });
    const x = await stuff.findOne(id);
    expect(x).toEqual({ hello: "world" });

    const many = await stuff
      .findMany()
      // map Results
      .then(mapIDs);

    expect(
      many.find(x => x.id === id), // filter, find ...etc
    ).toEqual({ hello: "world", id });

    await db.close(); // 13ms
  });
});
