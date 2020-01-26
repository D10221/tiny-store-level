export default class SchemaError extends Error {
  constructor(message: string) {
    super(message);
  }
}