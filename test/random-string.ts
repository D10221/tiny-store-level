import { randomBytes } from "crypto";
export default function randomString(length = 16, enc = "hex") {
  return randomBytes(length).toString(enc);
}
