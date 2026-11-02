'use strict';

const registerReadingService = require('../../src/services/registerReadingService');
const registerReadingModel = require('../../src/models/registerReadingModel');
const deviceModel = require('../../src/models/deviceModel');
const { NotFoundError } = require('../../src/utils/errors');

jest.mock('../../src/models/registerReadingModel');
jest.mock('../../src/models/registerDefinitionModel');
jest.mock('../../src/models/deviceModel');

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
        recordedAt: '2026-09-09T14:50:49.000Z',
      }],
    });
    expect(registerReadingModel.findByDevice).toHaveBeenCalledWith(7);
  });

  test('getByDevice throws NotFoundError for an unregistered device', async () => {
    deviceModel.findById.mockResolvedValue(null);

    await expect(registerReadingService.getByDevice(999)).rejects.toThrow(NotFoundError);
    expect(registerReadingModel.findByDevice).not.toHaveBeenCalled();
  });
});
