import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildD1Export } from '../../scripts/export-d1';
import { resolveNeteaseOuter } from '../../src/services/netease-resource';
import worker, { handleApi, type Env } from '../../worker/index';
import { resolvePlaybackResource } from '../../src/services/music-player';

const map = JSON.parse(fs.readFileSync('public/data/kongying-map.json', 'utf8'));
const library = JSON.parse(fs.readFileSync('public/data/music-library.json', 'utf8'));
const edits = JSON.parse(fs.readFileSync('data/association-edits.json', 'utf8'));
const migration = fs.readFileSync('database/d1/migrations/0001_catalog.sql', 'utf8');
const exported = buildD1Export(map, library, edits);
function database() { const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON;'); db.exec(migration); return db; }
function binding(db: DatabaseSync): Env {
  return { DB: { prepare(sql: string) { let parameters: unknown[] = []; const stmt = {
    bind(...values: unknown[]) { parameters = values; return stmt; },
    async first() { return db.prepare(sql).get(...parameters as any[]) ?? null; },
  }; return stmt; } }, ASSETS: { fetch: async () => new Response('asset') } } as unknown as Env;
}
const request = (suffix: string, options?: RequestInit) => new Request('https://example.com' + suffix, options);

test('D1完整导入保留最新数据/说明/人工覆盖，重复导入不重复，半成品不能启用', () => {
  const db = database();
  try {
    assert.throws(() => db.exec(exported.files.at(-1)!.sql), /FOREIGN KEY|incomplete/);
    for (const file of exported.files) db.exec(file.sql);
    for (const file of exported.files) db.exec(file.sql);
    assert.equal(db.prepare('SELECT count(*) AS n FROM music_track').get()!.n, library.tracks.length);
    assert.equal(db.prepare('SELECT count(*) AS n FROM anchor').get()!.n, map.anchors.length);
    assert.equal(db.prepare('SELECT count(*) AS n FROM track_anchor').get()!.n, exported.manifest.counts.associations);
    const rows = db.prepare('SELECT data_json FROM music_track ORDER BY id').all().map(r => JSON.parse(String(r.data_json)));
    assert.deepEqual(rows, [...library.tracks].sort((a, b) => a.id < b.id ? -1 : 1));
    const anchors = db.prepare('SELECT data_json FROM anchor ORDER BY id').all().map(r => JSON.parse(String(r.data_json)));
    assert.deepEqual(anchors, [...map.anchors].sort((a, b) => a.id < b.id ? -1 : 1));
    const parts = db.prepare('SELECT data_blob FROM map_config ORDER BY part').all().map(r => Buffer.from(r.data_blob as Uint8Array));
    assert.equal(Buffer.concat(parts).toString('utf8'), JSON.stringify({ ...map, anchors: undefined, areas: undefined }));
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    assert.deepEqual(buildD1Export(map, library, edits), exported);
    for (const file of exported.files) for (const sql of file.sql.trim().split('\n')) assert.ok(Buffer.byteLength(sql) < 100000);
  } finally { db.close(); }
});

test('D1人工删除不回加，人工新增保持pending；中断更新保留旧版本，可回退', () => {
  const old = library.associations[0];
  const anchor = map.anchors.find((a: any) => !library.associations.some((r: any) => r.trackId === old.trackId && r.anchorId === a.id))!;
  const updated = buildD1Export(map, library, { schemaVersion: 1, edits: [
    { trackId: old.trackId, anchorId: old.anchorId, action: 'remove', updatedAt: '2026-10-09T00:00:00Z' },
    { trackId: old.trackId, anchorId: anchor.id, action: 'add', updatedAt: '2026-10-09T00:00:00Z' },
  ] });
  const db = database();
  try {
    for (const file of exported.files) db.exec(file.sql);
    db.exec(updated.files[0].sql);
    assert.throws(() => db.exec(updated.files.at(-1)!.sql), /incomplete/);
    assert.equal(db.prepare('SELECT release_id FROM active_catalog').get()!.release_id, exported.manifest.release);
    for (const file of updated.files) db.exec(file.sql);
    const rows = db.prepare('SELECT anchor_id,evidence_status FROM track_anchor WHERE release_id=? AND track_id=?').all(updated.manifest.release, old.trackId);
    assert.ok(!rows.some(r => r.anchor_id === old.anchorId));
    assert.equal(rows.find(r => r.anchor_id === anchor.id)?.evidence_status, 'pending');
    db.exec(exported.files.at(-1)!.sql);
    assert.equal(db.prepare('SELECT release_id FROM active_catalog').get()!.release_id, exported.manifest.release);
  } finally { db.close(); }
});

test('Worker仅查活动版本与真实ID；跨站/写入/无效ID/缺库/未知API有明确响应，不回落HTML', async () => {
  const db = database();
  try {
    for (const file of exported.files) db.exec(file.sql);
    const env = binding(db); let calls = 0;
    const provider = (async (id: string, _fetch: typeof fetch, secure: boolean) => {
      calls++; assert.equal(id, '1455706951'); assert.equal(secure, true);
      return { status: 'unavailable', reason: 'copyright', message: 'test-denied' };
    }) as typeof resolveNeteaseOuter;
    const resolve = '/api/playback/resolve?trackId=netease%3A1455706951';
    assert.equal((await (await handleApi(request(resolve), env, provider)).json()).status, 'unavailable');
    assert.equal((await handleApi(request(resolve, { method: 'POST' }), env, provider)).status, 405);
    assert.equal((await handleApi(request(resolve, { headers: { Origin: 'https://elsewhere.com' } }), env, provider)).status, 403);
    assert.equal((await handleApi(request(resolve, { headers: { 'Sec-Fetch-Site': 'cross-site' } }), env, provider)).status, 403);
    assert.equal((await handleApi(request('/api/playback/resolve?trackId=SQL%27'), env, provider)).status, 400);
    assert.equal((await (await handleApi(request('/api/playback/resolve?trackId=netease%3A1'), env, provider)).json()).reason, 'missing');
    assert.equal((await handleApi(request('/api/unknown'), env, provider)).status, 404);
    assert.equal((await handleApi(request(resolve), { ...env, DB: undefined } as unknown as Env, provider)).status, 503);
    assert.equal(calls, 1);
    assert.equal((await (await handleApi(request('/api/health'), env)).json()).tracks, 1663);
    assert.equal(await (await worker.fetch(request('/'), env)).text(), 'asset');
    assert.equal(await (await worker.fetch(request('/api/health', { method: 'HEAD' }), env)).text(), '');
  } finally { db.close(); }
});

test('HTTPS音源需再次核实，拒绝降级HTTP/HTML/第三方/失败；短时链接不当永久地址', async () => {
  function response(url: string, status = 200, type = 'audio/mpeg') {
    const r = new Response(null, { status, headers: { 'Content-Type': type } }); Object.defineProperty(r, 'url', { value: url }); return r;
  }
  let calls = 0;
  const fetcher = (async (url: string, options: RequestInit) => {
    assert.equal(options.method, 'HEAD'); assert.equal(options.credentials, 'omit');
    calls++; if (calls === 1) return response('http://m10.music.126.net/example.mp3');
    assert.equal(String(url), 'https://m10.music.126.net/example.mp3'); return response(String(url));
  }) as typeof fetch;
  const resolved = await resolveNeteaseOuter('1455706951', fetcher, true);
  assert.equal(resolved.status, 'ready');
  if (resolved.status === 'ready') { assert.match(resolved.url, /^https:/); assert.ok(Date.parse(resolved.expiresAt!) > Date.now()); assert.equal(resolved.preview, null); }
  assert.equal(calls, 2);
  for (const invalid of [response('http://m10.music.126.net/a'), response('https://evil.com/a'), response('https://m10.music.126.net/a', 403), response('https://m10.music.126.net/a', 200, 'text/html')]) {
    let index = 0;
    assert.equal((await resolveNeteaseOuter('1455706951', (async () => ++index === 1 ? response('http://m10.music.126.net/a') : invalid) as typeof fetch, true)).status, 'unavailable');
  }
});

test('静态站API回落HTML和损坏JSON有明确错误，不伪造可播', async () => {
  const signal=new AbortController().signal;
  const html=await resolvePlaybackResource('netease:1',signal,(async()=>new Response('<html>SPA</html>',{headers:{'content-type':'text/html'}})) as typeof fetch);
  assert.equal(html.status,'unavailable');if(html.status==='unavailable')assert.match(html.message,/接口未接入/);
  const broken=await resolvePlaybackResource('netease:1',signal,(async()=>new Response('{',{headers:{'content-type':'application/json'}})) as typeof fetch);
  assert.equal(broken.status,'unavailable');
});
