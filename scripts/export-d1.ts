import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateLibrary, validateSnapshot } from '../src/domain/validation';
import { applyAssociationEdits, validateEdits } from '../src/domain/association-edits';

const literal = (value: unknown): string => value === null || value === undefined ? 'NULL'
  : typeof value === 'number' ? String(value) : `CAST(X'${Buffer.from(String(value), 'utf8').toString('hex')}' AS TEXT)`;
const payload = (value: unknown) => literal(JSON.stringify(value));

/** Export current JSON + manual tombstones, never stale MySQL rows. No source file is mutated. */
export function buildD1Export(rawMap: unknown, rawLibrary: unknown, rawEdits: unknown) {
  const map = validateSnapshot(rawMap);
  const base = validateLibrary(rawLibrary, new Set(map.anchors.map(a => a.id)), map);
  const edits = validateEdits(rawEdits, base, map);
  const library = applyAssociationEdits(base, map, edits);
  for (const t of library.tracks) if (t.neteaseId && t.id !== `netease:${t.neteaseId}`) throw Error(`曲目 ID 不一致：${t.id}`);
  const release = createHash('sha256').update(JSON.stringify([map, base, edits])).digest('hex');
  const config = Buffer.from(JSON.stringify({ ...map, areas: undefined, anchors: undefined }), 'utf8');
  const trackLocations = library.tracks.flatMap(t => [...new Set(t.sceneInfo?.musicLocationIds ?? [])].map(id => [t.id, id]));
  const counts = { tracks: library.tracks.length, anchors: map.anchors.length, areas: map.areas.length,
    locations: (library.musicLocations ?? []).length, associations: library.associations.length,
    edits: edits.edits.length, trackLocations: trackLocations.length };
  const manifest = { schemaVersion: 1, release, source: 'current-json-with-manual-edits', counts,
    mapConfigParts: Math.ceil(config.length / 16000), statues: map.anchors.filter(a => a.kind === 'statue').length,
    pending: library.associations.filter(a => a.evidenceStatus === 'pending').length };
  const statements: string[] = [];
  function insert(table: string, columns: string, values: string[]) {
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${values.join(',')}) ON CONFLICT DO NOTHING;`;
    if (Buffer.byteLength(sql) > 95000) throw Error(`D1 单条语句过大：${table}；尚未写入数据库`);
    statements.push(sql);
  }
  const r = literal(release);
  insert('catalog_release', 'id,manifest_json,track_count,anchor_count,area_count,location_count,association_count,edit_count,track_location_count',
    [r, payload(manifest), ...Object.values(counts).map(literal)]);
  for (const a of map.areas) insert('area', 'release_id,id,code,data_json', [r, literal(a.id), literal(a.code), payload(a)]);
  for (const a of map.anchors) insert('anchor', 'release_id,id,area_id,kind,data_json', [r, literal(a.id), literal(a.areaId), literal(a.kind), payload(a)]);
  for (const t of library.tracks) insert('music_track', 'release_id,id,netease_id,title,album,data_json', [r, literal(t.id), literal(t.neteaseId), literal(t.title), literal(t.album), payload(t)]);
  for (const p of library.musicLocations ?? []) insert('music_location', 'release_id,id,area_id,data_json', [r, literal(p.id), literal(p.areaId), payload(p)]);
  for (const a of library.associations) insert('track_anchor', 'release_id,id,track_id,anchor_id,evidence_status,data_json', [r, literal(a.id), literal(a.trackId), literal(a.anchorId), literal(a.evidenceStatus), payload(a)]);
  for (const [track, location] of trackLocations) insert('track_music_location', 'release_id,track_id,location_id', [r, literal(track), literal(location)]);
  for (const e of edits.edits) insert('association_edit', 'release_id,track_id,anchor_id,action,updated_at', [r, literal(e.trackId), literal(e.anchorId), literal(e.action), literal(e.updatedAt)]);
  for (let offset = 0, part = 0; offset < config.length; offset += 16000, part++) {
    insert('map_config', 'release_id,part,data_blob', [r, String(part), `X'${config.subarray(offset, offset + 16000).toString('hex')}'`]);
  }
  const files: { name: string; sql: string }[] = [];
  let batch: string[] = [], size = 0;
  function flush() { if (batch.length) files.push({ name: `${String(files.length + 1).padStart(3, '0')}-data.sql`, sql: batch.join('\n') + '\n' }); batch = []; size = 0; }
  for (const sql of statements) { const bytes = Buffer.byteLength(sql) + 1; if (size + bytes > 2000000) flush(); batch.push(sql); size += bytes; }
  flush();
  files.push({ name: `${String(files.length + 1).padStart(3, '0')}-activate.sql`, sql:
    `INSERT INTO active_catalog(singleton,release_id) VALUES (1,${r}) ON CONFLICT(singleton) DO UPDATE SET release_id=excluded.release_id;\n` });
  return { manifest, files };
}

export async function exportD1(root = process.cwd()) {
  const read = async (p: string) => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
  const result = buildD1Export(await read('public/data/kongying-map.json'), await read('public/data/music-library.json'), await read('data/association-edits.json'));
  const directory = path.join(root, '.local/cloudflare/exports', result.manifest.release);
  await fs.mkdir(directory, { recursive: true });
  for (const file of result.files) await fs.writeFile(path.join(directory, file.name), file.sql);
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(result.manifest, null, 2) + '\n');
  return { ...result, directory };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await exportD1();
  console.log(JSON.stringify({ ...result.manifest, directory: result.directory, files: result.files.length }, null, 2));
}
