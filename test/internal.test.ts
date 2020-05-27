import { isValidID, ID_MAX_VALUE } from "../src/internal";

function expectValidID(expected: boolean, value: string) {
  if (isValidID(value) !== expected) {
    throw new Error(`Expected ${value} to be valid=${expected}`);
  }
}

const chars = `\`'",.;:<>?/{}[]()_-=+*&^%$#@!~\\/`;
const numbers = "0123456789";
const alpha = "abcdefghijklmniopqrstuvwxyz";

describe("isValidID", () => {
  it("Checks Length", () => {
    expect(isValidID("a".repeat(65), /\w+/)).toBe(false);
  });
  it("Checks max value", () => {
    expect(isValidID(ID_MAX_VALUE, /\w+/)).toBe(false);
  });
  it("Accepts idtest", () => {
    expect(isValidID("a", /\d+/)).toBe(false);
    expect(isValidID("", { test: () => true })).toBe(true);
  });
  it("use default param", () => {
    // to not throw: undefined -> defaults
    expect(isValidID("", undefined as any)).toBe(false);
    expect(isValidID("b", undefined as any, "a")).toBe(false);
  });
  it("throws", () => {
    expect(() => isValidID("", null as any)).toThrow(Error);
    expect(() => isValidID("", false as any)).toThrow(Error);
  });
  it("Valid id", () => {
    for (const c of chars) {
      expectValidID(false, c);
      for (const n of numbers) {
        for (const a of alpha) {
          expectValidID(false, c + n + a);
          expectValidID(false, a + n + c);
          expectValidID(false, c + n + c);

          expectValidID(false, c + a);
          expectValidID(false, c + n);
          expectValidID(false, a + c);
          expectValidID(false, n + c);

          expectValidID(true, a + n + a);
          expectValidID(true, n + a);
          expectValidID(true, a + n);
        }
      }
    }
    expect(isValidID("")).toBe(false);
    expect(isValidID(" ")).toBe(false);
    expect(isValidID(null)).toBe(false);
    expect(isValidID(undefined)).toBe(false);
    expect(isValidID(1)).toBe(false);
    expect(isValidID({})).toBe(false);
    expect(isValidID(function () {})).toBe(false);
  });

  it("maxPrimaryKeyValue", () => {
    expect(
      ID_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_",
    ).toBe(true);
    expect(
      ID_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ9",
    ).toBe(true);
    expect(
      ID_MAX_VALUE >
        "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ0",
    ).toBe(true);
    expect(
      ID_MAX_VALUE >
        "_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    ).toBe(true);
    expect(
      ID_MAX_VALUE >
        "9ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    ).toBe(true);
  });
});
