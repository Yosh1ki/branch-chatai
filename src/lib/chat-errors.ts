export class ChatActionError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(
    message: string,
    status = 500,
    options: {
      code?: string
      details?: unknown
    } = {}
  ) {
    super(message)
    this.status = status
    this.code = options.code
    this.details = options.details
  }
}
