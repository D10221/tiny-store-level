import { isValidID, ID_MAX_VALUE } from "../src/internal";

function expectValidID(expected: boolean, value: string) {
  if (isValidID(value) !== expected) {
    throw new Error(`Expected ${value} to be valid=${expected}`);
  }
}

const chars = `\`'",.;:<>?/{}[]()_-=+*&^%$#@!~\\/`;
const numbers = "0123456789";
const alpha = "abcdefghijklmniopqrstuvwxyz";

describe("isValidID (internal)", () => {
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
    expect(isValidID(function() {})).toBe(false);
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
