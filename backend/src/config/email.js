'use strict';

/**
 * SMTP settings for every email the backend sends (Settings > Send test email, threshold alerts).
 *
 * Fill in the values below to hardcode them, OR set the same settings in backend/.env
 * (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM).
 * A value in .env always wins over the value written here.
 * Prefer putting the password in .env, so it is not stored in the source code.
 * Restart the backend after changing either one.
 */
const HARDCODED = {
  host: '',        // e.g. 'smtp.gmail.com', 'smtp.office365.com', 'mail.yourdomain.com'
  port: 587,       // 587 = STARTTLS, 465 = SSL
  secure: null,    // null = automatic (true for port 465, false otherwise), or true / false
  user: '',        // SMTP login, usually the full mailbox address
  password: '',    // SMTP password (Gmail / Microsoft 365 with 2FA: an app password)
  from: '',        // e.g. 'Modbus Monitor <alerts@yourdomain.com>'; empty = send as `user`
};

/** Effective SMTP settings: .env first, then the hardcoded values above. Read on every send. */
function getEmailConfig() {
  const env = process.env;
  const user = env.SMTP_USER || HARDCODED.user;

  return {
    host: env.SMTP_HOST || HARDCODED.host,
    port: Number(env.SMTP_PORT || HARDCODED.port),
    secure: env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : HARDCODED.secure,
    user,
    password: env.SMTP_PASSWORD || HARDCODED.password,
    from: env.EMAIL_FROM || HARDCODED.from || user,
  };
}

module.exports = { getEmailConfig };
