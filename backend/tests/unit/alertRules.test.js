'use strict';

const {
  isSmsRegister,
  renderStartMessage,
  validateStartMessage,
  SMS_MAX_LENGTH,
} = require('../../src/utils/alertRules');

const DEFAULT_TEMPLATE =
  'MKS {site}: Genset STARTED (#{starts}) {time}\nEngine: {rpm} rpm\nOil Press: {oil} kPa\nCoolant: {coolant} degC\nFuel: {fuel} %';

describe('alertRules', () => {
  test('only oil pressure, coolant temperature and fuel level send SMS', () => {
    expect(isSmsRegister('Oil Pressure')).toBe(true);
    expect(isSmsRegister(' coolant temperature ')).toBe(true);
    expect(isSmsRegister('Fuel Level')).toBe(true);
    expect(isSmsRegister('Phase 1 Power Factor')).toBe(false);
    expect(isSmsRegister(undefined)).toBe(false);
  });

  test('renders the genset start template with sample values', () => {
    expect(renderStartMessage(DEFAULT_TEMPLATE)).toBe(
      'MKS Genset Room: Genset STARTED (#106) 06-Nov 14:32\nEngine: 1500 rpm\nOil Press: 420 kPa\nCoolant: 68 degC\nFuel: 85 %'
    );
  });

  test('accepts a literal \\n as a new line', () => {
    expect(renderStartMessage('A\\nB')).toBe('A\nB');
  });

  test('the default template is valid and fits one SMS', () => {
    expect(validateStartMessage(DEFAULT_TEMPLATE)).toEqual([]);
    expect(renderStartMessage(DEFAULT_TEMPLATE).length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
  });

  test('rejects an empty message, unknown placeholders and stray brackets', () => {
    expect(validateStartMessage('   ')).toHaveLength(1);
    expect(validateStartMessage('Started {speed}')[0]).toMatch(/Unknown placeholder \{speed\}/);
    expect(validateStartMessage('Started {oil')[0]).toMatch(/Curly brackets/);
  });

  test('rejects characters that a phone would show differently (square brackets, accents, degree sign)', () => {
    expect(validateStartMessage('[MKS] started')[0]).toMatch(/Characters not allowed/);
    expect(validateStartMessage('Temp {coolant} °C')[0]).toMatch(/Characters not allowed/);
    expect(validateStartMessage('café')[0]).toMatch(/Characters not allowed/);
  });

  test('rejects a message longer than one SMS', () => {
    const long = 'A'.repeat(SMS_MAX_LENGTH + 1);
    expect(validateStartMessage(long)[0]).toMatch(/One SMS holds 160/);
  });
});
