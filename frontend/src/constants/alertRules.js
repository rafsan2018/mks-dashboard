/**
 * Rules for the SMS alerts. Keep in sync with backend/src/utils/alertRules.js
 * (the backend checks the same rules again when saving).
 *
 *   SMS   -> genset started, oil pressure, coolant temperature, fuel level
 *   Email -> every threshold that has Email recipients
 */

// Registers that can send SMS. Other thresholds are Email only.
export const SMS_REGISTER_NAMES = ['Oil Pressure', 'Coolant Temperature', 'Fuel Level'];

// Maximum number of phone numbers that receive one SMS alert
export const MAX_SMS_RECIPIENTS = 5;

// One SMS holds 160 plain characters (more is split into several, billed messages)
export const SMS_MAX_LENGTH = 160;

export const isSmsRegister = (registerName) => {
  const name = String(registerName ?? '').trim().toLowerCase();
  return SMS_REGISTER_NAMES.some((n) => n.toLowerCase() === name);
};

// ─── "Genset started" SMS text ───────────────────────────────
export const START_PLACEHOLDERS = [
  { key: 'site', label: 'Site name', sample: 'Genset Room' },
  { key: 'time', label: 'Time of the start', sample: '06-Nov 14:32' },
  { key: 'starts', label: 'Number of starts', sample: '106' },
  { key: 'rpm', label: 'Engine speed (rpm)', sample: '1500' },
  { key: 'oil', label: 'Oil pressure (number)', sample: '420' },
  { key: 'coolant', label: 'Coolant temperature (number)', sample: '68' },
  { key: 'fuel', label: 'Fuel level (number)', sample: '85' },
];

export const START_SAMPLE_VALUES = Object.fromEntries(START_PLACEHOLDERS.map((p) => [p.key, p.sample]));

export const DEFAULT_START_MESSAGE =
  'MKS {site}: Genset STARTED (#{starts}) {time}\nEngine: {rpm} rpm\nOil Press: {oil} kPa\nCoolant: {coolant} degC\nFuel: {fuel} %';

// Plain GSM characters only: other characters are shown differently on the phone
const SMS_TEXT_PATTERN = /^[A-Za-z0-9 .,:;()+\-/%!?=#*&<>'"\n]*$/;

export const renderStartMessage = (template, values = START_SAMPLE_VALUES) =>
  String(template ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

/** Problems with a "genset started" text (empty list = OK). */
export const validateStartMessage = (template) => {
  const problems = [];
  const text = String(template ?? '').replace(/\\n/g, '\n');
  const known = START_PLACEHOLDERS.map((p) => p.key);

  if (text.trim() === '') return ['The message cannot be empty'];

  const unknown = [...new Set([...text.matchAll(/\{(\w*)\}/g)].map((m) => m[1]).filter((k) => !known.includes(k)))];
  if (unknown.length > 0) problems.push(`Unknown placeholder ${unknown.map((k) => `{${k}}`).join(', ')}`);

  if (/[{}]/.test(text.replace(/\{\w*\}/g, ''))) problems.push('Curly brackets are only allowed around a placeholder, e.g. {oil}');

  const rendered = renderStartMessage(template);
  const bad = [...new Set([...rendered.replace(/[{}]/g, '')].filter((c) => !SMS_TEXT_PATTERN.test(c)))];
  if (bad.length > 0) problems.push(`Characters not allowed in an SMS: ${bad.join(' ')} (use plain letters, digits and . , : ; ( ) + - / % ! ? = # * & < >)`);

  if (rendered.length > SMS_MAX_LENGTH) problems.push(`The message is ${rendered.length} characters with sample values, one SMS holds ${SMS_MAX_LENGTH}`);

  return problems;
};
