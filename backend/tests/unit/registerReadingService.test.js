'use strict';

const registerReadingService = require('../../src/services/registerReadingService');
const registerReadingModel = require('../../src/models/registerReadingModel');
const registerDefinitionModel = require('../../src/models/registerDefinitionModel');
const deviceModel = require('../../src/models/deviceModel');
const { NotFoundError, ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/models/registerReadingModel');
jest.mock('../../src/models/registerDefinitionModel');
jest.mock('../../src/models/deviceModel');
jest.mock('../../src/services/thresholdMonitorService');

describe('RegisterReadingService - Device readings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getByDevice returns device metadata and mapped register readings', async () => {
    deviceModel.findById.mockResolvedValue({
      DeviceId: 7,
      DeviceName: 'Power Meter #7',
      DeviceModel: 'ME631',
    });
    registerReadingModel.findByDevice.mockResolvedValue([{
      ReadingId: 5188,
      RegisterId: 172,
      RegisterName: 'Phase 1 Power Factor',
      RawValue: '0',
      ScaledValue: '0.0000',
      Unit: '-',
      DataType: 'Float32',
      Action: 'RO',
      Group: 'DPM',
      Status: 'Active',
      RecordedAt: '2026-09-09T14:50:49.000Z',
    }]);

    await expect(registerReadingService.getByDevice(7)).resolves.toEqual({
      deviceId: 7,
      deviceName: 'Power Meter #7',
      deviceModel: 'ME631',
      registers: [{
        readingId: 5188,
        registerId: 172,
        registerName: 'Phase 1 Power Factor',
        rawValue: '0',
        scaledValue: '0.0000',
        unit: '-',
        dataType: 'Float32',
        action: 'RO',
        group: 'DPM',
        status: 'Active',
        recordedAt: '2026-09-09T14:50:49.000Z',
      }],
    });
    expect(registerReadingModel.findByDevice).toHaveBeenCalledWith(7);
  });

  test('getByDevice returns no value for an inactive register', async () => {
    deviceModel.findById.mockResolvedValue({ DeviceId: 1, DeviceName: 'AMF', DeviceModel: 'DSE7320 MKII' });
    registerReadingModel.findByDevice.mockResolvedValue([{
      ReadingId: 10,
      RegisterId: 6,
      RegisterName: 'Engine Speed',
      RawValue: '1500',
      ScaledValue: '1500.0000',
      Group: 'Engine Parameters',
      Status: 'Inactive',
      RecordedAt: '2026-11-01T09:43:43.000Z',
    }]);

    const result = await registerReadingService.getByDevice(1);

    expect(result.registers[0]).toMatchObject({
      registerName: 'Engine Speed',
      group: 'Engine Parameters',
      status: 'Inactive',
      readingId: null,
      rawValue: null,
      scaledValue: null,
      recordedAt: null,
    });
  });

  test('getByDevice throws NotFoundError for an unregistered device', async () => {
    deviceModel.findById.mockResolvedValue(null);

    await expect(registerReadingService.getByDevice(999)).rejects.toThrow(NotFoundError);
    expect(registerReadingModel.findByDevice).not.toHaveBeenCalled();
  });
});

describe('RegisterReadingService - Storing readings by group', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createReading stores an Active register in the table of its group', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 1, Group: 'Engine Parameters', Status: 'Active' });
    registerReadingModel.create.mockResolvedValue({ ReadingId: 1 });

    await registerReadingService.createReading({ registerId: 1, rawValue: 5, scaledValue: 5 });

    expect(registerReadingModel.create).toHaveBeenCalledWith(
      { registerId: 1, rawValue: 5, scaledValue: 5 },
      'EngineParametersReadings'
    );
  });

  test('createReading rejects an inactive register', async () => {
    registerDefinitionModel.findById.mockResolvedValue({ RegisterId: 6, Group: 'Engine Parameters', Status: 'Inactive' });

    await expect(registerReadingService.createReading({ registerId: 6, rawValue: 1, scaledValue: 1 }))
      .rejects.toThrow(ValidationError);
    expect(registerReadingModel.create).not.toHaveBeenCalled();
  });

  test('bulkCreateReadings routes by group and skips inactive registers', async () => {
    const definitions = {
      172: { RegisterId: 172, Group: 'DPM', Status: 'Active' },
      13: { RegisterId: 13, Group: 'Generator Parameters\r\nGenerator Parameters', Status: 'Active' },
      6: { RegisterId: 6, Group: 'Engine Parameters', Status: 'Inactive' },
    };
    registerDefinitionModel.findById.mockImplementation(async (id) => definitions[id]);
    registerReadingModel.bulkCreate.mockImplementation(async (rows) => rows.length);

    const result = await registerReadingService.bulkCreateReadings([
      { registerId: 172, rawValue: 1, scaledValue: 1 },
      { registerId: 13, rawValue: 2, scaledValue: 2 },
      { registerId: 6, rawValue: 3, scaledValue: 3 },
    ]);

    expect(registerReadingModel.bulkCreate).toHaveBeenCalledWith([
      { registerId: 172, rawValue: 1, scaledValue: 1, table: 'RegisterReadings' },
      { registerId: 13, rawValue: 2, scaledValue: 2, table: 'GeneratorParametersReadings' },
    ]);
    expect(result).toEqual({ insertedCount: 2, skippedCount: 1 });
  });
});
