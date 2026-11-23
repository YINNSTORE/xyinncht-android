import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    ADMIN_JWT_SECRET: z.string().min(32),
    TOTP_ENC_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'harus 64 karakter hex'),
    OTP_HMAC_SECRET: z.string().min(8),
    OTP_PROVIDER: z.enum(['dev', 'twilio', 'disabled']).default('dev'),
    OTP_DEV_CODE: z.string().regex(/^\\d{6}$/).optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_VERIFY_SID: z.string().optional(),
    GUEST_LOGIN_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    GUEST_ACCESS_CODE: z.string().min(16).optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
    TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    PUSH_PREVIEW: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  })
  .superRefine((c, ctx) => {
    if (c.NODE_ENV === 'production' && c.OTP_PROVIDER === 'dev') {
      ctx.addIssue({ code: 'custom', message: 'OTP_PROVIDER=dev tidak boleh di produksi; gunakan twilio atau disabled' });
    }
    if (c.OTP_PROVIDER === 'twilio' && !(c.TWILIO_ACCOUNT_SID && c.TWILIO_AUTH_TOKEN && c.TWILIO_VERIFY_SID)) {
      ctx.addIssue({ code: 'custom', message: 'Twilio belum lengkap (SID, token, Verify SID)' });
    }
    if (c.GUEST_LOGIN_ENABLED && !c.GUEST_ACCESS_CODE) {
      ctx.addIssue({ code: 'custom', message: 'GUEST_ACCESS_CODE wajib diisi saat login beta diaktifkan' });
    }
    if (c.JWT_SECRET === c.ADMIN_JWT_SECRET) {
      ctx.addIssue({ code: 'custom', message: 'JWT_SECRET dan ADMIN_JWT_SECRET harus berbeda' });
    }
  });

export function loadConfig(env = process.env) {
  const r = schema.safeParse(env);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`).join('\\n');
    throw new Error('Konfigurasi tidak valid:\\n' + msg);
  }
  return r.data;
}
