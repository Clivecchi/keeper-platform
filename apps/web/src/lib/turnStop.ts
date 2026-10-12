/** Client stop for an in-flight Dialog turn. The browser aborts the request. */

export function turnAbortError(message = "Stopped"): Error {
  const error = new Error(message)
  error.name = "AbortError"
  return error
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
