/**
 * dsh-theme-firefly 悬浮框独立预览启动器（不走 DSH 主流程，但接真实后端）.
 *
 * 用法：
 *   node start-preview.mjs            # 起本地静态服务器 + 打开浏览器
 *   node start-preview.mjs --no-open  # 只起服务器，不自动打开浏览器
 *   node start-preview.mjs --port 30999
 *   node start-preview.mjs --shot preview.png  # 用 playwright 截图自检（需 pwviewer）
 *   node start-preview.mjs --dsh http://127.0.0.1:30800 --token <launch-token>
 *
 * 原理：
 *   preview/preview.html 用垫片（__ModuleLoader__ + ctx.theme）直接执行真实
 *   lib/client.js，把主题悬浮框独立渲染出来——不依赖 DSH 主 GUI。
 *   本脚本起一个本地 HTTP 服务，充当「反向代理」：
 *     - preview.html / lib/client.js 走本地（主题根目录）
 *     - /theme-firefly-assets/* 全部转发到 DSH 真实后端（默认 http://127.0.0.1:30800）
 *       并自动完成 token 认证（GET /?token= → 拿 dsh-auth cookie → 后续请求带 cookie）。
 *   因此预览里的壁纸列表 / 上传 / 删除 / 素材加载，全部是真后端数据：
 *   上传的视频真实写入 DSH 的 $DSH_HOME/theme-firefly/wallpapers/，刷新/重启都在。
 *
 * token 获取优先级：--token 参数 > 环境变量 DSH_PREVIEW_TOKEN > 自动读 dsh-proxy.log（
 * 解析最近一次 ?token= 值，非侵入只读）。
 */
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));       // preview/
const THEME_ROOT = normalize(join(SCRIPT_DIR, '..'));             // 插件根

// ── 可配置项 ──
const DSH_BASE = process.env.DSH_PREVIEW_TARGET || 'http://127.0.0.1:30800'; // DSH 反代
// 反代日志（token 兜底来源）：优先环境变量 DSH_PROXY_LOG，否则按 DSH_HOME 推导（不硬编码路径）
const PROXY_LOG = process.env.DSH_PROXY_LOG || join(process.env.DSH_HOME || join(os.homedir(), '.dsh'), 'dsh-proxy.log');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
};

// ── CLI 参数 ──
const args = process.argv.slice(2);
const PORT = parseInt(args.find(a => a.startsWith('--port'))?.split('=')[1] || args[args.indexOf('--port') + 1] || '30999', 10);
const noOpen = args.includes('--no-open');
const shotPath = args.find(a => a.startsWith('--shot'))?.split('=')[1] || (args.includes('--shot') ? args[args.indexOf('--shot') + 1] : null);
const dshArg = args.find(a => a.startsWith('--dsh'))?.split('=')[1] || (args.includes('--dsh') ? args[args.indexOf('--dsh') + 1] : null);
const tokenArg = args.find(a => a.startsWith('--token'))?.split('=')[1] || (args.includes('--token') ? args[args.indexOf('--token') + 1] : null);
const TARGET = dshArg || DSH_BASE;

// ── token 解析：--token > env > dsh-proxy.log ──
function resolveToken() {
  if (tokenArg) return tokenArg;
  if (process.env.DSH_PREVIEW_TOKEN) return process.env.DSH_PREVIEW_TOKEN;
  try {
    if (!existsSync(PROXY_LOG)) return null;
    const txt = readFileSync(PROXY_LOG, 'utf8');
    const m = txt.match(/token=([a-zA-Z0-9_-]{20,})/g);
    if (m && m.length) {
      const last = m[m.length - 1].replace('token=', '');
      return last;
    }
  } catch { /* 读不到就 null */ }
  return null;
}

// ── DSH 会话：认证 cookie 缓存 ──
let authCookie = null;   // 已认证的 cookie 串
let cookieFromToken = null; // 通过 token 建立会话得到的 cookie
const COOKIE_RE = /(dsh-auth|_DSH|dsh_)[^;]*/i;

async function ensureAuthCookie() {
  if (authCookie) return authCookie;
  const token = resolveToken();
  if (!token) return null;
  // GET /?token=xxx → 303 + Set-Cookie
  return new Promise((resolve) => {
    const target = new URL(TARGET);
    const req = httpRequest({
      hostname: target.hostname, port: target.port, path: '/?token=' + encodeURIComponent(token), method: 'GET',
      headers: { host: target.host, connection: 'close' }, // 强制新连接，避免复用反代坏 keep-alive
    }, (res) => {
      const setCookies = res.headers['set-cookie'] || [];
      const c = setCookies.map(s => s.split(';')[0]).join('; ');
      if (c) { authCookie = c; }
      res.resume();
      resolve(authCookie);
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

/** 转发一个浏览器请求到 DSH 真实后端。 */
function proxyToDsh(req, res, upstreamPath) {
  const t0 = Date.now();
  let bodyBytes = 0;
  console.log('[proxy] REQHEAD', req.method, upstreamPath, JSON.stringify(req.headers));
  req.on('data', (c) => { bodyBytes += c.length; });
  ensureAuthCookie().then((cookie) => {
    if (!cookie) {
      console.log(`[proxy] ${req.method} ${upstreamPath} → 502 no-cookie (${Date.now() - t0}ms)`);
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('preview: 无法认证 DSH 后端（未提供 --token 且 proxy.log 无 token）');
      return;
    }
    const target = new URL(TARGET);
    const headers = { ...req.headers, host: target.host, cookie, connection: 'close' };
    // 流式转发：删除 content-length 让 Node 用 chunked 处理，避免长度不匹配挂起（实测保留会卡死转发）
    delete headers['content-length'];
    console.log('[proxy] FWDHEAD', JSON.stringify(headers));
    const upstream = httpRequest({
      hostname: target.hostname, port: target.port, path: upstreamPath, method: req.method, headers,
    }, (up) => {
      const outHeaders = { ...up.headers };
      delete outHeaders['set-cookie']; // 不把 DSH cookie 回给预览页
      delete outHeaders['content-length'];
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
      up.on('end', () => {
        console.log(`[proxy] ${req.method} ${upstreamPath} → ${up.statusCode} body=${bodyBytes}B ${Date.now() - t0}ms`);
      });
      up.on('close', () => {
        console.log(`[proxy] ${req.method} ${upstreamPath} → CLOSE(no-response?) body=${bodyBytes}B ${Date.now() - t0}ms`);
      });
    });
    upstream.on('error', (e) => {
      console.log(`[proxy] ${req.method} ${upstreamPath} → ERROR ${e.message} body=${bodyBytes}B ${Date.now() - t0}ms`);
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('preview: 转发 DSH 失败 ' + e.message);
    });
    req.pipe(upstream);
  });
}

function send(res, status, body, type) {
  res.writeHead(status, { 'content-type': type || 'text/plain; charset=utf-8', 'cache-control': 'no-cache' });
  res.end(body);
}

function serveFile(res, file) {
  if (!existsSync(file) || !statSync(file).isFile()) { send(res, 404, 'not found'); return; }
  const mime = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const pathname = decodeURIComponent(url.pathname);

  // 根 → 预览页
  if (pathname === '/' || pathname === '/index.html') { serveFile(res, join(SCRIPT_DIR, 'preview.html')); return; }

  // /lib/* → 插件根 lib/（preview.html 里 ../lib/client.js 在 HTTP 下规范化为 /lib/client.js）
  if (pathname.startsWith('/lib/')) {
    const file = normalize(join(THEME_ROOT, pathname.replace(/^\/lib\//, 'lib/')));
    if (file.startsWith(join(THEME_ROOT, 'lib'))) { serveFile(res, file); return; }
    send(res, 403, 'forbidden'); return;
  }

  // /theme-firefly-assets/* → 真实 DSH 后端（含 upload / list / DELETE / 静态素材）
  if (pathname.startsWith('/theme-firefly-assets/')) {
    const upstreamPath = req.url; // 原样转发（保留 query：?name= 等）
    if (req.method === 'GET' && pathname === '/theme-firefly-assets/ping') {
      send(res, 200, 'pong', 'text/plain'); return;
    }
    proxyToDsh(req, res, upstreamPath);
    return;
  }

  // 其余 → 404
  send(res, 404, 'not found');
});

async function openBrowser() {
  if (noOpen || !existsSync(join(SCRIPT_DIR, '..', '..', 'pwviewer', 'node_modules', 'playwright'))) return;
  try {
    const { chromium } = await import('/volume1/VirtualDSM/DeepSeekHarness/pwviewer/node_modules/playwright/index.mjs');
    const CHROME = '/volume1/VirtualDSM/DeepSeekHarness/pwviewer/browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process','--disable-fontconfig'] });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(4000);
    const state = await page.evaluate(() => ({
      dock: !!document.querySelector('.ff-dock'),
      buttons: document.querySelector('.ff-dock') ? document.querySelector('.ff-dock').querySelectorAll('button').length : 0,
      style: !!document.querySelector('style[data-firefly-theme]'),
    }));
    console.log('[shot] 悬浮框渲染:', JSON.stringify(state));
    if (shotPath) await page.screenshot({ path: shotPath });
    await browser.close();
    if (shotPath) console.log('[shot] 截图已存:', shotPath);
  } catch (e) {
    console.log('[shot] playwright 自检跳过（', e.message?.slice(0, 80), '）——真实浏览器打开即可预览');
  }
}

server.listen(PORT, '0.0.0.0', async () => {
  const token = resolveToken();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  dsh-theme-firefly 悬浮框预览（接真实后端）        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('  预览页:  http://127.0.0.1:' + PORT + '/');
  console.log('  后端:    ' + TARGET + '（/theme-firefly-assets/* 真实转发）');
  console.log('  token:   ' + (token ? '已自动获取（' + token.slice(0, 8) + '…）' : '⚠ 未找到，上传/列表将不可用（用 --token 指定）'));
  console.log('  数据库:  真实 DSH $DSH_HOME/theme-firefly/wallpapers/（非独立目录）');
  console.log('  停止: Ctrl+C');
  await openBrowser();
});