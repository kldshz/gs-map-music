-- Immutable releases: import all chunks before switching active_catalog. Keep old releases for rollback.
CREATE TABLE catalog_release (
  id TEXT PRIMARY KEY,
  manifest_json TEXT NOT NULL CHECK(json_valid(manifest_json)),
  track_count INTEGER NOT NULL, anchor_count INTEGER NOT NULL, area_count INTEGER NOT NULL,
  location_count INTEGER NOT NULL, association_count INTEGER NOT NULL, edit_count INTEGER NOT NULL,
  track_location_count INTEGER NOT NULL
);
CREATE TABLE area (
  release_id TEXT NOT NULL REFERENCES catalog_release(id), id INTEGER NOT NULL,
  code TEXT NOT NULL, data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  PRIMARY KEY(release_id,id), UNIQUE(release_id,code)
);
CREATE TABLE anchor (
  release_id TEXT NOT NULL, id TEXT NOT NULL, area_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('waypoint','statue')), data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  PRIMARY KEY(release_id,id), FOREIGN KEY(release_id,area_id) REFERENCES area(release_id,id)
);
CREATE TABLE music_track (
  release_id TEXT NOT NULL REFERENCES catalog_release(id), id TEXT NOT NULL, netease_id TEXT,
  title TEXT NOT NULL, album TEXT, data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  PRIMARY KEY(release_id,id)
);
CREATE TABLE music_location (
  release_id TEXT NOT NULL REFERENCES catalog_release(id), id TEXT NOT NULL,
  area_id INTEGER, data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  PRIMARY KEY(release_id,id), FOREIGN KEY(release_id,area_id) REFERENCES area(release_id,id)
);
CREATE TABLE track_anchor (
  release_id TEXT NOT NULL, id TEXT NOT NULL, track_id TEXT NOT NULL, anchor_id TEXT NOT NULL,
  evidence_status TEXT NOT NULL CHECK(evidence_status IN ('pending','verified')),
  data_json TEXT NOT NULL CHECK(json_valid(data_json)), PRIMARY KEY(release_id,id), UNIQUE(release_id,track_id,anchor_id),
  FOREIGN KEY(release_id,track_id) REFERENCES music_track(release_id,id),
  FOREIGN KEY(release_id,anchor_id) REFERENCES anchor(release_id,id)
);
CREATE INDEX track_anchor_anchor ON track_anchor(release_id,anchor_id);
CREATE TABLE track_music_location (
  release_id TEXT NOT NULL, track_id TEXT NOT NULL, location_id TEXT NOT NULL,
  PRIMARY KEY(release_id,track_id,location_id),
  FOREIGN KEY(release_id,track_id) REFERENCES music_track(release_id,id),
  FOREIGN KEY(release_id,location_id) REFERENCES music_location(release_id,id)
);
CREATE TABLE association_edit (
  release_id TEXT NOT NULL, track_id TEXT NOT NULL, anchor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('add','remove')), updated_at TEXT NOT NULL,
  PRIMARY KEY(release_id,track_id,anchor_id),
  FOREIGN KEY(release_id,track_id) REFERENCES music_track(release_id,id),
  FOREIGN KEY(release_id,anchor_id) REFERENCES anchor(release_id,id)
);
CREATE TABLE map_config (
  release_id TEXT NOT NULL REFERENCES catalog_release(id), part INTEGER NOT NULL, data_blob BLOB NOT NULL,
  PRIMARY KEY(release_id,part)
);
-- A missing/partial release cannot become active, including after an interrupted import.
CREATE VIEW complete_catalog AS SELECT r.id FROM catalog_release r WHERE
  r.track_count=(SELECT count(*) FROM music_track WHERE release_id=r.id) AND
  r.anchor_count=(SELECT count(*) FROM anchor WHERE release_id=r.id) AND
  r.area_count=(SELECT count(*) FROM area WHERE release_id=r.id) AND
  r.location_count=(SELECT count(*) FROM music_location WHERE release_id=r.id) AND
  r.association_count=(SELECT count(*) FROM track_anchor WHERE release_id=r.id) AND
  r.edit_count=(SELECT count(*) FROM association_edit WHERE release_id=r.id) AND
  r.track_location_count=(SELECT count(*) FROM track_music_location WHERE release_id=r.id) AND
  json_extract(r.manifest_json,'$.mapConfigParts')=(SELECT count(*) FROM map_config WHERE release_id=r.id);
CREATE TABLE active_catalog (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1), release_id TEXT NOT NULL REFERENCES catalog_release(id)
);
CREATE TRIGGER active_catalog_insert BEFORE INSERT ON active_catalog BEGIN
  SELECT RAISE(ABORT,'catalog import incomplete') WHERE NOT EXISTS(SELECT 1 FROM complete_catalog WHERE id=NEW.release_id);
END;
CREATE TRIGGER active_catalog_update BEFORE UPDATE ON active_catalog BEGIN
  SELECT RAISE(ABORT,'catalog import incomplete') WHERE NOT EXISTS(SELECT 1 FROM complete_catalog WHERE id=NEW.release_id);
END;
