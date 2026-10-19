-- Non-destructive local database bootstrap.
-- Run from the project root in the MySQL client.
CREATE DATABASE IF NOT EXISTS parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_db;
SOURCE database/schema.sql;
