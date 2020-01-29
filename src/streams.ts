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
