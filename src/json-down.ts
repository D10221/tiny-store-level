/**
 * All credit to
 * https://github.com/toolness/jsondown
 * author : "Atul Varma <varmaa@gmail.com>",
 * license": "BSD"
 * tweaked by: d10221
 */
import os from "os";
import path from "path";
import mkdirp from "mkdirp";
import MemDOWN from "memdown";
import fs from "fs";

function serializeStore(store: Indexer) {
  var result: Indexer = {};
  store.forEach((key: string, value: any) => {
    result[key] = value;
  });
  return JSON.stringify(result);
}
type Indexer = { [key: string]: any };

function jsonToBatchOps(data: Indexer) {
  if (!data) {
    throw new Error();
  }
  return Object.keys(data).map(function(key) {
    var value = data[key];
    if (typeof value != "string") {
      try {
        value = new Buffer(value);
      } catch (e) {
        throw new Error(
          "Error parsing value " + JSON.stringify(value) + " as a buffer",
        );
      }
    }
    return { type: "put", key: key, value: value };
  });
}

function reviver(_k: any, v: any) {
  if (
    v != null &&
    typeof v === "object" &&
    "type" in v &&
    v.type === "Buffer" &&
    "data" in v &&
    Array.isArray(v.data)
  ) {
    return new Buffer(v.data);
  } else {
    return v;
  }
}

function noop() {}

type Callback = (...args: any[]) => any;

export default class JsonDOWN extends MemDOWN {
  _isLoadingFromFile: boolean;
  _isWriting: boolean;
  _queuedWrites: Callback[];
  _store: any;

  constructor(public location: string) {
    super(location);
    this._isLoadingFromFile = false;
    this._isWriting = false;
    this._queuedWrites = [];
  }
  _open(
    options: { createIfMissing?: boolean; errorIfExists?: boolean } = {},
    callback: (err?: any, x?: any) => any = noop,
  ) {
    var self = this;
    var loc =
      this.location.slice(-5) === ".json"
        ? this.location
        : path.join(this.location, "data.json");
    var separator = os.platform() === "win32" ? "\\" : "/";
    var subdir =
      this.location.slice(-5) === ".json"
        ? this.location
            .split(separator)
            .slice(0, -1)
            .join(separator)
        : this.location;

    mkdirp(subdir, function(errMkdirp: any) {
      if (errMkdirp) return callback(errMkdirp);

      fs.exists(loc, function(exists: any) {
        if (!exists && options.createIfMissing === false)
          callback(
            new Error(loc + " does not exist (createIfMissing is false)"),
          );
        else if (exists && options.errorIfExists)
          callback(new Error(loc + " exists (errorIfExists is true)"));
        else if (!exists) fs.open(loc, "w", callback);
        else
          fs.readFile(loc, { encoding: "utf-8", flag: "r" }, function(
            err: any,
            data: any,
          ) {
            if (err) return callback(err, data);
            try {
              data = JSON.parse(data, reviver);
            } catch (e) {
              return callback(
                new Error("Error parsing JSON in " + loc + ": " + e.message),
              );
            }
            self._isLoadingFromFile = true;
            try {
              try {
                self._batch(jsonToBatchOps(data), {}, noop);
              } finally {
                self._isLoadingFromFile = false;
              }
            } catch (e) {
              return callback(e);
            }
            callback(null, self);
          });
      });
    });
  }

  _close(cb?: Callback) {
    this._writeToDisk(() => {
      super._close(cb);
    });
  }

  _writeToDisk(cb: Callback = noop) {
    if (this._isWriting) {
      this._queuedWrites.push(cb);
      return;
    }
    this._isWriting = true;
    var loc =
      this.location.slice(-5) === ".json"
        ? this.location
        : path.join(this.location, "data.json");
    fs.writeFile(
      loc,
      serializeStore(this._store),
      { encoding: "utf-8" },
      function(this: any, err: any) {
        var queuedWrites = this._queuedWrites.splice(0);
        this._isWriting = false;
        if (queuedWrites.length)
          this._writeToDisk(function(err: any) {
            queuedWrites.forEach(function(cb: Callback = noop) {
              cb(err);
            });
          });
        cb(err);
      }.bind(this),
    );
  }
  _put(key: any, value: any, options: any, cb: any) {
    super._put(key, value, options, noop);
    if (!this._isLoadingFromFile) this._writeToDisk(cb);
  }
  _batch(array: any, options: any, cb: any) {
    super._batch(array, options, noop);
    if (!this._isLoadingFromFile) this._writeToDisk(cb);
  }
  _del(key: any, options: any, cb: any) {
    super._del(key, options, noop);
    this._writeToDisk(cb);
  }
}
