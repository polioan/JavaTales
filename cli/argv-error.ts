export type ArgvErrorOptions = {
  cause?: unknown
}

export class ArgvError extends Error {
  constructor(message: string, options?: ArgvErrorOptions | null) {
    const opt = options ?? {}

    super(
      message,
      opt.cause == null
        ? {}
        : {
            cause: opt.cause,
          }
    )

    this.name = 'ArgvError'
  }
}
