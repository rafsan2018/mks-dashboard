'use strict';

/**
 * Where the readings of each RegisterDefinitions.Group are stored.
 * DPM stays in RegisterReadings; every other group has its own table.
 * Only registers with Status = 'Active' have readings stored.
 * Keep in sync with BE Model/ReadingTables.cs.
 */
const DPM_TABLE = 'RegisterReadings';

const TABLE_BY_GROUP = {
  'dpm':                  DPM_TABLE,
  'engine parameters':    'EngineParametersReadings',
  'generator parameters': 'GeneratorParametersReadings',
  'mains parameters':     'MainsParametersReadings',
};

const READING_TABLES = [...new Set(Object.values(TABLE_BY_GROUP))];

/** First non-empty line of the Group text (some rows contain the name pasted several times). */
const normalizeGroup = (group) =>
  String(group ?? '').split(/[\r\n]+/).map(s => s.trim()).find(Boolean) || '';

/** Readings table of a group, or null when the group has no readings table. */
const tableForGroup = (group) => TABLE_BY_GROUP[normalizeGroup(group).toLowerCase()] || null;

const isActiveStatus = (status) => String(status ?? '').trim().toLowerCase() === 'active';

module.exports = {
  DPM_TABLE,
  READING_TABLES,
  normalizeGroup,
  tableForGroup,
  isActiveStatus,
};
