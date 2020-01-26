import { KeyEncoder } from "./types";

/**
 * Key encoder
 */
export const keyEncoder = (name: string): KeyEncoder => {
  const regex = new RegExp(`^${name}\/.*`, "i");
  return {
    isMatch(key: Buffer | string) {
      if (typeof key === "string")
        return regex.test(key);
      return regex.test(key.toString());
    },
    decode(key: string | Buffer) {
      if (typeof key === "string")
        return key.split(`${name}/`)[1];
      return key.toString().split(`${name}/`)[1];
    },
    encode(id: string) {
      return `${name}/${id}`;
    },
  };
};
