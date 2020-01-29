const { default: createStore } = require("../dist");
const {MemDb} = require("./util/level");

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}
async function run() {
  const store = createStore(MemDb(), randomString());
  await store.add({ _id_: "1", name: "1" });
  const loopCount = 10000;
  for (let i = 0; i < loopCount; i++) {
    await store.add({ _id_: `indexed${i}`, name: `x${i}` });
  }
  const one = 9999;
  await store.findOne(`indexed${one}`);
  await store.findMany();
}
run();
