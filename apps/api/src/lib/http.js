import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HttpError(400, 'validation', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return r.data;
}

export function errorHandler(err, req, reply) {
  if (err instanceof HttpError) {
    return reply.status(err.status).send({ error: err.code, message: err.message });
  }
  if (err instanceof ZodError) {
    return reply.status(400).send({ error: 'validation', message: err.message });
  }
  if (err.statusCode === 429) {
    return reply.status(429).send({ error: 'rate_limited', message: 'Terlalu banyak permintaan' });
  }
  if (err.statusCode && err.statusCode < 500) {
    return reply.status(err.statusCode).send({ error: 'bad_request', message: err.message });
  }
  req.log.error(err);
  return reply.status(500).send({ error: 'internal', message: 'Terjadi kesalahan di server' });
}
