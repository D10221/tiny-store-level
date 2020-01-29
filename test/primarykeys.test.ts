import { isValidID, isValidPartitionName, KEY_MAX_VALUE } from "../src/keys";

function expectValidPrimaryKey(expected: boolean, value: string) {
  if (isValidID(value) !== expected) {
    throw new Error(`Expected ${value} to be valid=${expected}`);
  }
}

const chars = `\`'",.;:<>?/{}[]()_-=+*&^%$#@!~`;
const numbers = "0123456789";
const alpha = "abcdefghijklmniopqrstuvwxyz";

describe("Primary Keys", () => {
  it("is Valid PrimaryKey", () => {
    for (const c of chars) {
      expectValidPrimaryKey(false, c);
      for (const n of numbers) {
        for (const a of alpha) {
          expectValidPrimaryKey(false, c + n + a);
          expectValidPrimaryKey(false, a + n + c);
          expectValidPrimaryKey(false, c + n + c);

          expectValidPrimaryKey(false, c + a);
          expectValidPrimaryKey(false, c + n);
          expectValidPrimaryKey(false, a + c);
          expectValidPrimaryKey(false, n + c);

          expectValidPrimaryKey(true, a + n + a);
          expectValidPrimaryKey(true, n + a);
          expectValidPrimaryKey(true, a + n);
        }
      }
    }
    expect(isValidID("")).toBe(false);
    expect(isValidID(" ")).toBe(false);
    expect(isValidID(null)).toBe(false);
    expect(isValidID(undefined)).toBe(false);
    expect(isValidID(1)).toBe(false);
    expect(isValidID({})).toBe(false);
    expect(isValidID(function() {})).toBe(false);
  });

  it("is Valid PartitionName", () => {
    expect(isValidPartitionName("")).toBe(false);
    expect(isValidPartitionName(" ")).toBe(false);
    expect(isValidPartitionName(null)).toBe(false);
    expect(isValidPartitionName(undefined)).toBe(false);
    expect(isValidPartitionName({})).toBe(false);
    expect(isValidPartitionName(function() {})).toBe(false);
    for (const c of Array(chars).filter(x => x !== "_" && x !== "-")) {
      expect(isValidPartitionName(c)).toBe(false);
      for (const n of numbers) {
        expect(isValidPartitionName(n)).toBe(true);
        for (const a of alpha) {
          expect(isValidPartitionName(a)).toBe(true);
          expect(isValidPartitionName(a + n + c)).toBe(false);
          expect(isValidPartitionName(n + c + a)).toBe(false);
          expect(isValidPartitionName(c + a)).toBe(false);
          expect(isValidPartitionName(c + n)).toBe(false);
          expect(isValidPartitionName(n + c)).toBe(false);
          expect(isValidPartitionName(a + c)).toBe(false);
        }
      }
    }
  });
  it("maxPrimaryKeyValue", () => {
    expect(
      KEY_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_",
    ).toBe(true);
    expect(
      KEY_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ9",
    ).toBe(true);
    expect(
      KEY_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ0",
    ).toBe(true);
    expect(
      KEY_MAX_VALUE >
        "_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    ).toBe(true);
    expect(
      KEY_MAX_VALUE >
        "9ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    ).toBe(true);
  });
});
