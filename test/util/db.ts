import MemDown from "memdown";
import LevelUp from "levelup";

const db = LevelUp(MemDown());

export default db;
