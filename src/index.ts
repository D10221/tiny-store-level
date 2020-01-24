import encoding from "encoding-down";
import levelup from "levelup";
import MemDown from "memdown";
import leveldown from "leveldown";

/** */
export const LevelDB = (location: string): any => levelup(encoding(new leveldown(location), {
  valueEncoding: "json"
}),
);
/** */
export const MemDb: any = (location?: string) => levelup(encoding(new MemDown(location), {
  valueEncoding: "json"
}));

export { default } from "./create-store";
export { default as mapOut } from "./map-out";
