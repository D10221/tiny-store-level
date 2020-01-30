const { default: createStore } = require("../dist");
const encoding = require("encoding-down");
const levelup = require("levelup");
const MemDown = require("memdown");

const MemDb = () => levelup(encoding(new MemDown(), { valueEncoding: "json" }));

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}
async function run() {
  const store = createStore(MemDb(), randomString());
  await store.add({ id: "1", name: "1" });
  const loopCount = 10000;
  for (let i = 0; i < loopCount; i++) {
    await store.add({ id: `indexed${i}`, name: `x${i}` });
  }
  const one = 9999;
  await store.findOne(`indexed${one}`);
  await store.findMany();
}
run();
