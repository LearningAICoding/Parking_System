-- Local/test reset helper. DESTRUCTIVE: use only with parking_db or parking_test_db.
-- Select the target database (parking_db or parking_test_db) first.
-- Run schema.sql and seed.sql after this file.

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS parking_sessions;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;
