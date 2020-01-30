export const isNullOrUndefined = (x: any): boolean =>
  x === null || x === undefined;
export const hasValue = (x: any) => !isNullOrUndefined(x);
export const isFunction = (x: any) => typeof x === "function";
export const arrify = <T>(x: T | T[]): T[] => {
  return isNullOrUndefined(x) ? [] : Array.isArray(x) ? x : [x];
};
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
      let result: X[] = []
      stream.on("data", chunk => {
        result.push(chunk)
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