import { LevelUp } from "levelup";
import { IDTest, Store } from "./types";
import createStore from "./create-store";

export default function storeOf(): (
  level: LevelUp,
) => <T>(
  id: keyof T & string,
  options?: {
    idtest: IDTest<T>;
  },
) => Store<T>;
export default function storeOf(
  level: LevelUp,
): <T>(
  id: keyof T & string,
  options?: {
    idtest: IDTest<T>;
  },
) => Store<T>;
export default function storeOf<T>(
  id: keyof T & string,
  options?: {
    idtest: IDTest<T>;
  },
): (level: LevelUp) => Store<T>;
export default function storeOf<T>(
  level: LevelUp,
  id: keyof T & string,
  options?: {
    idtest: IDTest<T>;
  },
): Store<T>;
export default function storeOf(...args: any[]): any {
  if (!args.length) {
    return (level: LevelUp) => storeOf(level);
  }
  const [$1, $2, $3] = args;
  if ($1 && $2 && $3) return createStore<any>($1, $2, $3);
  if (typeof $2 === "string") {
    return createStore<any>($1, $2, $3);
  }
  if (typeof $1 === "string") {
    return (level: LevelUp) => {
      const store = createStore<any>(level, $1, $2);
      return store;
    };
  }
  return (id: any, options?: any) => {
    const store = createStore<any>($1, id, options);
    return store;
  };
}
