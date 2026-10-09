import { resolveNeteaseOuter } from '../src/services/netease-resource';

export interface Env { DB: D1Database; ASSETS: Fetcher }
type TrackRow = { id: string; netease_id: string | null };
function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
const unavailable = (reason: string, message: string, status = 200) => json({ status: 'unavailable', reason, message }, status);

/** Same-origin, read-only API. No SQL, provider URL, filesystem path or credential is accepted from clients. */
export async function handleApi(request: Request, env: Env, provider: typeof resolveNeteaseOuter = resolveNeteaseOuter): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ message: '仅支持读取' }, 405);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site'
    || (request.headers.has('Origin') && request.headers.get('Origin') !== url.origin)) return json({ message: '仅限本站页面' }, 403);
  if (!['/api/health', '/api/playback/resolve'].includes(url.pathname)) return json({ message: '不存在的 API' }, 404);
  if (!env.DB) return unavailable('network', '云端数据库尚未绑定', 503);
  try {
    if (url.pathname === '/api/health') {
      const row = await env.DB.prepare('SELECT r.id, r.track_count FROM active_catalog a JOIN catalog_release r ON r.id=a.release_id WHERE a.singleton=1').first<{ id: string; track_count: number }>();
      return json({ status: row ? 'ready' : 'unavailable', service: 'cloudflare-worker', database: row ? 'ready' : 'empty', catalogVersion: row?.id ?? null, tracks: row?.track_count ?? 0 }, row ? 200 : 503);
    }
    const id = url.searchParams.get('trackId') ?? '';
    if (!/^netease:\d{1,20}$/.test(id)) return unavailable('missing', '没有有效的原神曲目 ID', 400);
    const row = await env.DB.prepare('SELECT t.id, t.netease_id FROM music_track t JOIN active_catalog a ON a.release_id=t.release_id WHERE a.singleton=1 AND t.id=?').bind(id).first<TrackRow>();
    if (!row || !row.netease_id || !/^\d{1,20}$/.test(row.netease_id) || row.id !== `netease:${row.netease_id}`) {
      return unavailable('missing', '当前云端曲库中没有对应原神歌曲或网易 ID');
    }
    return json(await provider(row.netease_id, fetch, true));
  } catch {
    return unavailable('network', '云端播放服务读取失败，请稍后重试', 503);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      const response = await handleApi(request, env);
      return request.method === 'HEAD' ? new Response(null, response) : response;
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
