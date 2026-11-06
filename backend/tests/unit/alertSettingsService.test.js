'use strict';

const alertSettingsService = require('../../src/services/alertSettingsService');
const alertSettingsModel = require('../../src/models/alertSettingsModel');

jest.mock('../../src/models/alertSettingsModel');

const USERS = [
  { UserId: 1, Username: 'admin', PhoneNumber: '+60123456789', IsActive: 1 },
  { UserId: 2, Username: 'nophone', PhoneNumber: null, IsActive: 1 },
];

describe('AlertSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSettingsModel.getAll.mockResolvedValue({});
    alertSettingsModel.findEventRecipientIds.mockResolvedValue([]);
    alertSettingsModel.findUsersByIds.mockImplementation(async (ids) => USERS.filter((u) => ids.includes(u.UserId)));
    alertSettingsModel.setMany.mockResolvedValue();
    alertSettingsModel.replaceEventRecipients.mockResolvedValue();
  });

  test('uses the defaults when the settings table is empty', async () => {
    const { settings, rules } = await alertSettingsService.getSettings();

    expect(settings).toMatchObject({
      smsEnabled: true,
      reminderMinutes: 30,
      retryMinutes: 1,
      gensetStartEnabled: true,
      startDelaySeconds: 10,
      siteName: 'Genset Room',
    });
    expect(rules.maxSmsRecipients).toBe(5);
    expect(rules.smsRegisterNames).toEqual(['Oil Pressure', 'Coolant Temperature', 'Fuel Level']);
  });

  test('reads saved values (stored as text)', async () => {
    alertSettingsModel.getAll.mockResolvedValue({ SmsEnabled: '0', ReminderMinutes: '45', SiteName: 'Plant 2' });

    const { settings } = await alertSettingsService.getSettings();

    expect(settings).toMatchObject({ smsEnabled: false, reminderMinutes: 45, siteName: 'Plant 2' });
  });

  test('saves valid settings and the genset start recipients', async () => {
    await alertSettingsService.saveSettings({
      settings: { smsEnabled: false, reminderMinutes: 60, startDelaySeconds: 15, siteName: 'Plant 2' },
      gensetStartUserIds: [1],
    });

    expect(alertSettingsModel.setMany).toHaveBeenCalledWith({
      SmsEnabled: '0',
      ReminderMinutes: '60',
      StartDelaySeconds: '15',
      SiteName: 'Plant 2',
    });
    expect(alertSettingsModel.replaceEventRecipients).toHaveBeenCalledWith('GensetStart', [1]);
  });

  test('rejects values outside the allowed range and a bad start message', async () => {
    await expect(alertSettingsService.saveSettings({
      settings: { reminderMinutes: 5000, startMessage: '[MKS] {oil}', siteName: '' },
    })).rejects.toMatchObject({
      statusCode: 422,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'reminderMinutes' }),
        expect.objectContaining({ field: 'startMessage' }),
        expect.objectContaining({ field: 'siteName' }),
      ]),
    });
    expect(alertSettingsModel.setMany).not.toHaveBeenCalled();
  });

  test('allows at most 5 people for the genset start SMS, and only users with a phone number', async () => {
    await expect(alertSettingsService.saveSettings({ gensetStartUserIds: [1, 2, 3, 4, 5, 6] }))
      .rejects.toMatchObject({ statusCode: 422 });

    await expect(alertSettingsService.saveSettings({ gensetStartUserIds: [2] }))
      .rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ value: 2 })] });

    await expect(alertSettingsService.saveSettings({ gensetStartUserIds: [404] }))
      .rejects.toMatchObject({ statusCode: 404 });

    expect(alertSettingsModel.replaceEventRecipients).not.toHaveBeenCalled();
  });

  test('explains that the migration has to be run when the table is missing', async () => {
    alertSettingsModel.getAll.mockRejectedValue(Object.assign(new Error('no table'), { code: 'ER_NO_SUCH_TABLE' }));

    await expect(alertSettingsService.getSettings()).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('2026-11-06-sms-settings.sql'),
    });
  });
});
