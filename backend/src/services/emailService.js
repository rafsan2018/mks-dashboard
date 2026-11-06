'use strict';

const nodemailer = require('nodemailer');
const { getEmailConfig } = require('../config/email');
const { renderEmail } = require('../utils/emailTemplate');

function createSmtpError(error, host, port) {
  const authenticationFailed = error.responseCode === 535 ||
    error.code === 'EAUTH' ||
    /535\s+5\.7\.8|authentication failed|invalid login/i.test(error.message);

  if (authenticationFailed) {
    const wrapped = new Error(
      'The SMTP server rejected the login. Check SMTP_USER and SMTP_PASSWORD, and verify ' +
      'that this mailbox allows SMTP authentication. If the provider requires an app password, use it instead.'
    );
    wrapped.statusCode = 502;
    wrapped.code = 'SMTP_AUTH_FAILED';
    return wrapped;
  }

  const greetingTimeout = error.code === 'ETIMEDOUT' &&
    (error.command === 'CONN' || /greeting never received/i.test(error.message));

  if (!greetingTimeout) return error;

  const wrapped = new Error(
    `The SMTP server at ${host}:${port} did not send its greeting. Verify SMTP_HOST, ` +
    'SMTP_PORT, and SMTP_SECURE, and confirm outbound SMTP is allowed by the server network. ' +
    'Use port 465 with SMTP_SECURE=true, or port 587 with SMTP_SECURE=false.'
  );
  wrapped.statusCode = 503;
  wrapped.code = 'SMTP_GREETING_TIMEOUT';
  return wrapped;
}

// Badge / value colours per threshold severity in the HTML template
const SEVERITY_COLORS = {
  Critical: { color: '#b42318', background: '#fef3f2' },
  Warning:  { color: '#b54708', background: '#fffaeb' },
  Info:     { color: '#175cd3', background: '#eff8ff' },
};

class EmailService {
  // SMTP settings come from src/config/email.js (hardcoded values) or backend/.env
  _createTransporter() {
    const { host, port, user, password: pass, secure: secureSetting } = getEmailConfig();
    const secureText = secureSetting === null || secureSetting === undefined ? null : String(secureSetting).toLowerCase();
    const secure = secureText === null ? port === 465 : secureText === 'true';

    if (!host || !user || !pass || !Number.isInteger(port) || port < 1) {
      const error = new Error(
        'Email is not configured. Set the SMTP host, port, user and password in ' +
        'backend/src/config/email.js or in backend/.env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD), then restart the backend.'
      );
      error.statusCode = 503;
      error.code = 'SMTP_NOT_CONFIGURED';
      throw error;
    }
    if (secureText !== null && !['true', 'false'].includes(secureText)) {
      throw new Error('SMTP_SECURE must be either true or false');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  // Content: src/templates/email/threshold-alert.html + threshold-alert.txt
  async sendThresholdNotification({ recipient, threshold, currentValue, warning, recordedAt }) {
    const colors = SEVERITY_COLORS[threshold.Severity] || SEVERITY_COLORS.Warning;
    const { subject, text, html } = renderEmail('threshold-alert', {
      severity: threshold.Severity,
      severityColor: colors.color,
      severityBackground: colors.background,
      thresholdId: threshold.ThresholdId,
      registerName: threshold.RegisterName,
      warning,
      currentValue,
      minimum: threshold.MinValue ?? 'Not configured',
      maximum: threshold.MaxValue ?? 'Not configured',
      unit: threshold.Unit ? ` ${threshold.Unit}` : '',
      timestamp: new Date(recordedAt).toISOString(),
    });

    const transporter = this._createTransporter();
    try {
      return await transporter.sendMail({
        from: getEmailConfig().from,
        to: recipient,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw createSmtpError(error, getEmailConfig().host, getEmailConfig().port);
    }
  }

  // Content: src/templates/email/test-email.html + test-email.txt
  async sendTestEmail({ recipient, username }) {
    const { subject, text, html } = renderEmail('test-email', {
      greeting: username ? `Hello ${username},` : 'Hello,',
      username: username || '',
      sentAt: new Date().toISOString(),
    });

    const transporter = this._createTransporter();
    try {
      return await transporter.sendMail({
        from: getEmailConfig().from,
        to: recipient,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw createSmtpError(error, getEmailConfig().host, getEmailConfig().port);
    }
  }
}

module.exports = new EmailService();
