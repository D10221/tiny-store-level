export type Reduce<T> = (result: T[], data: T) => Promise<T[]>;

export const reduce: Reduce<any> = (result, data) => {
  return Promise.resolve(data ? [...result, data] : result);
}

export const toPromise =
  <Data, Result>(reduce: (result: Result, data: Data) => Promise<Result>, acc: Result) =>
    (stream: NodeJS.ReadableStream) => new Promise<Result>((resolve, reject) => {
      try {
        let result = acc;
        stream.on("data", async (data) => {
          result = await reduce(result, data);
        });
        stream.on("error", error => {
          reject(error);
        });
        // stream.on("close", () => {});
        stream.on("end", () => {
          resolve(result);
        });
      }
      catch (error) {
        reject(error);
      }
    })