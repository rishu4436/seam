export class SeamTransportError extends Error {
  readonly code = "TRANSPORT";
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SeamTransportError";
  }
}

export class SeamBlockedError extends Error {
  readonly code = "BLOCKED";
  constructor(
    message: string,
    readonly blockers: string[],
  ) {
    super(message);
    this.name = "SeamBlockedError";
  }
}
