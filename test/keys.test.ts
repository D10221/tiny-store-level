import keyEncoder from "../src/keys"
import randomString from "./util/random-string";
import { MemDb } from "../src";
import { toPromise, reduce } from "../src/streams";

const db = MemDb();

describe("key encoder", () => {
    it("scopes", async () => {
        await Promise.all(
            [randomString(), randomString(), randomString()]
                .map((xName, i) =>
                    db.put(`${xName}/${randomString()}`, { index: i }))
        );
        const { scopedStream } = keyEncoder(randomString());
        const stream = scopedStream(db);
        const getAll = toPromise<any,any>(reduce, []);
        const scoped = await getAll(stream);
        expect(scoped).toMatchObject([]);
        const all = await getAll(db.createReadStream());
        expect(all.length).toBe(3);
    })
})