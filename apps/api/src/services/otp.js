import { hmacOtp, randomOtp, safeEqualHex } from '../lib/crypto.js';

const MAX_ATTEMPTS = 5;

// Penyedia OTP: 'dev' (kode lokal, hanya non-produksi) atau 'twilio' (Verify API).
export function createOtp({ cfg, db, fetchImpl = fetch, log = console }) {
  const twilioAuth = () =>
    'Basic ' + Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64');
  const twilioUrl = (path) => `https://verify.twilio.com/v2/Services/${cfg.TWILIO_VERIFY_SID}/${path}`;

  async function withinLimits(phone, ip) {
    const a = await db.query(
      `select count(*)::int as c from otp_requests where phone = $1 and created_at > now() - interval '10 minutes'`,
      [phone],
    );
    if (a.rows[0].c >= 3) return false;
    if (ip) {
      const b = await db.query(
        `select count(*)::int as c from otp_requests where ip = $1 and created_at > now() - interval '1 hour'`,
        [ip],
      );
      if (b.rows[0].c >= 10) return false;
    }
    return true;
  }

  async function request(phone, ip) {
    if (!(await withinLimits(phone, ip))) return { ok: false, reason: 'rate_limited' };
    if (cfg.OTP_PROVIDER === 'twilio') {
      await db.query(
        `insert into otp_requests (phone, code_hash, expires_at, ip) values ($1, 'twilio', now() + interval '10 minutes', $2)`,
        [phone, ip ?? null],
      );
      const res = await fetchImpl(twilioUrl('Verifications'), {
        method: 'POST',
        headers: { authorization: twilioAuth(), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      });
      if (!res.ok) {
        log.error?.('Twilio gagal mengirim OTP', res.status);
        return { ok: false, reason: 'provider_error' };
      }
      return { ok: true };
    }
    const code = cfg.OTP_DEV_CODE ?? randomOtp();
    await db.query(
      `insert into otp_requests (phone, code_hash, expires_at, ip) values ($1, $2, now() + interval '5 minutes', $3)`,
      [phone, hmacOtp(cfg.OTP_HMAC_SECRET, phone, code), ip ?? null],
    );
    if (!cfg.OTP_DEV_CODE) log.info?.(`[OTP dev] ${phone} => ${code}`);
    return { ok: true };
  }

  async function verify(phone, code) {
    if (cfg.OTP_PROVIDER === 'twilio') {
      const res = await fetchImpl(twilioUrl('VerificationCheck'), {
        method: 'POST',
        headers: { authorization: twilioAuth(), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Code: code }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      return json.status === 'approved';
    }
    const { rows } = await db.query(
      `select id, code_hash from otp_requests
       where phone = $1 and consumed_at is null and expires_at > now() and attempts < $2
       order by created_at desc limit 1`,
      [phone, MAX_ATTEMPTS],
    );
    const row = rows[0];
    if (!row) return false;
    await db.query('update otp_requests set attempts = attempts + 1 where id = $1', [row.id]);
    if (!safeEqualHex(row.code_hash, hmacOtp(cfg.OTP_HMAC_SECRET, phone, code))) return false;
    await db.query('update otp_requests set consumed_at = now() where id = $1', [row.id]);
    return true;
  }

  return { request, verify };
}
