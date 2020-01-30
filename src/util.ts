import { Transform } from "stream";
export const isNullOrUndefined = (x: any): boolean => x === null || x === undefined;
export const hasValue = (x: any) => !isNullOrUndefined(x);
export const isFunction = (x: any) => typeof x === "function";
export const arrify = <T>(x: T | T[]): T[] => {
    return isNullOrUndefined(x) ? [] : Array.isArray(x) ? x : [x];
};
export type TransformFunction<X extends any = any> = (
    this: Transform,
    chunk: X,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void,
) => void;
export const makeTransform = (transform: TransformFunction) =>
    new Transform({
        objectMode: true,
        transform,
    });
export const memoize = <P, R>(f: (arg: P) => R) => {
    let cache: any[] = [undefined, undefined];
    return (arg: P): R => {
        if (arg === cache[0]) return cache[1];
        cache = [arg, f(arg)];
        return cache[1];
    };
};
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`"${what}" Not Implemented`);
  }
}

export type PromiseReducer<T, R> = (result: R, data: T) => Promise<R>;

export function concat<T>(
  condition: (x: T) => boolean,
): PromiseReducer<T, T[]> {
  return (result, data) => {
    return Promise.resolve(condition(data) ? [...result, data] : result);
  };
}
export function count<T>(
  action: (x: T) => void | Promise<void>,
): PromiseReducer<T, number> {
  return async (result, data) => {
    await action(data);
    return result + 1;
  };
}
export const toPromise = <Data, Result>(
  reduce: PromiseReducer<Data, Result>,
  acc: Result,
) => (stream: NodeJS.ReadableStream) =>
  new Promise<Result>((resolve, reject) => {
    try {
      let result = acc;
      stream.on("data", async data => {
        result = await reduce(result, data);
      });
      stream.on("error", error => {
        reject(error);
      });
      // stream.on("close", () => {});
      stream.on("end", () => {
        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
