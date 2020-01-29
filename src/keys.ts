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
  static invalidOrMissig(key: string, id?: any) {
    return new KeyError(`Invalid or missing "${key}"="${id}"`);
  }
  static idExists(key: string, id: string) {
    return new KeyError(`Key exists "${key}=${id}"`);
  }
}
/**
 * Key encoder
 */
export default function keyEncoder(name: string) {
  if (!isValidPartitionName)
    throw new Error(`Patition name "${name}" is Not valid`);
  const regex = new RegExp(`^${name}\/.*`, "i");
  return {
    base: () => name + "/",
    isMatch(key: Buffer | string) {
      if (typeof key === "string") return regex.test(key);
      return regex.test(key.toString());
    },
    decode(key: string | Buffer) {
      if (typeof key === "string") return key.split(`${name}/`)[1];
      return key.toString().split(`${name}/`)[1];
    },
    encode(id: string) {
      return `${name}/${id}`;
    },
  };
}
