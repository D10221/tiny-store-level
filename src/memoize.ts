const memoize = <P, R>(f: (arg: P) => R) => {
  let cache: any[] = [undefined, undefined];
  return (arg: P): R => {
    if (arg === cache[0]) return cache[1];
    cache = [arg, f(arg)];
    return cache[1];
  };
};
export default memoize;
