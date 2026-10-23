-- Canonical schema for Parking System Sprint 1
-- MySQL 8.x, utf8mb4, timezone +07:00
-- Select the target database before sourcing this file.
-- Safe to run on a fresh database. It does not DROP any database/table.

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username          VARCHAR(50)  NOT NULL,
  email             VARCHAR(150) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('MANAGER','STAFF','CUSTOMER') NOT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  reset_token_hash  CHAR(64) NULL,
  reset_expires     DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_reset_token_hash (reset_token_hash),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(15) NULL,
  address     VARCHAR(255) NULL,
  position    VARCHAR(100) NULL,
  deleted_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_user_id (user_id),
  KEY idx_employees_full_name (full_name),
  KEY idx_employees_phone (phone),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(15) NOT NULL,
  email       VARCHAR(150) NULL,
  address     VARCHAR(255) NULL,
  deleted_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_user_id (user_id),
  KEY idx_customers_full_name (full_name),
  KEY idx_customers_phone (phone),
  KEY idx_customers_deleted_at (deleted_at),
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id   INT UNSIGNED NULL,
  license_plate VARCHAR(20) NOT NULL,
  vehicle_name  VARCHAR(100) NOT NULL,
  brand         VARCHAR(50) NULL,
  vehicle_type  ENUM('MOTORBIKE','CAR') NOT NULL DEFAULT 'MOTORBIKE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_license_plate (license_plate),
  KEY idx_vehicles_customer_id (customer_id),
  CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_vehicles_license_plate CHECK (license_plate REGEXP '^[0-9A-Z]{6,10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parking_slots (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot_code           VARCHAR(20) NOT NULL,
  zone                VARCHAR(20) NOT NULL DEFAULT 'A',
  status              ENUM('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE')
                      NOT NULL DEFAULT 'AVAILABLE',
  current_vehicle_id  INT UNSIGNED NULL,
  note                VARCHAR(255) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parking_slots_slot_code (slot_code),
  UNIQUE KEY uq_parking_slots_current_vehicle (current_vehicle_id),
  KEY idx_parking_slots_status (status),
  KEY idx_parking_slots_zone (zone),
  CONSTRAINT fk_parking_slots_vehicle FOREIGN KEY (current_vehicle_id) REFERENCES vehicles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_parking_slots_code CHECK (slot_code REGEXP '^[A-Z0-9-]{1,20}$'),
  CONSTRAINT chk_parking_slots_vehicle_state CHECK (
    (status IN ('AVAILABLE','MAINTENANCE') AND current_vehicle_id IS NULL)
    OR (status IN ('RESERVED','OCCUPIED') AND current_vehicle_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_code  VARCHAR(30) NOT NULL,
  vehicle_id   INT UNSIGNED NOT NULL,
  slot_id      INT UNSIGNED NOT NULL,
  ticket_type  ENUM('DAILY','MONTHLY','VIP') NOT NULL DEFAULT 'DAILY',
  price        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  deleted_at   DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_ticket_code (ticket_code),
  KEY idx_tickets_created_at (created_at),
  KEY idx_tickets_vehicle_id (vehicle_id),
  KEY idx_tickets_slot_id (slot_id),
  KEY idx_tickets_status (status),
  KEY idx_tickets_deleted_at (deleted_at),
  CONSTRAINT fk_tickets_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_slot FOREIGN KEY (slot_id) REFERENCES parking_slots (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_tickets_date CHECK (start_date <= end_date),
  CONSTRAINT chk_tickets_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parking_sessions (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id        INT UNSIGNED NOT NULL,
  ticket_id         INT UNSIGNED NULL,
  scanned_plate     VARCHAR(20) NOT NULL,
  plate_image_url   VARCHAR(255) NULL,
  slot_id           INT UNSIGNED NOT NULL,
  check_in_time     DATETIME NOT NULL,
  check_out_time    DATETIME NULL,
  fee               DECIMAL(12,2) NULL,
  open_vehicle_id   INT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN check_out_time IS NULL THEN vehicle_id ELSE NULL END
  ) STORED,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parking_sessions_open_vehicle (open_vehicle_id),
  KEY idx_parking_sessions_check_in_time (check_in_time),
  KEY idx_parking_sessions_check_out_time (check_out_time),
  KEY idx_parking_sessions_vehicle_id (vehicle_id),
  KEY idx_parking_sessions_ticket_id (ticket_id),
  KEY idx_parking_sessions_slot_id (slot_id),
  CONSTRAINT fk_parking_sessions_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_parking_sessions_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_parking_sessions_slot FOREIGN KEY (slot_id) REFERENCES parking_slots (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_parking_sessions_plate CHECK (scanned_plate REGEXP '^[0-9A-Z]{6,10}$'),
  CONSTRAINT chk_parking_sessions_time CHECK (
    check_out_time IS NULL OR check_out_time >= check_in_time
  ),
  CONSTRAINT chk_parking_sessions_open_fee CHECK (
    (check_out_time IS NULL AND fee IS NULL)
    OR (check_out_time IS NOT NULL AND fee IS NOT NULL AND fee >= 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parking_scan_tokens (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash        CHAR(64) NOT NULL,
  session_id_hash   CHAR(64) NOT NULL,
  user_id           INT UNSIGNED NOT NULL,
  vehicle_id        INT UNSIGNED NULL,
  normalized_plate  VARCHAR(20) NOT NULL,
  plate_image_url   VARCHAR(255) NOT NULL,
  expires_at        DATETIME NOT NULL,
  used_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scan_tokens_token_hash (token_hash),
  KEY idx_scan_tokens_session (session_id_hash),
  KEY idx_scan_tokens_expiry (expires_at),
  CONSTRAINT fk_scan_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_scan_tokens_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_scan_tokens_plate CHECK (normalized_plate REGEXP '^[0-9A-Z]{6,10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(200) NOT NULL,
  summary      VARCHAR(500) NULL,
  content      TEXT NOT NULL,
  thumbnail    VARCHAR(255) NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_news_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
