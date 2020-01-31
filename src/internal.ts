import { randomBytes } from "crypto";

export const isNullOrUndefined = (x: any): boolean =>
  x === null || x === undefined;
export const hasValue = (x: any) => !isNullOrUndefined(x);
export const isFunction = (x: any) => typeof x === "function";
export const arrify = <T>(x: T | T[]): T[] =>
  isNullOrUndefined(x) ? [] : Array.isArray(x) ? x : [x];
export const memoize = <P, R>(f: (arg: P) => R) => {
  let cache: any[] = [undefined, undefined];
  return (arg: P): R => {
    if (arg === cache[0]) return cache[1];
    cache = [arg, f(arg)];
    return cache[1];
  };
};
export function isNotFoundError(error: Error): error is Error {
  return error instanceof Error && error.name === "NotFoundError";
}
export const toPromise = <X>(stream: NodeJS.ReadableStream) =>
  new Promise<X[]>((resolve, reject) => {
    try {
      let result: X[] = [];
      stream.on("data", chunk => {
        result.push(chunk);
      });
      stream.on("error", error => {
        reject(error);
      });
      stream.on("end", () => {
        resolve(result);
        stream.readable = false;
      });
    } catch (error) {
      reject(error);
    }
  });
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`"${what}" Not Implemented`);
  }
}
export class KeyError extends Error {
  constructor(message: string) {
    super(message);
  }
  static invalidOrMissingKey(key: any) {
    return new KeyError(`Invalid or missing key="${key}"`);
  }
  static invalidOrMissigID(key: any, id?: any) {
    return new KeyError(`Invalid or missing "${key}"="${id}"`);
  }
  static idExists(key: any, id: string) {
    return new KeyError(`Key/ID exists "${key}=${id}"`);
  }
  static idNotFound(key: any, id?: any) {
    return new KeyError(`Key/ID Not Found"${key}=${id}" not found`);
  }
}
/** a long Value */
export const ID_MAX_VALUE = String.fromCharCode(0xdbff).repeat(64);
/** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
export function isValidID(
  x: any,
  regex: RegExp = /^[a-zA-Z0-9]+$/,
): x is string {
  return typeof x === "string" && regex.test(x) && x < ID_MAX_VALUE;
}
export function randomString(length = 16, enc = "hex") {
  return randomBytes(length).toString(enc);
}
