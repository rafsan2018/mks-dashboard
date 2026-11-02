'use strict';

const db = require('../config/database');

class ThresholdAlertStateModel {
  async updateViolation(thresholdId, isViolated) {
    if (!isViolated) {
      await db.query(
        'UPDATE ThresholdAlertStates SET IsViolated = 0 WHERE ThresholdId = ? AND IsViolated = 1',
        [thresholdId]
      );
      return false;
    }

    const [insertResult] = await db.query(
      'INSERT IGNORE INTO ThresholdAlertStates (ThresholdId, IsViolated) VALUES (?, 1)',
      [thresholdId]
    );
    if (insertResult.affectedRows === 1) return true;

    const [updateResult] = await db.query(
      'UPDATE ThresholdAlertStates SET IsViolated = 1 WHERE ThresholdId = ? AND IsViolated = 0',
      [thresholdId]
    );
    return updateResult.affectedRows === 1;
  }
}

module.exports = new ThresholdAlertStateModel();
