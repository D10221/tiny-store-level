import { Query } from "jsonquery";
/** Typescript helper on ambiguity */
const query = <T>(q: Query<T>): Query<T> => q;
export default query;
