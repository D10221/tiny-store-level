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
    console.time("remove:one");
    await store.remove("1");
    console.timeEnd("remove:one");
  }
  {
    console.time(`add:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.add({ id: `indexed${i}`, name: `x${i}` });
    }
    console.timeEnd(`add:x${loopCount}`);
  }
  {
    console.time(`remove:${loopCount}`);
    await store.remove("*");
    console.timeEnd(`remove:${loopCount}`)
  }
  {
    console.time(`add:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.add({ id: `indexed${i}`, name: `x${i}` });
    }
    console.timeEnd(`add:x${loopCount}`);
  }
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
    console.time(`update:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.update({ id: `indexed${i}`, name: `x${i}!` });
    }
    console.timeEnd(`update:x${loopCount}`);
  }
  {
    const one = 9999;
    console.time(`findOne:${one}`);
    const x = await store.findOne(`indexed${one}`).then(x => {
      console.timeEnd(`findOne:${one}`);
      return x;
    });
    assert.equal(x.name, `x${one}!`);
  }
  {
    console.time("sub-level:stream")
    const ret = await new Promise((resolve, reject) => {
      const stream = store.sublevel.createReadStream();
      const result = [];
      stream.on("data", data => {
        result.push(data)
      });
      stream.on("end", () => {
        resolve(result)
      });
      stream.on("error", (error) => {
        reject(error)
      });
    });
    console.timeEnd("sub-level:stream");
    assert.equal(ret.length, loopCount);
  }
  {
    console.time("sub-level:stream")
    const ret = await new Promise((resolve, reject) => {
      const stream = store.sublevel.createReadStream();
      const result = [];
      stream.on("data", data => {
        result.push(data)
      });
      stream.on("end", () => {
        resolve(result)
      });
      stream.on("error", (error) => {
        reject(error)
      });
    });
    console.timeEnd("sub-level:stream");
    assert.equal(ret.length, loopCount);
  }
  {
    console.time(`findMany:${loopCount}`);
    const x = await store.findMany();
    console.timeEnd(`findMany:${loopCount}`);
    assert.equal(x.length, loopCount);
  }
  {
    console.time("findMany:query");
    const found = await store.findMany({
      name: { $in: ["x9999!"]}
    });
    console.timeEnd("findMany:query");
    assert.equal(found[0].name, "x9999!");
  }
  {
    
  }
}
run();
