import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';
import { randomToken } from '../lib/crypto.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

export default async function uploadRoutes(app) {
  const { cfg } = app;
  app.post('/uploads/image', { preHandler: app.requireUser, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    if (!(cfg.S3_ENDPOINT && cfg.S3_BUCKET && cfg.S3_ACCESS_KEY_ID && cfg.S3_SECRET_ACCESS_KEY && cfg.S3_PUBLIC_BASE_URL)) {
      throw new HttpError(501, 'uploads_disabled', 'Unggah gambar belum dikonfigurasi');
    }
    const { content_type, size } = parse(
      z.object({ content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']), size: z.number().int().min(1).max(MAX_BYTES) }),
      req.body,
    );
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: cfg.S3_ENDPOINT,
      credentials: { accessKeyId: cfg.S3_ACCESS_KEY_ID, secretAccessKey: cfg.S3_SECRET_ACCESS_KEY },
    });
    const key = `u/${req.user.id}/${randomToken(12)}.${EXT[content_type]}`;
    const upload_url = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: cfg.S3_BUCKET, Key: key, ContentType: content_type, ContentLength: size }),
      { expiresIn: 300 },
    );
    return { upload_url, public_url: `${cfg.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`, headers: { 'content-type': content_type } };
  });
}
