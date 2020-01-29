import { LevelUp } from "levelup";
import { Schema } from "./types";
import { Transform } from "stream";
/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
 * 0xDBFF = higher bound
 */

export const KEY_MAX_VALUE = String.fromCharCode(0xdbff).repeat(64);
/** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
export function isValidID(x: any): x is string {
  return typeof x === "string" && /^[a-zA-Z0-9]+$/.test(x);
}
export function isValidPartitionName(x: any): x is string {
  return (
    typeof x === "string" && /^[a-zA-Z0-9_-]+$/.test(x) && x < KEY_MAX_VALUE
  );
}
export class KeyError extends Error {
  constructor(message: string) {
    super(message);
  }
  static invalidOrMissingKey(key: string) {
    return new KeyError(`Invalid or missing key="${key}"`);
  }
  static invalidOrMissigID(key: string, id?: any) {
    return new KeyError(`Invalid or missing "${key}"="${id}"`);
  }
  static idExists(key: string, id: string) {
    return new KeyError(`Key/ID exists "${key}=${id}"`);
  }
  static idNotFound(id: string) {
    return new KeyError(`ID ${id} not Found`);
  }
}
/**
 * Key encoder
 */
export default function keyEncoder(partitionName: string) {

  if (!isValidPartitionName)
    throw new Error(`Patition name "${partitionName}" is Not valid`);

  const regex = new RegExp(`^${partitionName}\/.*`, "i");

  function getParts(x: string) {
    return x.toString().split("/");
  }
  
  const enc = {
    keyRoot: () => partitionName + "/",
    isMatch(key: Buffer | string) {
      if (typeof key === "string") return regex.test(key);
      return regex.test(key.toString());
    },
    decodeKey(key: string | Buffer): string {
      if (!key) {
        throw new Error("@param key {string|buffer} required");
      }
      if (typeof key !== "string") {
        return enc.decodeKey(key.toString());
      }
      const [root, id] = getParts(key);
      if (root !== partitionName) throw KeyError.invalidOrMissingKey(root);
      if (!isValidID(id)) throw KeyError.invalidOrMissigID(root, id);
      return id;
    },
    encodeKey(id: string) {
      if (getParts(id)[0] === partitionName) {
        throw new Error("Wtf");
      }
      return `${partitionName}/${id}`;
    },
    scopedStream(db: LevelUp) {
      return db
        .createReadStream({
          gt: enc.keyRoot(),
          lt: enc.encodeKey(KEY_MAX_VALUE),
        });
    }
  };
  return enc;
}
