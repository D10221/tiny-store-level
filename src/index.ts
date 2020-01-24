import encoding from "encoding-down";
import levelup from "levelup";
import MemDown from "memdown";
import leveldown from "leveldown";
import { LevelLike } from "./types";
/** */
export const LevelDB = (location: string): LevelLike =>
  levelup(
    encoding(new leveldown(location), {
      valueEncoding: "json",
    }),
  );
/** */
export const MemDb = (location?: string): LevelLike =>
  levelup(
    encoding(new MemDown(location), {
      valueEncoding: "json",
    }),
  );
export { default, CreateStore } from "./create-store";
export { default as mapOut } from "./map-out";
export * from "./types";
