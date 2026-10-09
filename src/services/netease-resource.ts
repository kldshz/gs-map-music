import type { PlaybackResource } from '../domain/contracts';

const unavailable = (reason: 'missing' | 'copyright' | 'network', message: string): PlaybackResource => ({ status: 'unavailable', reason, message });
const isMedia = (response: Response) => {
  const url = new URL(response.url);
  return response.ok && (url.hostname === 'music.126.net' || url.hostname.endsWith('.music.126.net'))
    && ['http:', 'https:'].includes(url.protocol) && /^audio\//i.test(response.headers.get('content-type') ?? '');
};

/** Resolve an existing catalog ID only; never search for a replacement or send account credentials. */
export async function resolveNeteaseOuter(id: string, request: typeof fetch = fetch, secureMedia = false): Promise<PlaybackResource> {
  if (!/^\d{1,20}$/.test(id)) return unavailable('missing', '没有有效的网易歌曲 ID');
  const url = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  try {
    const signal = AbortSignal.timeout(10000);
    const options = { method: 'HEAD', redirect: 'follow' as const, credentials: 'omit' as const, signal };
    const response = await request(url, options);
    if (!isMedia(response)) {
      if (response.status === 403 || response.status === 404 || !/\.music\.126\.net$/.test(new URL(response.url).hostname)) {
        return unavailable('copyright', '网易公开外链暂无可播放资源；可能受版权或服务限制');
      }
      return unavailable('network', '网易公开外链没有返回有效音频，请稍后重试');
    }
    if (!secureMedia) return { status: 'ready', provider: 'netease-outer', url, expiresAt: null, preview: null };
    // The stable entry currently redirects to HTTP. HTTPS pages need a separately verified HTTPS media URL.
    const secure = new URL(response.url);
    secure.protocol = 'https:';
    const checked = await request(secure.href, options);
    if (!isMedia(checked) || new URL(checked.url).protocol !== 'https:') {
      return unavailable('network', '网易当前音源未通过 HTTPS 验证，请稍后重试');
    }
    // A conservative client re-resolution deadline, not a claim about the provider's signature lifetime.
    return { status: 'ready', provider: 'netease-outer', url: checked.url, expiresAt: new Date(Date.now() + 60000).toISOString(), preview: null };
  } catch {
    return unavailable('network', '网易公开外链请求失败或超时，请检查网络后重试');
  }
}
