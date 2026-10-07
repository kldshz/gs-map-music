CREATE DATABASE IF NOT EXISTS gs_map_music CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE gs_map_music;
CREATE TABLE IF NOT EXISTS area (
  id BIGINT PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(80) NOT NULL UNIQUE,
  parent_id BIGINT NULL, is_final BOOLEAN NOT NULL, hidden_flag INT NOT NULL DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES area(id)
);
CREATE TABLE IF NOT EXISTS anchor (
  id VARCHAR(80) PRIMARY KEY, source_id BIGINT NOT NULL UNIQUE,
  area_id BIGINT NOT NULL, kind ENUM('waypoint','statue') NOT NULL, name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, source_lat DOUBLE NULL, source_lng DOUBLE NULL,
  underground BOOLEAN NOT NULL, layer_values JSON NOT NULL, source_version INT NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  FOREIGN KEY (area_id) REFERENCES area(id)
);
CREATE TABLE IF NOT EXISTS music_track (
  id VARCHAR(100) PRIMARY KEY, title VARCHAR(255) NOT NULL,
  artists JSON NOT NULL, composers JSON NULL, album VARCHAR(255) NULL, release_date DATE NULL,
  duration_seconds DOUBLE NULL, description TEXT NOT NULL, netease_id VARCHAR(40) NULL,
  source_url VARCHAR(500) NULL
);
CREATE TABLE IF NOT EXISTS track_anchor (
  id VARCHAR(100) PRIMARY KEY, track_id VARCHAR(100) NOT NULL, anchor_id VARCHAR(80) NOT NULL,
  evidence_status ENUM('pending','verified') NOT NULL DEFAULT 'pending',
  evidence_note TEXT NOT NULL, source_url VARCHAR(500) NULL,
  UNIQUE KEY track_anchor_pair (track_id,anchor_id),
  FOREIGN KEY (track_id) REFERENCES music_track(id),
  FOREIGN KEY (anchor_id) REFERENCES anchor(id)
);
