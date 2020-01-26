/** */
export default function isNotFoundError(error: Error): error is Error {
  return error instanceof Error && error.name === "NotFoundError";
}
