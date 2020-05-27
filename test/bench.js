const { createStore } = require("../");
const assert = require("assert");

function randomString(length = 16, enc = "hex") {
  return require("crypto").randomBytes(length).toString(enc);
}

const noop = () => {};
const silent = process.argv.indexOf("--silent") !== -1;
const time = silent ? noop : console.time.bind(console);

const timeEnd = silent ? noop : console.timeEnd.bind(console);
const log = silent ? noop : console.log.bind(console);
const error = silent ? noop : console.error.bind(console);

async function run(level) {
  try {
    const loopCount = 10000;

    const store = createStore(level, "id");
    /** Warmup */
    {
      const id = randomString();
      time("level:put:one");
      await level.put(id, {
        id,
      });
      timeEnd("level:put:one");
      const x = await store.get(id);
      assert.equal(x.id, id);
    }
    {
      const id = randomString();
      time("store:level:put:one");
      await store.put(id, {
        id,
      });
      timeEnd("store:level:put:one");
      const x = await store.get(id);
      assert.equal(x.id, id);
    }
    {
      time("level:clear");
      await level.clear();
      timeEnd("level:clear");
    }
    /** Warmup:end */
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
      time(`update:x${loopCount}`);
      for (let i = 0; i < loopCount; i++) {
        await store.update({ id: `indexed${i}`, name: `x${i}!` });
      }
      timeEnd(`update:x${loopCount}`);
    }
    {
      const one = 9999;
      time(`get:#${one}`);
      const x = await store.get(`indexed${one}`).then((x) => {
        timeEnd(`get:#${one}`);
        return x;
      });
      assert.equal(x.name, `x${one}!`);
    }
    {
      time("level:stream");
      const ret = await new Promise((resolve, reject) => {
        const stream = level.createReadStream();
        const result = [];
        stream.on("data", (data) => {
          result.push(data);
        });
        stream.on("end", () => {
          resolve(result);
        });
        stream.on("error", (error) => {
          reject(error);
        });
      });
      timeEnd("level:stream");
      assert.equal(ret.length, loopCount);
    }
    {
      time(`store:level:stream(${loopCount})`);
      const ret = await new Promise((resolve, reject) => {
        const stream = store.createReadStream();
        const result = [];
        stream.on("data", (data) => {
          result.push(data);
        });
        stream.on("end", () => {
          resolve(result);
        });
        stream.on("error", (error) => {
          reject(error);
        });
      });
      timeEnd(`store:level:stream(${loopCount})`);
      assert.equal(ret.length, loopCount);
    }
    {
      time(`find:${loopCount}`);
      const x = await store.find("*");
      timeEnd(`find:${loopCount}`);
      assert.equal(x.length, loopCount);
    }
    {
      time("find:query");
      const found = await store.find({
        name: { $in: ["x9999!"] },
      });
      timeEnd("find:query");
      assert.equal(found[0].name, "x9999!");
    }
    {
      time("find:filter");
      const toFind = "x9999!";
      const found = await store.find((x) => x.name === toFind);
      timeEnd("find:filter");
      assert.equal(found[0].name, toFind);
    }
    {
      const id = randomString();
      time("set:one");
      await store.set({
        id,
      });
      timeEnd("set:one");
      const x = await store.get(id);
      assert.equal(x.id, id);
    }
    {
      const id = randomString();
      time("level:put:one");
      await level.put(id, {
        id,
      });
      timeEnd("level:put:one");
      const x = await store.get(id);
      assert.equal(x.id, id);
    }
    {
      const id = randomString();
      time("store:level:put:one");
      await store.put(id, {
        id,
      });
      timeEnd("store:level:put:one");
      const x = await store.get(id);
      assert.equal(x.id, id);
    }
    {
      const id = "9998";
      time(`remove:filter:${id}`);
      const ret = await store
        .remove((x) => x.id === `indexed${id}`)
        .then((n) => {
          timeEnd(`remove:filter:${id}`);
          return n;
        });
      assert.equal(ret, 1, `Failed to remove ${id}`);
    }
    {
      const id = "9999";
      time(`remove:query:${id}`);
      const ret = await store
        .remove({ id: { $in: [`indexed${id}`] } })
        .then((n) => {
          timeEnd(`remove:query:${id}`);
          return n;
        });
      assert.equal(ret, 1, `Failed to remove ${id}`);
    }
  } catch (error) {
    return Promise.reject(error);
  }
}
log("...");
time("run");

run(require("./level").sublevel(randomString()))
  .then(() => {
    timeEnd("run");
    log(require("chalk").green("OK"));
  })
  .catch((err) => {
    timeEnd("run");
    error(require("chalk").red(err.message || "Unkown Error"));
    process.exit(-1);
  });
