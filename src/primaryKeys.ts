/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
 * 0xDBFF = higher bound
 */
export const PRIMARY_KEY_MAX_VALUE = String.fromCharCode(0xDBFF).repeat(64);
/** forcing alphanumeric will enable easier gt & lt and reserved keys like $index? */
export function isValidPrimaryKey(x: any) {
  return typeof x === "string" && /^[a-zA-Z0-9]+$/.test(x);
}
export function isValidPartitionName(x: any) {
  return typeof x === "string" && /^[a-zA-Z0-9_-]+$/.test(x) && x < PRIMARY_KEY_MAX_VALUE;
}
