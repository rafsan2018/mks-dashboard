'use strict';

const fs = require('fs');
const path = require('path');

// Email templates: src/templates/email/<name>.html (inside layout.html) and <name>.txt
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replaces {{name}} with values[name] (passed through `escape`) and {{{name}}} with the raw value.
 */
function fill(template, values, escape) {
  return template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => String(values[key] ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => escape(String(values[key] ?? '')));
}

// Read on every send, so template edits apply without restarting the backend
function read(file) {
  return fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
}

/**
 * Renders one email from its templates.
 * The first line of <name>.txt is "Subject: ..." followed by an empty line, then the plain-text body.
 * @returns {{ subject: string, text: string, html: string }}
 */
function renderEmail(name, values) {
  const [subjectLine, ...bodyLines] = fill(read(`${name}.txt`), values, v => v).replace(/\r\n/g, '\n').split('\n');
  const subject = subjectLine.replace(/^Subject:\s*/i, '').trim();
  const text = bodyLines.join('\n').trim() + '\n';

  const content = fill(read(`${name}.html`), values, escapeHtml);
  const html = fill(read('layout.html'), { ...values, subject, content }, escapeHtml);

  return { subject, text, html };
}

module.exports = { renderEmail, escapeHtml };
