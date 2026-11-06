-- ============================================================
-- Split register readings by RegisterDefinitions.Group
-- Database: elliance_mks            Created: 2026-11-03
--
-- DPM                  -> RegisterReadings (unchanged)
-- Engine Parameters    -> EngineParametersReadings
-- Generator Parameters -> GeneratorParametersReadings
-- Mains Parameters     -> MainsParametersReadings
--
-- Only registers with Status = 'Active' keep readings in these tables.
-- Existing readings of Inactive registers are MOVED to RegisterReadingsBackup (not lost).
--
-- Run once, with the BE application stopped (so no new rows arrive while moving).
-- The BE application also creates the three tables itself (CREATE TABLE IF NOT EXISTS).
-- ============================================================

USE elliance_mks;

-- 1. Clean the Group text that contains the name pasted several times (RegisterId 13)
UPDATE RegisterDefinitions
SET `Group` = 'Generator Parameters'
WHERE `Group` LIKE 'Generator Parameters%'
  AND `Group` <> 'Generator Parameters';

-- 2. One readings table per non-DPM group (same structure as RegisterReadings)
CREATE TABLE IF NOT EXISTS EngineParametersReadings
(
  ReadingId     BIGINT(20)    NOT NULL AUTO_INCREMENT,
  RegisterId    INT(11)       NOT NULL,
  RawValue      VARCHAR(50)   NOT NULL,
  ScaledValue   DECIMAL(14,4) NULL DEFAULT NULL,
  RecordedAt    DATETIME      NOT NULL,
  PRIMARY KEY (ReadingId),
  KEY idx_device_param_time (RegisterId, RecordedAt),
  CONSTRAINT FK_EngineParametersReadings_Registers FOREIGN KEY (RegisterId)
    REFERENCES RegisterDefinitions (RegisterId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GeneratorParametersReadings
(
  ReadingId     BIGINT(20)    NOT NULL AUTO_INCREMENT,
  RegisterId    INT(11)       NOT NULL,
  RawValue      VARCHAR(50)   NOT NULL,
  ScaledValue   DECIMAL(14,4) NULL DEFAULT NULL,
  RecordedAt    DATETIME      NOT NULL,
  PRIMARY KEY (ReadingId),
  KEY idx_device_param_time (RegisterId, RecordedAt),
  CONSTRAINT FK_GeneratorParametersReadings_Registers FOREIGN KEY (RegisterId)
    REFERENCES RegisterDefinitions (RegisterId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MainsParametersReadings
(
  ReadingId     BIGINT(20)    NOT NULL AUTO_INCREMENT,
  RegisterId    INT(11)       NOT NULL,
  RawValue      VARCHAR(50)   NOT NULL,
  ScaledValue   DECIMAL(14,4) NULL DEFAULT NULL,
  RecordedAt    DATETIME      NOT NULL,
  PRIMARY KEY (ReadingId),
  KEY idx_device_param_time (RegisterId, RecordedAt),
  CONSTRAINT FK_MainsParametersReadings_Registers FOREIGN KEY (RegisterId)
    REFERENCES RegisterDefinitions (RegisterId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Move the existing readings out of RegisterReadings (all or nothing)
START TRANSACTION;

INSERT INTO EngineParametersReadings (RegisterId, RawValue, ScaledValue, RecordedAt)
SELECT rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
FROM RegisterReadings rr
JOIN RegisterDefinitions rd ON rd.RegisterId = rr.RegisterId
WHERE rd.`Group` = 'Engine Parameters' AND rd.Status = 'Active'
ORDER BY rr.ReadingId;

INSERT INTO GeneratorParametersReadings (RegisterId, RawValue, ScaledValue, RecordedAt)
SELECT rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
FROM RegisterReadings rr
JOIN RegisterDefinitions rd ON rd.RegisterId = rr.RegisterId
WHERE rd.`Group` = 'Generator Parameters' AND rd.Status = 'Active'
ORDER BY rr.ReadingId;

INSERT INTO MainsParametersReadings (RegisterId, RawValue, ScaledValue, RecordedAt)
SELECT rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
FROM RegisterReadings rr
JOIN RegisterDefinitions rd ON rd.RegisterId = rr.RegisterId
WHERE rd.`Group` = 'Mains Parameters' AND rd.Status = 'Active'
ORDER BY rr.ReadingId;

-- Readings of Inactive registers (any group) are kept in the backup table
INSERT INTO RegisterReadingsBackup (ReadingId, RegisterId, RawValue, ScaledValue, RecordedAt, BackupDate)
SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt, NOW()
FROM RegisterReadings rr
JOIN RegisterDefinitions rd ON rd.RegisterId = rr.RegisterId
WHERE rd.Status <> 'Active';

-- Remove exactly the rows copied above
DELETE rr
FROM RegisterReadings rr
JOIN RegisterDefinitions rd ON rd.RegisterId = rr.RegisterId
WHERE rd.Status <> 'Active'
   OR rd.`Group` IN ('Engine Parameters', 'Generator Parameters', 'Mains Parameters');

COMMIT;
