'use strict';

/**
 * Rules shared by the SMS alert pages and services.
 * Keep SMS_REGISTER_NAMES / limits in sync with what the client agreed:
 *   SMS   -> genset started, oil pressure, coolant temperature, fuel level
 *   Email -> every threshold that has Email recipients
 */

// Registers that can send SMS. Other thresholds are Email only.
const SMS_REGISTER_NAMES = ['Oil Pressure', 'Coolant Temperature', 'Fuel Level'];

// Maximum number of phone numbers that receive one SMS alert
const MAX_SMS_RECIPIENTS = 5;

// Event types for SMS that do not belong to a threshold
const EVENT_GENSET_START = 'GensetStart';

const isSmsRegister = (registerName) => {
  const name = String(registerName ?? '').trim().toLowerCase();
  return SMS_REGISTER_NAMES.some((n) => n.toLowerCase() === name);
};

// ─── "Genset started" SMS text ───────────────────────────────
const START_PLACEHOLDERS = ['site', 'time', 'starts', 'rpm', 'oil', 'coolant', 'fuel'];

const START_SAMPLE_VALUES = {
  site: 'Genset Room',
  time: '06-Nov 14:32',
  starts: '106',
  rpm: '1500',
  oil: '420',
  coolant: '68',
  fuel: '85',
};

// One SMS holds 160 plain characters (more is split into several, billed messages)
const SMS_MAX_LENGTH = 160;

// Plain GSM characters only: other characters are shown differently on the phone
const SMS_TEXT_PATTERN = /^[A-Za-z0-9 .,:;()+\-/%!?=#*&<>'"\n]*$/;

/** Fill the placeholders of a "genset started" template. Also accepts a literal \n as a new line. */
function renderStartMessage(template, values = START_SAMPLE_VALUES) {
  return String(template ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

/** List of problems with a "genset started" template (empty list = OK). */
function validateStartMessage(template) {
  const problems = [];
  const text = String(template ?? '').replace(/\\n/g, '\n');

  if (text.trim() === '') return ['The message cannot be empty'];

  const unknown = [...new Set([...text.matchAll(/\{(\w*)\}/g)].map((m) => m[1]).filter((k) => !START_PLACEHOLDERS.includes(k)))];
  if (unknown.length > 0) {
    problems.push(`Unknown placeholder ${unknown.map((k) => `{${k}}`).join(', ')}. Use ${START_PLACEHOLDERS.map((k) => `{${k}}`).join(' ')}`);
  }

  const withoutPlaceholders = text.replace(/\{\w*\}/g, '');
  if (/[{}]/.test(withoutPlaceholders)) problems.push('Curly brackets are only allowed around a placeholder, e.g. {oil}');

  const rendered = renderStartMessage(template);
  const bad = [...new Set([...rendered.replace(/[{}]/g, '')].filter((c) => !SMS_TEXT_PATTERN.test(c)))];
  if (bad.length > 0) {
    problems.push(`Characters not allowed in an SMS: ${bad.join(' ')}. Use plain letters, digits and . , : ; ( ) + - / % ! ? = # * & < >`);
  }

  if (rendered.length > SMS_MAX_LENGTH) {
    problems.push(`The message is ${rendered.length} characters with sample values. One SMS holds ${SMS_MAX_LENGTH}.`);
  }

  return problems;
}

module.exports = {
  SMS_REGISTER_NAMES,
  MAX_SMS_RECIPIENTS,
  EVENT_GENSET_START,
  START_PLACEHOLDERS,
  START_SAMPLE_VALUES,
  SMS_MAX_LENGTH,
  SMS_TEXT_PATTERN,
  isSmsRegister,
  renderStartMessage,
  validateStartMessage,
};
