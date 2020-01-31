const { createStore } = require("../");
const levelup = require("levelup");
const MemDown = require("memdown");
const subleveldown = require("subleveldown");

function randomString(length = 16, enc = "hex") {
  return require("crypto").randomBytes(length).toString(enc);
}

describe("Package", () => {
  it("finds and runs built default export", async () => {
    const db = await levelup(new MemDown());
    const store = await createStore(
      "id",
      subleveldown(db, randomString(), { valueEncoding: "json" }),
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
