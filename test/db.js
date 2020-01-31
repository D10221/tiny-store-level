const levelup = require("levelup");
const MemDown = require("memdown");
/** @type {import("levelup").LevelUp} */
const db = levelup(new MemDown());
module.exports = db;
