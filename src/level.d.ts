declare module "encoding-down" {
  const f: (...args: any[]) => any;
  export default f;
}
declare module "memdown" {
  class MemDOWN {
    constructor(location?: string);
    [key: string]: any;
  }
  export default MemDOWN;
}
