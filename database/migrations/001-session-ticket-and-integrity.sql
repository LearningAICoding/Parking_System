-- Migration 001: align an existing pre-contract database with Sprint 1 contracts.
-- Run once against the selected target database after taking a backup.
-- A fresh install should use database/schema.sql instead.
-- Select parking_db or parking_test_db before sourcing this file.

ALTER TABLE tickets
  MODIFY slot_id INT UNSIGNED NOT NULL;

ALTER TABLE parking_sessions
  ADD COLUMN ticket_id INT UNSIGNED NULL AFTER vehicle_id,
  MODIFY vehicle_id INT UNSIGNED NOT NULL,
  MODIFY slot_id INT UNSIGNED NOT NULL;

ALTER TABLE parking_sessions
  ADD CONSTRAINT fk_parking_sessions_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE parking_sessions
  ADD COLUMN open_vehicle_id INT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN check_out_time IS NULL THEN vehicle_id ELSE NULL END
  ) STORED,
  ADD UNIQUE KEY uq_parking_sessions_open_vehicle (open_vehicle_id);

ALTER TABLE parking_slots
  ADD CONSTRAINT chk_parking_slots_vehicle_state CHECK (
    (status IN ('AVAILABLE','MAINTENANCE') AND current_vehicle_id IS NULL)
    OR (status IN ('RESERVED','OCCUPIED') AND current_vehicle_id IS NOT NULL)
  );

ALTER TABLE parking_sessions
  ADD CONSTRAINT chk_parking_sessions_open_fee CHECK (
    (check_out_time IS NULL AND fee IS NULL)
    OR (check_out_time IS NOT NULL AND fee IS NOT NULL AND fee >= 0)
  );
