'use strict';

const alertRecipientService = require('../../src/services/alertRecipientService');
const alertRecipientModel = require('../../src/models/alertRecipientModel');

jest.mock('../../src/models/alertRecipientModel');

const USERS = [
  { UserId: 1, Username: 'admin', Email: 'admin@example.com', PhoneNumber: '+60123456789', IsActive: 1 },
  { UserId: 2, Username: 'jsim', Email: 'jsim@example.com', PhoneNumber: '+60198765432', IsActive: 1 },
  { UserId: 13, Username: 'Alex', Email: null, PhoneNumber: '+60111111111', IsActive: 1 },
  { UserId: 20, Username: 'nophone', Email: 'np@example.com', PhoneNumber: '  ', IsActive: 1 },
];

describe('AlertRecipientService.saveRecipients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertRecipientModel.findExistingThresholdIds.mockImplementation(async (ids) => ids.filter(id => id <= 10));
    alertRecipientModel.findUsersByIds.mockImplementation(async (ids) => USERS.filter(u => ids.includes(u.UserId)));
    alertRecipientModel.replaceMany.mockResolvedValue({ emailCount: 0, smsCount: 0 });
    alertRecipientModel.findAll.mockResolvedValue([]);
  });

  test('replaces both lists, removing duplicate user IDs', async () => {
    await alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [1, 2, 2], smsUserIds: [13, 1] },
      { thresholdId: 3, emailUserIds: [], smsUserIds: [] },
    ]);

    expect(alertRecipientModel.replaceMany).toHaveBeenCalledWith([
      { thresholdId: 1, emailUserIds: [1, 2], smsUserIds: [13, 1] },
      { thresholdId: 3, emailUserIds: [], smsUserIds: [] },
    ]);
  });

  test('rejects a user without an email address on the email list', async () => {
    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [13], smsUserIds: [] },
    ])).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ field: 'emailUserIds', value: 13 })] });
    expect(alertRecipientModel.replaceMany).not.toHaveBeenCalled();
  });

  test('rejects a user without a phone number on the SMS list', async () => {
    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [], smsUserIds: [20] },
    ])).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ field: 'smsUserIds', value: 20 })] });
  });

  test('returns 404 for an unknown threshold or user', async () => {
    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 99, emailUserIds: [], smsUserIds: [] },
    ])).rejects.toMatchObject({ statusCode: 404 });

    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [404], smsUserIds: [] },
    ])).rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejects the same threshold twice in one request', async () => {
    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [], smsUserIds: [] },
      { thresholdId: 1, emailUserIds: [1], smsUserIds: [] },
    ])).rejects.toMatchObject({ statusCode: 422 });
  });
});
