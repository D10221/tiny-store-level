const { createStore } = require("../dist");
const subleveldown = require("subleveldown");
const assert = require("assert");

function randomString(length = 16, enc = "hex") {
  return require("crypto")
    .randomBytes(length)
    .toString(enc);
}

const noop = () => {};
const silent = process.argv.indexOf("--silent") !== -1;
const time = silent ? noop : console.time.bind(console);
const timeEnd = silent ? noop : console.timeEnd.bind(console);
const log = silent ? noop : console.log.bind(console);

async function run(level) {
  const loopCount = 10000;

  const store = createStore("id", level);
  {
    await (() => {
      time("add:1");
      return store
        .add({ id: "1", name: "1" }) //
        .then(timeEnd("add:1"));
    })();
  }
  {
    time("remove:one");
    await store.remove("1");
    timeEnd("remove:one");
  }
  {
    time(`add:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.add({ id: `indexed${i}`, name: `x${i}` });
    }
    timeEnd(`add:x${loopCount}`);
  }
  {
    time(`remove:${loopCount}`);
    await store.remove("*");
    timeEnd(`remove:${loopCount}`);
  }
  {
    time(`add:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.add({ id: `indexed${i}`, name: `x${i}` });
    }
    timeEnd(`add:x${loopCount}`);
  }
  {
    const one = 9999;
    time(`findOne:${one}`);
    const x = await store.findOne(`indexed${one}`).then(x => {
      timeEnd(`findOne:${one}`);
      return x;
    });
    assert.equal(x.name, `x${one}`);
  }
  {
    time(`update:x${loopCount}`);
    for (let i = 0; i < loopCount; i++) {
      await store.update({ id: `indexed${i}`, name: `x${i}!` });
    }
    timeEnd(`update:x${loopCount}`);
  }
  {
    const one = 9999;
    time(`findOne:${one}`);
    const x = await store.findOne(`indexed${one}`).then(x => {
      timeEnd(`findOne:${one}`);
      return x;
    });
    assert.equal(x.name, `x${one}!`);
  }
  {
    time("sub-level:stream");
    const ret = await new Promise((resolve, reject) => {
      const stream = level.createReadStream();
      const result = [];
      stream.on("data", data => {
        result.push(data);
      });
      stream.on("end", () => {
        resolve(result);
      });
      stream.on("error", error => {
        reject(error);
      });
    });
    timeEnd("sub-level:stream");
    assert.equal(ret.length, loopCount);
  }
  {
    time("sub-level:stream");
    const ret = await new Promise((resolve, reject) => {
      const stream = level.createReadStream();
      const result = [];
      stream.on("data", data => {
        result.push(data);
      });
      stream.on("end", () => {
        resolve(result);
      });
      stream.on("error", error => {
        reject(error);
      });
    });
    timeEnd("sub-level:stream");
    assert.equal(ret.length, loopCount);
  }
  {
    time(`findMany:${loopCount}`);
    const x = await store.findMany();
    timeEnd(`findMany:${loopCount}`);
    assert.equal(x.length, loopCount);
  }
  {
    time("findMany:query");
    const found = await store.findMany({
      name: { $in: ["x9999!"] },
    });
    timeEnd("findMany:query");
    assert.equal(found[0].name, "x9999!");
  }
  {
    const id = randomString();
    time("set:one");
    await store.set({
      id,
    });
    timeEnd("set:one");
    const x = await store.findOne(id);
    assert.equal(x.id, id);
  }
  {
    const id = randomString();
    time("put:one");
    await store.put({
      id,
    });
    timeEnd("put:one");
    const x = await store.findOne(id);
    assert.equal(x.id, id);
  }
}
log("...");
time("run");
run(
  subleveldown(require("./db"), randomString(), { valueEncoding: "json" }),
).then(() => timeEnd("run"));
