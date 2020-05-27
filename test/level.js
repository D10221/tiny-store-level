const levelup = require("levelup");
const memdown = require("memdown");
const leveldown = require("leveldown");
const subleveldown = require("subleveldown");
const encoding = require("encoding-down");
const path = require("path");
const noop = () => {};
const silent = process.argv.indexOf("--silent") !== -1;
const log = silent ? noop : console.log.bind(console);

const down = (subLevelName) => {
  if (process.env.LEVELDOWN === "leveldown") {
    log("DOWN: leveldown");
    return leveldown(path.join(__dirname, "../dbs", subLevelName || "testdb"));
  }
  log("DOWN: memdown");
  return memdown();
};

const dbs = {
  default: levelup(down()),
};

const sublevel = (subLevelName) => {
  switch (process.env.SUBLEVEL) {
    case "multilevel": {
      log("SUBLEVEL: multilevel");
      if (dbs[subLevelName]) return [dbs[subLevelName]];
      return (dbs[subLevelName] = levelup(
        encoding(down(subLevelName), { valueEncoding: "json" }),
      ));
    }
    default: {
      log("SUBLEVEL: subleveldown");
      return subleveldown(dbs.default, subLevelName, { valueEncoding: "json" });
    }
  }
};

module.exports = {
  sublevel,
};
