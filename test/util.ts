export function randomString(length = 16, enc = "hex") {
  return require("crypto").randomBytes(length).toString(enc);
}
