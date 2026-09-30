/** An error whose message is safe to show to the person who made the request. */
export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message, code = 'bad_request') => new HttpError(400, code, message);
export const forbidden = (message = 'You can’t do that.', code = 'forbidden') => new HttpError(403, code, message);
export const notFound = (message = 'Not found.', code = 'not_found') => new HttpError(404, code, message);
export const conflict = (message, code = 'conflict') => new HttpError(409, code, message);
export const unavailable = (message, code = 'unavailable') => new HttpError(503, code, message);
