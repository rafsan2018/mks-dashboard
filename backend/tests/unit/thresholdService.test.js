'use strict';

const thresholdService = require('../../src/services/thresholdService');
const thresholdModel = require('../../src/models/thresholdModel');
const registerDefinitionModel = require('../../src/models/registerDefinitionModel');
const { NotFoundError, ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/models/thresholdModel');
jest.mock('../../src/models/registerDefinitionModel');

describe('ThresholdService - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllThresholds calls thresholdModel.findAll with parsed params', async () => {
    thresholdModel.findAll.mockResolvedValue({ data: [], pagination: {} });

    await thresholdService.getAllThresholds({ page: '1', limit: '10', registerId: '2', severity: 'Critical' });

    expect(thresholdModel.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      registerId: 2,
      deviceId: null,
      severity: 'Critical',
      isActive: undefined,
      search: null,
    });
  });

  test('createThreshold verifies register exists and validates MinValue <= MaxValue', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 1 });
    thresholdModel.create.mockResolvedValue({ ThresholdId: 1, RegisterId: 1, MinValue: 198, MaxValue: 242 });

    const result = await thresholdService.createThreshold({
      registerId: 1,
      minValue: 198.00,
      maxValue: 242.00,
      severity: 'Warning',
      smsEnabled: 1,
    });

    expect(registerDefinitionModel.findById).toHaveBeenCalledWith(1);
    expect(thresholdModel.create).toHaveBeenCalled();
    expect(result.ThresholdId).toBe(1);
  });

  test('createThreshold throws ValidationError if MinValue > MaxValue', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 2 });

    await expect(
      thresholdService.createThreshold({
        registerId: 2,
        minValue: 200,
        maxValue: 100,
      })
    ).rejects.toThrow(ValidationError);
  });

  test('createThreshold throws NotFoundError if register does not exist', async () => {
    registerDefinitionModel.findById.mockResolvedValue(null);

    await expect(
      thresholdService.createThreshold({
        registerId: 999,
        minValue: 10,
      })
    ).rejects.toThrow(NotFoundError);
  });

  test('createThreshold keeps the SMS switch on for oil pressure, coolant temperature and fuel level', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 1, RegisterName: 'Oil Pressure' });
    thresholdModel.create.mockResolvedValue({ ThresholdId: 1 });

    await thresholdService.createThreshold({ registerId: 1, minValue: 100, smsEnabled: 1 });

    expect(thresholdModel.create).toHaveBeenCalledWith(expect.objectContaining({ smsEnabled: 1 }));
  });

  test('createThreshold switches SMS off for any other register (Email only)', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 9, RegisterName: 'Phase 1 Power Factor' });
    thresholdModel.create.mockResolvedValue({ ThresholdId: 2 });

    await thresholdService.createThreshold({ registerId: 9, minValue: 0.8, smsEnabled: 1 });

    expect(thresholdModel.create).toHaveBeenCalledWith(expect.objectContaining({ smsEnabled: 0 }));
  });

  test('updateThreshold refuses to switch SMS on for a register that does not send SMS', async () => {
    thresholdModel.findById.mockResolvedValue({ ThresholdId: 3, RegisterName: 'Generator L1 Current', MinValue: null, MaxValue: 50 });
    thresholdModel.update.mockResolvedValue({ ThresholdId: 3 });

    await thresholdService.updateThreshold(3, { smsEnabled: 1 });

    expect(thresholdModel.update).toHaveBeenCalledWith(3, { smsEnabled: 0 });
  });

  test('updateThreshold updates values correctly', async () => {
    thresholdModel.findById.mockResolvedValue({ ThresholdId: 1, MinValue: 100, MaxValue: 200 });
    thresholdModel.update.mockResolvedValue({ ThresholdId: 1, MinValue: 150, MaxValue: 200 });

    const updated = await thresholdService.updateThreshold(1, { minValue: 150 });

    expect(thresholdModel.update).toHaveBeenCalledWith(1, { minValue: 150 });
    expect(updated.MinValue).toBe(150);
  });

  test('deleteThreshold deletes existing threshold', async () => {
    thresholdModel.findById.mockResolvedValue({ ThresholdId: 5 });
    thresholdModel.delete.mockResolvedValue(true);

    const result = await thresholdService.deleteThreshold(5);

    expect(thresholdModel.delete).toHaveBeenCalledWith(5);
    expect(result).toBe(true);
  });
});
