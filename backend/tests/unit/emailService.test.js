'use strict';

const nodemailer = require('nodemailer');
const emailService = require('../../src/services/emailService');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASSWORD = 'smtp-password';
    process.env.EMAIL_FROM = 'Modbus Monitor <alerts@example.com>';
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
    });
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('sends an email with all dynamic threshold values and timestamp', async () => {
    const transport = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
    };
    nodemailer.createTransport.mockReturnValue(transport);

    await emailService.sendThresholdNotification({
      recipient: 'operator@example.com',
      threshold: {
        Severity: 'Critical',
        ThresholdId: 7,
        RegisterName: 'Tank Level',
        MinValue: 5,
        MaxValue: 90,
        Unit: '%',
      },
      currentValue: 95,
      warning: 'Warning: Threshold #7 for Tank Level is above its maximum of 90.',
      recordedAt: '2026-10-29T10:00:00.000Z',
    });

    const message = transport.sendMail.mock.calls[0][0];
    expect(message.to).toBe('operator@example.com');
    expect(message.text).toContain('Warning: Threshold #7 for Tank Level is above its maximum of 90.');
    expect(message.text).toContain('Minimum Value: 5 %');
    expect(message.text).toContain('Maximum Value: 90 %');
    expect(message.text).toContain('Current Value: 95 %');
    expect(message.text).toContain('Timestamp: 2026-10-29T10:00:00.000Z');
  });

  test('sends a test message to the supplied profile recipient', async () => {
    const transport = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-1' }),
    };
    nodemailer.createTransport.mockReturnValue(transport);

    await emailService.sendTestEmail({
      recipient: 'operator@example.com',
      username: 'operator',
    });

    const message = transport.sendMail.mock.calls[0][0];
    expect(message.to).toBe('operator@example.com');
    expect(message.subject).toBe('Modbus Monitor email test');
    expect(message.text).toContain('Hello operator,');
    expect(message.text).toContain('Email delivery is configured correctly.');
  });

  test('uses implicit TLS by default for SMTP port 465', async () => {
    process.env.SMTP_PORT = '465';
    delete process.env.SMTP_SECURE;

    emailService._createTransporter();

    expect(nodemailer.createTransport).toHaveBeenLastCalledWith(expect.objectContaining({
      port: 465,
      secure: true,
    }));
  });

  test('converts an environment SMTP port string to a number', async () => {
    process.env.SMTP_PORT = '587';

    emailService._createTransporter();

    expect(nodemailer.createTransport).toHaveBeenLastCalledWith(expect.objectContaining({
      port: 587,
      secure: false,
    }));
  });

  test('explains how to fix an SMTP greeting timeout', async () => {
    const transport = {
      sendMail: jest.fn().mockRejectedValue(Object.assign(
        new Error('Greeting never received'),
        { code: 'ETIMEDOUT', command: 'CONN' }
      )),
    };
    nodemailer.createTransport.mockReturnValue(transport);

    await expect(emailService.sendTestEmail({
      recipient: 'operator@example.com',
      username: 'operator',
    })).rejects.toMatchObject({
      statusCode: 503,
      code: 'SMTP_GREETING_TIMEOUT',
      message: expect.stringContaining('Use port 465 with SMTP_SECURE=true'),
    });
  });

  test('explains an SMTP authentication rejection without exposing server details', async () => {
    const transport = {
      sendMail: jest.fn().mockRejectedValue(Object.assign(
        new Error('Invalid login: 535 5.7.8 Error: authentication failed'),
        { code: 'EAUTH', responseCode: 535 }
      )),
    };
    nodemailer.createTransport.mockReturnValue(transport);

    await expect(emailService.sendTestEmail({
      recipient: 'operator@example.com',
      username: 'operator',
    })).rejects.toMatchObject({
      statusCode: 502,
      code: 'SMTP_AUTH_FAILED',
      message: expect.stringContaining('Check SMTP_USER and SMTP_PASSWORD'),
    });
  });
});
