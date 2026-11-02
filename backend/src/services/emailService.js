'use strict';

const nodemailer = require('nodemailer');

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class EmailService {
  _createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secureSetting = process.env.SMTP_SECURE;
    const secure = secureSetting === undefined
      ? port === 465
      : secureSetting.toLowerCase() === 'true';

    if (!host || !user || !pass || !Number.isInteger(port) || port < 1) {
      throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD must be configured');
    }
    if (secureSetting !== undefined && !['true', 'false'].includes(secureSetting.toLowerCase())) {
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

  async sendThresholdNotification({ recipient, threshold, currentValue, warning, recordedAt }) {
    const timestamp = new Date(recordedAt).toISOString();
    const minimum = threshold.MinValue ?? 'Not configured';
    const maximum = threshold.MaxValue ?? 'Not configured';
    const unit = threshold.Unit ? ` ${threshold.Unit}` : '';
    const subject = `[${threshold.Severity}] Threshold alert: ${threshold.RegisterName} (#${threshold.ThresholdId})`;
    const text = [
      warning,
      `Minimum Value: ${minimum}${unit}`,
      `Maximum Value: ${maximum}${unit}`,
      `Current Value: ${currentValue}${unit}`,
      `Timestamp: ${timestamp}`,
    ].join('\n');
    const html = `<p><strong>${escapeHtml(warning)}</strong></p>
      <ul>
        <li><strong>Minimum Value:</strong> ${escapeHtml(minimum)}${escapeHtml(unit)}</li>
        <li><strong>Maximum Value:</strong> ${escapeHtml(maximum)}${escapeHtml(unit)}</li>
        <li><strong>Current Value:</strong> ${escapeHtml(currentValue)}${escapeHtml(unit)}</li>
        <li><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</li>
      </ul>`;

    const transporter = this._createTransporter();
    try {
      return await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: recipient,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw createSmtpError(error, process.env.SMTP_HOST, process.env.SMTP_PORT || 587);
    }
  }

  async sendTestEmail({ recipient, username }) {
    const sentAt = new Date().toISOString();
    const greeting = username ? `Hello ${username},` : 'Hello,';
    const text = `${greeting}\n\nThis is a test email from Modbus Monitor. Email delivery is configured correctly.\n\nSent at: ${sentAt}`;
    const html = `<p>${escapeHtml(greeting)}</p>
      <p>This is a test email from Modbus Monitor. Email delivery is configured correctly.</p>
      <p><strong>Sent at:</strong> ${escapeHtml(sentAt)}</p>`;

    const transporter = this._createTransporter();
    try {
      return await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: 'Modbus Monitor email test',
        text,
        html,
      });
    } catch (error) {
      throw createSmtpError(error, process.env.SMTP_HOST, process.env.SMTP_PORT || 587);
    }
  }
}

module.exports = new EmailService();
