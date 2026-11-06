-- ============================================================
-- Alert recipients: who receives Email and SMS for each threshold
-- Database: elliance_mks            Created: 2026-11-06
--
-- ThresholdNotifyUsers       -> SMS (WhatsApp) recipients.
--                               Already exists; the C# BE service syncs it to
--                               SQLite and sends WhatsApp to these users' PhoneNumber.
-- ThresholdEmailNotifyUsers  -> Email recipients (NEW).
--                               Used by the UI backend when it sends threshold alert emails.
--
-- Both tables hold one row per (threshold, user). Rows are removed automatically
-- when the threshold or the user is deleted.
--
-- Safe to run more than once (CREATE TABLE IF NOT EXISTS). Existing rows are kept.
-- ============================================================

USE elliance_mks;

-- SMS / WhatsApp recipients (created here only if it is missing, e.g. on a new database)
CREATE TABLE IF NOT EXISTS ThresholdNotifyUsers
(
  ThresholdId  INT(11) NOT NULL,
  UserId       INT(11) NOT NULL,
  PRIMARY KEY (ThresholdId, UserId),
  KEY FK_ThresholdNotifyUsers_Users (UserId),
  CONSTRAINT FK_ThresholdNotifyUsers_Thresholds FOREIGN KEY (ThresholdId)
    REFERENCES Thresholds (ThresholdId) ON DELETE CASCADE,
  CONSTRAINT FK_ThresholdNotifyUsers_Users FOREIGN KEY (UserId)
    REFERENCES Users (UserId) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Email recipients
CREATE TABLE IF NOT EXISTS ThresholdEmailNotifyUsers
(
  ThresholdId  INT(11) NOT NULL,
  UserId       INT(11) NOT NULL,
  PRIMARY KEY (ThresholdId, UserId),
  KEY FK_ThresholdEmailNotifyUsers_Users (UserId),
  CONSTRAINT FK_ThresholdEmailNotifyUsers_Thresholds FOREIGN KEY (ThresholdId)
    REFERENCES Thresholds (ThresholdId) ON DELETE CASCADE,
  CONSTRAINT FK_ThresholdEmailNotifyUsers_Users FOREIGN KEY (UserId)
    REFERENCES Users (UserId) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Check the result
SELECT 'ThresholdNotifyUsers (SMS)' AS RecipientTable, COUNT(*) AS RowsCount FROM ThresholdNotifyUsers
UNION ALL
SELECT 'ThresholdEmailNotifyUsers (Email)', COUNT(*) FROM ThresholdEmailNotifyUsers;
