'use strict';

const thresholdMonitorService = require('../../src/services/thresholdMonitorService');
const thresholdModel = require('../../src/models/thresholdModel');
const thresholdAlertStateModel = require('../../src/models/thresholdAlertStateModel');
const userModel = require('../../src/models/userModel');
const emailService = require('../../src/services/emailService');

jest.mock('../../src/models/thresholdModel');
jest.mock('../../src/models/thresholdAlertStateModel');
jest.mock('../../src/models/userModel');
jest.mock('../../src/services/emailService');

describe('ThresholdMonitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    thresholdModel.findByRegisterId.mockResolvedValue([{
      ThresholdId: 7,
      MinValue: '10',
      MaxValue: '20',
      Severity: 'Warning',
      SMSEnabled: 1,
      IsActive: 1,
      RegisterName: 'Temperature',
      Unit: 'C',
    }]);
    thresholdAlertStateModel.updateViolation.mockResolvedValue(true);
    userModel.findById.mockResolvedValue({ UserId: 3, Email: 'operator@example.com' });
    emailService.sendThresholdNotification.mockResolvedValue();
  });

  test('emails the selected user once when a threshold is first violated', async () => {
    thresholdAlertStateModel.updateViolation
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await thresholdMonitorService.processReadings([
      { registerId: 4, scaledValue: 25, recordedAt: '2026-10-29T10:00:00.000Z' },
      { registerId: 4, scaledValue: 26, recordedAt: '2026-10-29T10:00:01.000Z' },
    ], 3);
    await new Promise(setImmediate);

    expect(emailService.sendThresholdNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendThresholdNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'operator@example.com',
      currentValue: 25,
      warning: 'Warning: Threshold #7 for Temperature is above its maximum of 20.',
      recordedAt: '2026-10-29T10:00:00.000Z',
    }));
  });

  test('re-arms the notification after recovery', async () => {
    thresholdAlertStateModel.updateViolation
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await thresholdMonitorService.processReadings([
      { registerId: 4, scaledValue: 25 },
      { registerId: 4, scaledValue: 15 },
      { registerId: 4, scaledValue: 8 },
    ], 3);
    await new Promise(setImmediate);

    expect(thresholdAlertStateModel.updateViolation).toHaveBeenNthCalledWith(2, 7, false);
    expect(emailService.sendThresholdNotification).toHaveBeenCalledTimes(2);
    expect(emailService.sendThresholdNotification).toHaveBeenLastCalledWith(expect.objectContaining({
      warning: 'Warning: Threshold #7 for Temperature is below its minimum of 10.',
      currentValue: 8,
    }));
  });

  test('does not send email when the SMS alert toggle is disabled', async () => {
    thresholdModel.findByRegisterId.mockResolvedValue([{
      ThresholdId: 7,
      MinValue: 10,
      MaxValue: 20,
      SMSEnabled: 0,
      IsActive: 1,
      RegisterName: 'Temperature',
    }]);

    await thresholdMonitorService.processReading({ registerId: 4, scaledValue: 25 }, 3);

    expect(thresholdAlertStateModel.updateViolation).toHaveBeenCalledWith(7, true);
    expect(emailService.sendThresholdNotification).not.toHaveBeenCalled();
  });

  test('does not let email delivery failure interrupt threshold processing', async () => {
    emailService.sendThresholdNotification.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      thresholdMonitorService.processReading({ registerId: 4, scaledValue: 25 }, 3)
    ).resolves.toBeUndefined();
    await new Promise(setImmediate);
  });
});
