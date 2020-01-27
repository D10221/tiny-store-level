import encoding from "encoding-down";
import levelup from "levelup";
import MemDown from "memdown";
import leveldown from "leveldown";

export const LevelDB = (location: string) =>
  levelup(encoding(new leveldown(location), { valueEncoding: "json" }));
export const MemDb = () =>
  levelup(encoding(new MemDown(), { valueEncoding: "json" }));

export { default, CreateStore } from "./create-store";
export { default as mapOut } from "./map-out";
export * from "./types";
