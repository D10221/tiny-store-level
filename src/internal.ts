export const isNullOrUndefined = <T>(
  x: T | null | undefined,
): x is null | undefined => x === null || x === undefined;

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
  static idExists(key: any, id?: any) {
    return new KeyError(`Key/ID exists "${key}=${id}"`);
  }
  static idNotFound(key: any, id?: any) {
    return new KeyError(`Key/ID Not Found"${key}=${id}" not found`);
  }
}

/** a long Value */
export const ID_MAX_VALUE = String.fromCharCode(0xdbff).repeat(64);

export const ID_REGEX = /^[a-zA-Z0-9]+$/;

export interface RegexLike {
  test(strng: string): boolean;
}

export function isValidID(
  x: any,
  regex: RegexLike = ID_REGEX,
  idMaxValue = ID_MAX_VALUE,
): x is string {
  return (
    typeof x === "string" &&
    regex.test(x) &&
    x.length < idMaxValue.length &&
    x < idMaxValue
  );
}
