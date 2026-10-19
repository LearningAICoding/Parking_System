-- DEPRECATED compatibility entry point.
-- Fresh installs should run this from the project root with the MySQL client.
-- This wrapper is non-destructive and keeps old setup commands working.
CREATE DATABASE IF NOT EXISTS parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_db;
SOURCE database/schema.sql;
