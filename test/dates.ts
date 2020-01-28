export type DateType = Date | string | number | undefined;
//
export const toDate = (x: DateType): Date => {
  if (x instanceof Date) return x;
  if (typeof x === "number") return new Date(x);
  if (typeof x === "string") return new Date(x);
  throw new Error("Not Implemented");
};
