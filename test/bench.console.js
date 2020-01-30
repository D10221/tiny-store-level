const { default: createStore } = require("../dist");
const encoding = require("encoding-down");
const levelup = require("levelup");
const MemDown = require("memdown");

const MemDb = () => levelup(encoding(new MemDown(), { valueEncoding: "json" }));

const assert = require("assert");

function randomString() {
  return require("crypto")
    .randomBytes(16)
    .toString("hex");
}

async function run() {
  const loopCount = 10000;
  const store = createStore(MemDb(), randomString());
  {
    await (() => {
      console.time("add:1");
      return store
        .add({ id: "1", name: "1" }) //
        .then(console.timeEnd("add:1"));
    })();
  }
  {
    console.time(`add:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.add({ id: `indexed${i}`, name: `x${i}` });
    }
    console.timeEnd(`add:x${loopCount}`);
    {
      const one = 9999;
      console.time(`findOne:${one}`);
      const x = await store.findOne(`indexed${one}`).then(x => {
        console.timeEnd(`findOne:${one}`);
        return x;
      });
      assert.equal(x.name, `x${one}`);
    }
    {
      console.time(`findMany:${loopCount}`);
      const x = await store.findMany();
      assert.equal(x.length, loopCount + 1);
      console.timeEnd(`findMany:${loopCount}`);
    }
  }
}
run();
