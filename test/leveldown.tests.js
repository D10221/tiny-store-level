const { createStore } = require("../");
const suite = require("abstract-leveldown/test");
const memdown = require("memdown");
const encoding = require("encoding-down");
const tape = require("tape");
const subleveldown = require("subleveldown");
/**
 * partial compliance
 * Same as subleveldown?
 * # tests 312
 * # pass  39
 * # fail  273
 */
suite({
  test: tape,
  factory: () =>
    createStore(
      subleveldown(encoding(memdown()), "test"),
      "id", 
      {idtest: () => true }
    ),
  // Unsupported features
  seek: false,
  createIfMissing: false,
  errorIfExists: false,
  // Opt-in to new clear() tests
  clear: true,
});
