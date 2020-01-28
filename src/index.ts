import encoding from "encoding-down";
import leveldown from "leveldown";
import levelup from "levelup";
import MemDown from "memdown";

export const LevelDB = (location: string) =>
  levelup(encoding(new leveldown(location), { valueEncoding: "json" }));
export const MemDb = () =>
  levelup(encoding(new MemDown(), { valueEncoding: "json" }));

export { default } from "./create-store";
export * from "./types";
