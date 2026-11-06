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
    // Thresholds 1 to 5 are on registers that send SMS, 6 is not
    alertRecipientModel.findRegisterNames.mockImplementation(async (ids) => Object.fromEntries(
      ids.map(id => [id, id === 6 ? 'Phase 1 Power Factor' : 'Oil Pressure'])
    ));
  });

  test('rejects SMS recipients on a threshold whose register does not send SMS', async () => {
    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 6, emailUserIds: [1], smsUserIds: [1] },
    ])).rejects.toMatchObject({
      statusCode: 422,
      errors: [expect.objectContaining({ field: 'smsUserIds', value: 6 })],
    });
    expect(alertRecipientModel.replaceMany).not.toHaveBeenCalled();
  });

  test('still allows Email recipients on a register that does not send SMS', async () => {
    await alertRecipientService.saveRecipients([
      { thresholdId: 6, emailUserIds: [1, 2], smsUserIds: [] },
    ]);

    expect(alertRecipientModel.replaceMany).toHaveBeenCalledWith([
      { thresholdId: 6, emailUserIds: [1, 2], smsUserIds: [] },
    ]);
  });

  test('rejects more than 5 SMS recipients for one threshold', async () => {
    alertRecipientModel.findUsersByIds.mockImplementation(async (ids) => ids.map(id => (
      { UserId: id, Username: `user${id}`, Email: `u${id}@example.com`, PhoneNumber: '+60123456789', IsActive: 1 }
    )));

    await expect(alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [], smsUserIds: [1, 2, 3, 4, 5, 6] },
    ])).rejects.toMatchObject({
      statusCode: 422,
      errors: [expect.objectContaining({ field: 'smsUserIds', value: 1 })],
    });
  });

  test('accepts exactly 5 SMS recipients', async () => {
    alertRecipientModel.findUsersByIds.mockImplementation(async (ids) => ids.map(id => (
      { UserId: id, Username: `user${id}`, Email: `u${id}@example.com`, PhoneNumber: '+60123456789', IsActive: 1 }
    )));

    await alertRecipientService.saveRecipients([
      { thresholdId: 1, emailUserIds: [], smsUserIds: [1, 2, 3, 4, 5] },
    ]);

    expect(alertRecipientModel.replaceMany).toHaveBeenCalled();
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
