import { memoize } from "./util";
import { LevelUp } from "levelup";

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
 * 0xDBFF = higher bound
 */
export const ID_MAX_VALUE = String.fromCharCode(0xdbff).repeat(64);
/** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
export function isValidID(x: any): x is string {
  return typeof x === "string" && /^[a-zA-Z0-9]+$/.test(x) && x < ID_MAX_VALUE;
}
export function isValidPartitionName(x: any): x is string {
  return typeof x === "string" && /^[a-zA-Z0-9_-]+$/.test(x);
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
function getParts(x: string) {
  return x.split("/");
}
/**
 * Key encoder
 */
export default function keyEncoder(partitionName: string) {
  if (!isValidPartitionName)
    throw new Error(`Patition name "${partitionName}" is Not valid`);
  const regex = new RegExp(`^${partitionName}\/.*`, "i");
  const test = memoize((s: string) => regex.test(s));
  const parts = memoize(getParts);
  const enc = {
    keyRoot: partitionName + "/",
    isMatch: memoize(test),
    decodeKey: memoize((key: string) => parts(key)[1]),
    encodeKey: memoize((id: string) => `${partitionName}/${id}`),
    scopedStream(db: LevelUp) {
      return db.createReadStream({
        gt: enc.keyRoot,
        lt: enc.encodeKey(ID_MAX_VALUE),
      });
    }
  };
  return enc;
}
