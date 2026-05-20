-- Time-Manager Database Schema v2.6.0
-- phpMyAdmin (Hostinger): pilih database dulu di sidebar, lalu Import file ini
-- XAMPP terminal: mysql -u root time_manager < schema.sql

-- ─── Rooms ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `rooms` (
  `id`                  VARCHAR(20)   NOT NULL,
  `name`                VARCHAR(255)  NOT NULL DEFAULT 'New Event',
  `password_hash`       VARCHAR(255)  NULL,
  `plan`                ENUM('free','pro','premium') NOT NULL DEFAULT 'free',
  `owner_id`            VARCHAR(64)   NOT NULL DEFAULT 'local',
  `timezone`            VARCHAR(64)   NOT NULL DEFAULT 'Asia/Jakarta',
  `master_clock`        TINYINT(1)    NOT NULL DEFAULT 1,
  `on_air`              TINYINT(1)    NOT NULL DEFAULT 0,
  `blackout`            TINYINT(1)    NOT NULL DEFAULT 0,
  `current_timer_index` INT           NOT NULL DEFAULT 0,
  `active_timer_id`     VARCHAR(36)   NULL,
  `logo`                TEXT          NULL,
  `primary_color`       VARCHAR(7)    NOT NULL DEFAULT '#3b82f6',
  `background_color`    VARCHAR(7)    NOT NULL DEFAULT '#0f172a',
  `created_at`          BIGINT        NOT NULL,
  `last_modified`       BIGINT        NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_owner` (`owner_id`),
  INDEX `idx_modified` (`last_modified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Timers ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `timers` (
  `id`              VARCHAR(36)   NOT NULL,
  `room_id`         VARCHAR(20)   NOT NULL,
  `sort_order`      INT           NOT NULL DEFAULT 0,
  `title`           VARCHAR(255)  NOT NULL DEFAULT 'New Timer',
  `speaker`         VARCHAR(255)  NOT NULL DEFAULT '',
  `duration`        INT           NOT NULL DEFAULT 600,
  `elapsed`         INT           NOT NULL DEFAULT 0,
  `remaining`       INT           NOT NULL DEFAULT 600,
  `status`          ENUM('idle','running','paused','finished','overtime') NOT NULL DEFAULT 'idle',
  `trigger_type`    ENUM('manual','auto','previous_end') NOT NULL DEFAULT 'manual',
  `wrapup_colors`   JSON          NOT NULL,
  `chime`           ENUM('none','bell','beep','ding','custom') NOT NULL DEFAULT 'none',
  `chime_at`        INT           NOT NULL DEFAULT 60,
  `notes`           TEXT          NOT NULL DEFAULT '',
  `bg_color`        VARCHAR(7)    NOT NULL DEFAULT '',
  `text_color`      VARCHAR(7)    NOT NULL DEFAULT '',
  `show_speaker`    TINYINT(1)    NOT NULL DEFAULT 1,
  `show_title`      TINYINT(1)    NOT NULL DEFAULT 1,
  `overtime_limit`  INT           NOT NULL DEFAULT 0,
  `started_at`      BIGINT        NULL,
  `paused_at`       BIGINT        NULL,
  `last_modified`   BIGINT        NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_order` (`room_id`, `sort_order`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `messages` (
  `id`              VARCHAR(36)   NOT NULL,
  `room_id`         VARCHAR(20)   NOT NULL,
  `text`            TEXT          NOT NULL,
  `type`            ENUM('normal','flash','lower_third','qa') NOT NULL DEFAULT 'normal',
  `bg_color`        VARCHAR(7)    NOT NULL DEFAULT '#1e293b',
  `text_color`      VARCHAR(7)    NOT NULL DEFAULT '#ffffff',
  `emoji`           VARCHAR(32)   NOT NULL DEFAULT '',
  `is_active`       TINYINT(1)    NOT NULL DEFAULT 0,
  `flash`           TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`      BIGINT        NOT NULL,
  `expires_at`      BIGINT        NULL,
  `last_modified`   BIGINT        NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_modified` (`last_modified`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Event Logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `event_logs` (
  `id`          VARCHAR(36)   NOT NULL,
  `room_id`     VARCHAR(20)   NOT NULL,
  `timer_id`    VARCHAR(36)   NULL,
  `event`       VARCHAR(64)   NOT NULL,
  `details`     JSON          NULL,
  `timestamp`   BIGINT        NOT NULL,
  `operator_id` VARCHAR(64)   NOT NULL DEFAULT 'unknown',
  PRIMARY KEY (`id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
