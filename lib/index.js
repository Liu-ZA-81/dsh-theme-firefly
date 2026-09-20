/**
 * dsh-theme-firefly —— 服务端半。
 * 主题的全部 UI 逻辑在浏览器端（lib/client.js）。
 * 本文件提供两件事：
 *   1. apply：让 cordis.patch.yml 里的 loader 行可以挂载（没有 fiber 的行会导致 boot 扫描失败）。
 *   2. 静态资产路由：把 assets/、GIF/、music/ 下的壁纸/动图/音乐以
 *      /theme-firefly-assets/<相对路径> 提供（外置，不内联 base64），
 *      使 client.js 的聚合 bundle 保持小体积（实测内联 base64 会把
 *      lib/client.js 撑到 82MB，导致 client-modules 聚合 95MB、浏览器
 *      Failed to load plugins）。
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
};

/** 允许被静态服务的顶层目录（相对插件根）。 */
const ALLOWED_DIRS = new Set(['assets', 'GIF', 'music']);

/** 服务端半注册 HTTP 前缀路由（真实 API：webServer.register({kind:'prefix', path, handler})）。 */
export function registerAssets(ctx) {
  if (typeof ctx?.inject !== 'function') return false;
  let wired = false;
  ctx.inject(['webServer'], (wctx) => {
    const webServer = wctx?.get?.('webServer');
    if (!webServer?.register) return;
    try {
      webServer.register({
        kind: 'prefix',
        path: '/theme-firefly-assets',
        handler(req, res) {
          const url = new URL(req.url ?? '/', 'http://x');
          const rel = decodeURIComponent(url.pathname.replace(/^\/theme-firefly-assets\//, ''));
          const top = rel.split('/')[0];
          if (!ALLOWED_DIRS.has(top)) {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('not found');
            return;
          }
          const file = normalize(join(ROOT, rel));
          if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('not found');
            return;
          }
          const mime = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
          res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-cache' });
          createReadStream(file).pipe(res);
        },
      });
      wired = true;
    } catch (e) {
      /* 注册失败静默，主题其余部分照常 */
    }
  });
  return wired;
}

/** DSH 插件应用入口（DSH 调用）。 */
export function apply(ctx) {
  registerAssets(ctx);
}
