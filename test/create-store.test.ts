import createStore from "../src";
import { sublevel } from "./level";
import { randomString } from "./util";
describe("create store", () => {
  test("level, id => store", () => {
    const level = sublevel(randomString());
    const store = createStore<{ id: string }>(level, "id");
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
  test("level, id, options => store", () => {
    const level = sublevel(randomString());
    const store = createStore<{ id: string }>(level, "id", {
      idtest: () => true,
    });
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
  test("level => id => store", () => {
    const level = sublevel(randomString());
    const store = createStore(level)<{ id: string }>("id");
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
  test("id =>  level => store", () => {
    const level = sublevel(randomString());
    const store = createStore<{ id: string }>("id")(level);
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
  test("id , options => level => store ", () => {
    const level = sublevel(randomString());
    const store = createStore<{ id: string }>("id", { idtest: () => true })(
      level,
    );
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
  test("no args", () => {
    const level = sublevel(randomString());
    const mkStore = createStore();
    const store = mkStore(level)<{ id: string }>("id", { idtest: () => true });
    expect(store.type).toBe("StoreOf<levelup,id>");
  });
});
