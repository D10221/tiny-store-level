const createStore = require("../").default;
const levelup = require("levelup");
const MemDown = require("memdown");
const subleveldown = require("subleveldown");

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}

describe("Tiny Store Level", () => {
  it("works", async () => {
    const db = await levelup(new MemDown());
    const store = await createStore(
      subleveldown(db, randomString(), { valueEncoding: "json" }),
      "id"
    );
    const id = randomString();
    await store.add({ id, hello: "world" });
    const x = await store.findOne(id);
    expect(x).toEqual({ hello: "world", id: id });
    const many = await store.findMany();
    expect(
      many.find(x => x.id === id), // filter, find ...etc
    ).toEqual({ hello: "world", id: id });
    await db.close(); // 13ms
  });
});
