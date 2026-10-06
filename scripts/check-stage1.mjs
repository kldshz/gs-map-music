// Dataset and coordinate probes only. This is not the application route engine.
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(path.join(root, name));
const dataset = JSON.parse(await read('data/demo.bundle.json'));
const fixtures = JSON.parse(await read('data/route-fixtures.json'));
assert.equal(dataset.schemaVersion, 1);
assert.equal(fixtures.datasetId, dataset.id);
assert.match(dataset.label, /合成.*非原神/);
const indexes = {};
for (const collection of ['sources', 'maps', 'regions', 'locations', 'tracks', 'associations', 'audioAssets']) {
  const entries = dataset[collection];
  assert.ok(Array.isArray(entries));
  indexes[collection] = new Map(entries.map(item => [item.id, item]));
  assert.equal(indexes[collection].size, entries.length, `${collection}: duplicate IDs`);
}
function refs(ids, collection) {
  assert.ok(Array.isArray(ids));
  for (const id of ids) assert.ok(indexes[collection].has(id), `Missing ${collection}/${id}`);
}
function provenance(item) {
  refs(item.sourceIds, 'sources');
  assert.ok(item.sourceIds.length > 0);
}
function rights(value, scope) {
  assert.ok(['allowed', 'pending', 'user-provided'].includes(value.status));
  assert.equal(value.scope, scope);
  assert.ok(value.attribution);
  provenance(value);
}
function point(value) {
  const map = indexes.maps.get(value.mapId);
  assert.ok(map);
  assert.ok(value.surfaceId);
  assert.ok(Number.isFinite(value.x) && Number.isFinite(value.y));
  assert.ok(value.x >= 0 && value.x <= map.width && value.y >= 0 && value.y <= map.height);
}
for (const map of dataset.maps) {
  assert.equal(map.kind, 'schematic');
  assert.equal(map.coordinateSystem, 'image-pixels-y-down');
  assert.equal(map.uri, null);
  rights(map.rights, 'geometry');
}
for (const region of dataset.regions) {
  provenance(region);
  assert.equal(region.evidenceStatus, 'synthetic');
  for (const ring of region.rings) {
    assert.ok(ring.length >= 4);
    assert.deepEqual(ring[0], ring.at(-1));
    for (const [x, y] of ring) point({ ...region, x, y });
  }
}
for (const location of dataset.locations) {
  provenance(location);
  if (location.point) point(location.point);
  if (location.regionId) {
    const region = indexes.regions.get(location.regionId);
    assert.ok(region);
    assert.equal(location.point?.mapId, region.mapId);
    assert.equal(location.point?.surfaceId, region.surfaceId);
  }
}
for (const track of dataset.tracks) {
  provenance(track);
  rights(track.metadataRights, 'metadata');
  refs(track.audioAssetIds, 'audioAssets');
  assert.ok(track.title && track.artists.length);
  if (track.origin === 'genshin-catalog') {
    assert.deepEqual(track.audioAssetIds, []);
    assert.equal(track.composers, null);
  }
}
for (const association of dataset.associations) {
  provenance(association);
  refs([association.trackId], 'tracks');
  refs([association.locationId], 'locations');
  assert.ok(['day', 'night', 'any', 'unknown'].includes(association.timeCondition));
  assert.ok(['verified', 'pending', 'synthetic'].includes(association.evidenceStatus));
  assert.ok(association.evidenceNote);
  if (association.evidenceStatus === 'pending') assert.equal(association.timeCondition, 'unknown');
}
assert.ok(dataset.tracks.some(track => dataset.associations.filter(a => a.trackId === track.id).length > 1));
assert.ok(dataset.locations.some(loc => dataset.associations.filter(a => a.locationId === loc.id).length > 1));

for (const audio of dataset.audioAssets) {
  rights(audio.rights, 'audio');
  assert.equal(audio.rights.status, 'allowed');
  assert.equal(audio.rights.license, 'CC-BY-4.0');
  assert.equal(audio.kind, 'bundled');
  assert.ok(/^\/audio\/demo\/[a-z0-9-]+\.wav$/.test(audio.uri));
  const bytes = await read('public' + audio.uri);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), audio.sha256);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
  let fmt;
  let samples;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + length <= bytes.length);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (tag === 'fmt ') fmt = chunk;
    if (tag === 'data') samples = chunk;
    offset += 8 + length + (length % 2);
  }
  assert.ok(fmt?.length >= 16 && samples?.length);
  assert.equal(fmt.readUInt16LE(0), 1); // PCM
  assert.equal(fmt.readUInt16LE(2), 1); // mono
  assert.equal(fmt.readUInt32LE(4), 22050);
  assert.equal(fmt.readUInt32LE(8), 44100);
  assert.equal(fmt.readUInt16LE(12), 2);
  assert.equal(fmt.readUInt16LE(14), 16);
  assert.equal(samples.length / 44100, audio.durationSeconds);
  let peak = 0;
  for (let i = 0; i < samples.length; i += 2) peak = Math.max(peak, Math.abs(samples.readInt16LE(i)));
  assert.ok(peak > 100, 'Audio is silent or invalid');
  console.log(`Audio verified: ${audio.id}, ${audio.durationSeconds}s, PCM mono 22050Hz, SHA-256 matched`);
}

// Coordinate derivations from the researched Leaflet and Kongying source.
for (const { x, y } of fixtures.coordinateCases) {
  const simpleLatLng = [-y, x];
  assert.deepEqual([simpleLatLng[1], -simpleLatLng[0]], [x, y]);
  const center = [3568, 6286];
  const kongyingLatLng = [x - center[0], y - center[1]];
  assert.deepEqual([kongyingLatLng[0] + center[0], kongyingLatLng[1] + center[1]], [x, y]);
}

// General polygon membership probe, including shared edges, holes and overlap ordering.
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1];
    const [bx, by] = ring[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-8 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
function area(ring) {
  return Math.abs(ring.slice(1).reduce((sum, [x, y], i) => sum + ring[i][0] * y - x * ring[i][1], 0)) / 2;
}
function regionAt(position, regions = dataset.regions) {
  return regions.filter(r => r.mapId === position.mapId && r.surfaceId === position.surfaceId && inRing([position.x, position.y], r.rings[0]) && !r.rings.slice(1).some(h => inRing([position.x, position.y], h)))
    .sort((a, b) => b.priority - a.priority || area(a.rings[0]) - area(b.rings[0]) || a.id.localeCompare(b.id))[0]?.id ?? null;
}
const route = fixtures.route;
const position = (x, y, surfaceId = route.surfaceId) => ({ mapId: route.mapId, surfaceId, x, y });
assert.equal(regionAt(position(340, 384)), 'region-a');
assert.equal(regionAt(position(340.1, 384)), 'region-b');
assert.equal(regionAt(position(-1, 384)), null);
assert.equal(regionAt(position(100, 384, 'underground')), null);
const nested = { ...dataset.regions[0], id: 'nested', priority: 1, rings: [[[80,300],[180,300],[180,500],[80,500],[80,300]]] };
assert.equal(regionAt(position(100, 384), [...dataset.regions, nested]), 'nested');
const hole = { ...dataset.regions[0], rings: [...dataset.regions[0].rings, nested.rings[0]] };
assert.equal(regionAt(position(100, 384), [hole]), null);
const observed = [];
for (let i = 1; i < route.points.length; i++) {
  const [ax, ay] = route.points[i - 1];
  const [bx, by] = route.points[i];
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
  for (let step = 0; step <= steps; step++) {
    const id = regionAt(position(ax + (bx - ax) * step / steps, ay + (by - ay) * step / steps));
    if (id !== observed.at(-1)) observed.push(id);
  }
}
assert.deepEqual(observed, fixtures.expectedRegions);
function eligible(regionId, time, bundle = dataset) {
  return [...new Set(bundle.associations.filter(a => a.evidenceStatus !== 'pending' && (a.timeCondition === time || a.timeCondition === 'any') && indexes.locations.get(a.locationId).regionId === regionId)
    .map(a => indexes.tracks.get(a.trackId)).filter(t => t.audioAssetIds.some(id => indexes.audioAssets.get(id).rights.status === 'allowed')).map(t => t.id))].sort();
}
for (const time of ['day', 'night']) {
  for (const [regionId, expected] of Object.entries(fixtures.eligible[time])) assert.deepEqual(eligible(regionId, time), [...expected].sort());
}
// Even an audio-bearing association cannot auto-play while its evidence is pending.
const pending = { ...dataset, associations: dataset.associations.map(a => ({ ...a, evidenceStatus: 'pending' })) };
assert.deepEqual(eligible('region-a', 'day', pending), []);

async function markdownFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (['.git', '.local', 'node_modules', 'resources'].includes(entry.name)) continue;
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(full));
    else if (entry.name.endsWith('.md')) result.push(full);
  }
  return result;
}
let links = 0;
for (const file of [...await markdownFiles(root), path.join(root, 'resources/README.md')]) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z]+:\/\//i.test(target) || /^mailto:/i.test(target)) continue;
    await access(path.resolve(path.dirname(file), decodeURIComponent(target)));
    links++;
  }
}
console.log(`PASS: references, provenance, many-to-many, audio, coordinates, polygons, route ${observed.join(' → ')}, day/night eligibility, ${links} local document links`);
console.log('Not tested here: browser playback, real map calibration, production route scheduling, UI.');
