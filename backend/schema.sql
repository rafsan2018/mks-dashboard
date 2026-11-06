-- ============================================================
-- Modbus Register Monitoring System - Database Schema
-- Database: elliance_mks
-- Created: 2026-08-20
-- ============================================================

CREATE DATABASE IF NOT EXISTS elliance_mks
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE elliance_mks;

-- ─── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
  UserId       INT AUTO_INCREMENT PRIMARY KEY,
  Username     VARCHAR(100) NOT NULL UNIQUE,
  Password     VARCHAR(255) NOT NULL,
  Email        VARCHAR(255) NULL UNIQUE,
  PhoneNumber  VARCHAR(30)  NULL,
  Role         ENUM('Admin', 'Operator', 'Viewer') NOT NULL DEFAULT 'Viewer',
  IsActive     TINYINT(1) NOT NULL DEFAULT 1,
  LastLogin    DATETIME    NULL,
  CreatedAt    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (Role),
  INDEX idx_users_is_active (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Comports ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Comports (
  ComportId      INT AUTO_INCREMENT PRIMARY KEY,
  Protocol       VARCHAR(50)  NOT NULL DEFAULT 'Modbus RTU',
  PortName       VARCHAR(50)  NOT NULL UNIQUE,
  BaudRate       INT          NOT NULL DEFAULT 9600,
  DataBits       TINYINT      NOT NULL DEFAULT 8,
  StopBits       TINYINT      NOT NULL DEFAULT 1,
  Parity         VARCHAR(10)  NOT NULL DEFAULT 'None',
  PollIntervalMs INT          NOT NULL DEFAULT 1000,
  INDEX idx_comports_port_name (PortName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Devices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Devices (
  DeviceId     INT AUTO_INCREMENT PRIMARY KEY,
  DeviceName   VARCHAR(255) NOT NULL,
  DeviceModel  VARCHAR(100) NOT NULL,
  ComportId    INT          NOT NULL,
  SlaveAddress TINYINT UNSIGNED NOT NULL,
  Location     VARCHAR(255) NULL,
  IsActive     TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device_comport_slave (ComportId, SlaveAddress),
  INDEX idx_devices_is_active (IsActive),
  CONSTRAINT fk_devices_comport
    FOREIGN KEY (ComportId) REFERENCES Comports(ComportId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── RegisterDefinitions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS RegisterDefinitions (
  RegisterId     INT AUTO_INCREMENT PRIMARY KEY,
  DeviceId       INT          NOT NULL,
  RegisterName   VARCHAR(255) NOT NULL,
  Action         ENUM('RO', 'WO', 'RW') NOT NULL DEFAULT 'RO',
  FunctionCode   TINYINT UNSIGNED NOT NULL,
  DataType       VARCHAR(20)  NOT NULL,
  StartAddress   INT UNSIGNED NOT NULL,
  RegisterCount  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ScaleFactor    VARCHAR(20)  NULL DEFAULT '-',
  Unit           VARCHAR(50)  NULL DEFAULT '-',
  INDEX idx_regdef_device_id (DeviceId),
  INDEX idx_regdef_start_address (StartAddress),
  INDEX idx_regdef_action (Action),
  CONSTRAINT fk_regdef_device
    FOREIGN KEY (DeviceId) REFERENCES Devices(DeviceId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── RegisterReadings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS RegisterReadings (
  ReadingId    BIGINT AUTO_INCREMENT PRIMARY KEY,
  RegisterId   INT          NOT NULL,
  RawValue     DECIMAL(18,4) NOT NULL DEFAULT 0,
  ScaledValue  DECIMAL(18,4) NOT NULL DEFAULT 0,
  RecordedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_readings_register_id (RegisterId),
  INDEX idx_readings_recorded_at (RecordedAt),
  INDEX idx_readings_register_time (RegisterId, RecordedAt),
  CONSTRAINT fk_readings_register
    FOREIGN KEY (RegisterId) REFERENCES RegisterDefinitions(RegisterId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Thresholds ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Thresholds (
  ThresholdId   INT AUTO_INCREMENT PRIMARY KEY,
  RegisterId    INT          NOT NULL,
  ConditionType VARCHAR(50)  NULL,
  MinValue      DECIMAL(18,4) NULL,
  MaxValue      DECIMAL(18,4) NULL,
  Severity      ENUM('Critical', 'Warning', 'Info') NOT NULL DEFAULT 'Warning',
  SMSEnabled    TINYINT(1)   NOT NULL DEFAULT 1,
  IsActive      TINYINT(1)   NOT NULL DEFAULT 1,
  INDEX idx_thresholds_register_id (RegisterId),
  INDEX idx_thresholds_severity (Severity),
  INDEX idx_thresholds_is_active (IsActive),
  CONSTRAINT fk_thresholds_register
    FOREIGN KEY (RegisterId) REFERENCES RegisterDefinitions(RegisterId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Threshold Alert Recovery State ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ThresholdAlertStates (
  ThresholdId INT PRIMARY KEY,
  IsViolated  TINYINT(1) NOT NULL DEFAULT 0,
  UpdatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_threshold_alert_state
    FOREIGN KEY (ThresholdId) REFERENCES Thresholds(ThresholdId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Alert Recipients ─────────────────────────────────────
-- SMS (WhatsApp) recipients per threshold — read by the C# BE service
CREATE TABLE IF NOT EXISTS ThresholdNotifyUsers (
  ThresholdId INT NOT NULL,
  UserId      INT NOT NULL,
  PRIMARY KEY (ThresholdId, UserId),
  KEY FK_ThresholdNotifyUsers_Users (UserId),
  CONSTRAINT FK_ThresholdNotifyUsers_Thresholds
    FOREIGN KEY (ThresholdId) REFERENCES Thresholds(ThresholdId) ON DELETE CASCADE,
  CONSTRAINT FK_ThresholdNotifyUsers_Users
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email recipients per threshold — read by this backend when it sends alert emails
CREATE TABLE IF NOT EXISTS ThresholdEmailNotifyUsers (
  ThresholdId INT NOT NULL,
  UserId      INT NOT NULL,
  PRIMARY KEY (ThresholdId, UserId),
  KEY FK_ThresholdEmailNotifyUsers_Users (UserId),
  CONSTRAINT FK_ThresholdEmailNotifyUsers_Thresholds
    FOREIGN KEY (ThresholdId) REFERENCES Thresholds(ThresholdId) ON DELETE CASCADE,
  CONSTRAINT FK_ThresholdEmailNotifyUsers_Users
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SMS settings (edited on the dashboard, SMS Alerts page) ─────────────
-- Copied to SQLite by the C# BE service every 5 minutes. See migrations/2026-11-06-sms-settings.sql.
CREATE TABLE IF NOT EXISTS AlertSettings (
  SettingKey   VARCHAR(50)  NOT NULL,
  SettingValue VARCHAR(500) NOT NULL,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (SettingKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Who receives SMS that do not belong to a threshold (EventType 'GensetStart')
CREATE TABLE IF NOT EXISTS AlertEventRecipients (
  EventType VARCHAR(30) NOT NULL,
  UserId    INT         NOT NULL,
  PRIMARY KEY (EventType, UserId),
  KEY FK_AlertEventRecipients_Users (UserId),
  CONSTRAINT FK_AlertEventRecipients_Users
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Log of every SMS the C# BE service tried to send (ThresholdId is empty for "genset started")
CREATE TABLE IF NOT EXISTS SmsAlertLog (
  AlertId     BIGINT AUTO_INCREMENT PRIMARY KEY,
  ThresholdId INT          NULL,
  Recipient   VARCHAR(30)  NULL,
  Message     VARCHAR(255) NOT NULL,
  Status      ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  SentAt      DATETIME     NULL,
  KEY FK_SmsAlertLog_Thresholds (ThresholdId),
  CONSTRAINT FK_SmsAlertLog_Thresholds
    FOREIGN KEY (ThresholdId) REFERENCES Thresholds(ThresholdId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
