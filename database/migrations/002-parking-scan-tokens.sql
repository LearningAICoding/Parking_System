-- Migration 002: add durable one-time scan token storage.
-- Safe for databases that have already completed migration 001.
-- Select parking_db or parking_test_db after taking a backup.

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
