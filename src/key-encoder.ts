import { KeyEncoder } from "./types";
import { isValidPartitionName } from "./primaryKeys";

/**
 * Key encoder
 */
export default function keyEncoder(name: string): KeyEncoder {
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
};
