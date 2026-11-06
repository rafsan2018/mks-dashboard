-- ============================================================
-- SMS alert settings, "genset started" recipients and the SMS log
-- Database: elliance_mks            Created: 2026-11-06
--
-- AlertSettings         -> SMS settings edited on the dashboard (SMS Alerts page).
--                          The C# BE service copies them to SQLite every 5 minutes.
-- AlertEventRecipients  -> who receives SMS that do not belong to a threshold
--                          (EventType 'GensetStart').
-- SmsAlertLog           -> log of every SMS the BE service tried to send.
--                          ThresholdId is now optional (the "genset started" SMS has none)
--                          and a Recipient column is added.
--
-- Run this BEFORE deploying the new BE service.
-- Safe to run more than once. Works on MySQL and MariaDB.
-- ============================================================

USE elliance_mks;

-- ─── Settings (one row per setting) ──────────────────────────
CREATE TABLE IF NOT EXISTS AlertSettings
(
  SettingKey    VARCHAR(50)  NOT NULL,
  SettingValue  VARCHAR(500) NOT NULL,
  UpdatedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (SettingKey)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Defaults (existing values are kept)
INSERT IGNORE INTO AlertSettings (SettingKey, SettingValue) VALUES
  ('SmsEnabled',             '1'),
  ('SiteName',               'Genset Room'),
  ('ReminderMinutes',        '30'),
  ('RetryMinutes',           '1'),
  ('GensetStartEnabled',     '1'),
  ('StartDelaySeconds',      '10'),
  ('SuppressLowWhenStopped', '1'),
  ('StartMessage',           'MKS {site}: Genset STARTED (#{starts}) {time}\nEngine: {rpm} rpm\nOil Press: {oil} kPa\nCoolant: {coolant} degC\nFuel: {fuel} %');

-- ─── Recipients of SMS that do not belong to a threshold ─────
CREATE TABLE IF NOT EXISTS AlertEventRecipients
(
  EventType  VARCHAR(30) NOT NULL,
  UserId     INT(11)     NOT NULL,
  PRIMARY KEY (EventType, UserId),
  KEY FK_AlertEventRecipients_Users (UserId),
  CONSTRAINT FK_AlertEventRecipients_Users FOREIGN KEY (UserId)
    REFERENCES Users (UserId) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ─── SMS log ─────────────────────────────────────────────────
-- (the table already exists on the live database; created here only on a new database)
CREATE TABLE IF NOT EXISTS SmsAlertLog
(
  AlertId      BIGINT(20)   NOT NULL AUTO_INCREMENT,
  ThresholdId  INT(11)      NULL,
  Message      VARCHAR(255) NOT NULL,
  Status       ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  SentAt       DATETIME     NULL,
  PRIMARY KEY (AlertId),
  KEY FK_SmsAlertLog_Thresholds (ThresholdId),
  CONSTRAINT FK_SmsAlertLog_Thresholds FOREIGN KEY (ThresholdId)
    REFERENCES Thresholds (ThresholdId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- The "genset started" SMS has no threshold
ALTER TABLE SmsAlertLog MODIFY ThresholdId INT(11) NULL;

-- Phone number the SMS was sent to (added only if missing)
SET @has_recipient := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SmsAlertLog' AND COLUMN_NAME = 'Recipient'
);
SET @add_recipient := IF(@has_recipient = 0,
  'ALTER TABLE SmsAlertLog ADD COLUMN Recipient VARCHAR(30) NULL AFTER ThresholdId',
  'SELECT 1');
PREPARE stmt FROM @add_recipient;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ─── One-time clean-up: SMS only for oil pressure, coolant temperature and fuel level ───
-- Thresholds of other registers keep sending Email, but not SMS.
-- (Recipients already linked to them in ThresholdNotifyUsers are NOT deleted;
--  remove them on the Alert Recipients page if you want.)
UPDATE Thresholds t
JOIN RegisterDefinitions rd ON rd.RegisterId = t.RegisterId
SET t.SMSEnabled = 0
WHERE rd.RegisterName NOT IN ('Oil Pressure', 'Coolant Temperature', 'Fuel Level');

-- ─── Check the result ────────────────────────────────────────
SELECT SettingKey, LEFT(SettingValue, 60) AS SettingValue FROM AlertSettings ORDER BY SettingKey;
SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SmsAlertLog' ORDER BY ORDINAL_POSITION;
