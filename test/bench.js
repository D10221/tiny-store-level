const { default: createStore } = require("../dist");
const levelup = require("levelup");
const MemDown = require("memdown");
const subleveldown = require("subleveldown");

const MemDb = () => levelup(new MemDown());

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}
async function run() {
  const store = createStore(MemDb());
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
run(subleveldown(
  MemDb(), 
  randomString(), 
  { valueEncoding: "json" }));  