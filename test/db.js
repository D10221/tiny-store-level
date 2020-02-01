const levelup = require("levelup");
const memdown = require("memdown");
const leveldown = require("leveldown");
const path = require("path");
/** @type {import("levelup").LevelUp} */
module.exports = (() => {
  if (process.env.LEVELDOWN === "leveldown") {
    console.log("DOWN: leveldown")
    return levelup(leveldown(path.join(__dirname, "../testdb")));
  }
  console.log("DOWN: memdown")
  return levelup(memdown());
})();
