/**
 * 构建脚本：把 assets/ 下所有壁纸（图片 + mp4 动态壁纸）与 GIF/ 下的开屏动图
 * 以 base64 data-URI 内嵌进 lib/client.js（DSH 只服务 client.js 一个文件）。
 * 用法：node build.cjs
 * 幂等：用注释标记包裹数据段，重复运行会替换掉上一次注入的内容。
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const templatePath = path.join(root, "lib", "client.template.js");
const clientPath = path.join(root, "lib", "client.js");
const assetsDir = path.join(root, "assets");

function b64(file) {
  return fs.readFileSync(file).toString("base64");
}
function mimeOf(ext) {
  switch (ext.toLowerCase()) {
    case ".mp4": return "video/mp4";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".mp3": return "audio/mpeg";
    case ".ogg": return "audio/ogg";
    case ".m4a": return "audio/mp4";
    case ".wav": return "audio/wav";
    default: return "application/octet-stream";
  }
}

// ── 0) 干净模式：--clean 时只打包 build.include.txt 里列出的壁纸 ──
const CLEAN = process.argv.includes("--clean");
let includeSet = null;
if (CLEAN) {
  const incPath = path.join(root, "build.include.txt");
  if (!fs.existsSync(incPath)) {
    console.error("ERROR: --clean 需要 build.include.txt 清单文件");
    process.exit(1);
  }
  includeSet = new Set(
    fs.readFileSync(incPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );
  console.log(`clean mode: 仅打包 build.include.txt 里的 ${includeSet.size} 个壁纸`);
}

// ── 1) 壁纸清单：视频优先（默认第一个），其余按文件名排序 ──
const mediaExts = [".mp4", ".jpg", ".jpeg", ".png", ".webp"];
let files = fs.readdirSync(assetsDir).filter((f) => mediaExts.includes(path.extname(f).toLowerCase()));
if (CLEAN) {
  files = files.filter((f) => includeSet.has("assets/" + f));
}
const vids = files.filter((f) => /\.mp4$/i.test(f)).sort();
const imgs = files.filter((f) => !/\.mp4$/i.test(f)).sort();
const ordered = [...vids, ...imgs];
const manifest = ordered.map((f) => {
  const ext = path.extname(f);
  const mime = mimeOf(ext);
  return { id: f, kind: /\.mp4$/i.test(f) ? "video" : "image", mime, data: `data:${mime};base64,${b64(path.join(assetsDir, f))}`, label: f };
});
console.log("wallpapers:");
manifest.forEach((m) => console.log(`  ${m.kind.padEnd(5)} ${m.label}  (b64 ${(m.data.length / 1048576).toFixed(1)} MB)`));

// ── 2) 开屏动图 ──
const gifDir = path.join(root, "GIF");
const gifs = fs.readdirSync(gifDir).filter((f) => /\.gif$/i.test(f));
if (gifs.length === 0) {
  console.error("ERROR: no .gif found in GIF/ directory");
  process.exit(1);
}
const gifUri = `data:image/gif;base64,${b64(path.join(gifDir, gifs[0]))}`;
console.log(`boot gif: ${gifs[0]}  (b64 ${(gifUri.length / 1048576).toFixed(1)} MB)`);

// ── 3) 背景音乐清单：优先「使一颗心免于哀伤」，其余按文件名排序 ──
const musicDir = path.join(root, "music");
let musicFiles = [];
if (fs.existsSync(musicDir)) {
  musicFiles = fs.readdirSync(musicDir).filter((f) => /\.(mp3|ogg|m4a|wav)$/i.test(f));
}
musicFiles.sort((a, b) => a.localeCompare(b, "zh"));
const preferredIdx = musicFiles.findIndex((f) => f.includes("使一颗心免于哀伤"));
if (preferredIdx > 0) {
  const [p] = musicFiles.splice(preferredIdx, 1);
  musicFiles.unshift(p);
}
// 排除清单（build.music-exclude.txt，一行一个文件名）——用于「先不把新添加音乐整合进 client.js」，便于测试手动添加
const musicExcludePath = path.join(root, "build.music-exclude.txt");
if (fs.existsSync(musicExcludePath)) {
  const excludeSet = new Set(
    fs.readFileSync(musicExcludePath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );
  const before = musicFiles.length;
  musicFiles = musicFiles.filter((f) => !excludeSet.has(f));
  if (musicFiles.length < before) console.log(`music: 按 build.music-exclude.txt 跳过 ${before - musicFiles.length} 首`);
}
const musicManifest = musicFiles.map((f) => {
  const ext = path.extname(f);
  return { id: f, mime: mimeOf(ext), data: `data:${mimeOf(ext)};base64,${b64(path.join(musicDir, f))}`, label: f.replace(/\.[^.]+$/, "") };
});
console.log("music:");
musicManifest.forEach((m) => console.log(`  ${m.label}  (b64 ${(m.data.length / 1048576).toFixed(1)} MB)`));

// ── 3.4) 内置歌曲默认封面：music/figure/ 下第一张图片（开箱即用的虚拟歌手「知更鸟」图）──
const figureDir = path.join(musicDir, "figure");
let defaultCoverUri = null;
if (fs.existsSync(figureDir)) {
  const figs = fs.readdirSync(figureDir).filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f)).sort();
  if (figs.length > 0) {
    const fc = figs[0];
    defaultCoverUri = `data:${mimeOf(path.extname(fc))};base64,${b64(path.join(figureDir, fc))}`;
    console.log(`default cover: ${fc}  (b64 ${(defaultCoverUri.length / 1048576).toFixed(2)} MB)`);
  } else {
    console.log("default cover: music/figure/ 为空，回退 ♪ 占位");
  }
} else {
  console.log("default cover: 无 music/figure/，回退 ♪ 占位");
}

// ── 3.5) 表情包（隐藏彩蛋）：GIF/表情包/ 下所有 .gif，id 取文件名 ──
const emoteDir = path.join(gifDir, "表情包");
const emoteManifest = [];
if (fs.existsSync(emoteDir)) {
  emoteManifest.push(...fs.readdirSync(emoteDir).filter((f) => /\.gif$/i.test(f)).sort((a, b) => a.localeCompare(b, "zh")).map((f) => ({
    id: f.replace(/\.[^.]+$/, ""),
    mime: "image/gif",
    data: `data:image/gif;base64,${b64(path.join(emoteDir, f))}`,
    label: f.replace(/\.[^.]+$/, ""),
  })));
}
console.log("emotes:");
emoteManifest.forEach((e) => console.log(`  ${e.id}  (b64 ${(e.data.length / 1048576).toFixed(1)} MB)`));

// ── 4) 注入 ──
let src = fs.readFileSync(templatePath, "utf8");
const manifestJson = JSON.stringify(manifest);
src = src.replace(
  /\/\*__FIREFLY_BG_MANIFEST_START__\*\/[\s\S]*?\/\*__FIREFLY_BG_MANIFEST_END__\*\//,
  `/*__FIREFLY_BG_MANIFEST_START__*/${manifestJson}/*__FIREFLY_BG_MANIFEST_END__*/`
);
src = src.replace(
  /\/\*__FIREFLY_GIF_START__\*\/[\s\S]*?\/\*__FIREFLY_GIF_END__\*\//,
  `/*__FIREFLY_GIF_START__*/${JSON.stringify(gifUri)}/*__FIREFLY_GIF_END__*/`
);
if (musicManifest.length > 0) {
  src = src.replace(
    /\/\*__FIREFLY_MUSIC_START__\*\/[\s\S]*?\/\*__FIREFLY_MUSIC_END__\*\//,
    `/*__FIREFLY_MUSIC_START__*/${JSON.stringify(musicManifest)}/*__FIREFLY_MUSIC_END__*/`
  );
}
if (emoteManifest.length > 0) {
  src = src.replace(
    /\/\*__FIREFLY_EMOTES_START__\*\/[\s\S]*?\/\*__FIREFLY_EMOTES_END__\*\//,
    `/*__FIREFLY_EMOTES_START__*/${JSON.stringify(emoteManifest)}/*__FIREFLY_EMOTES_END__*/`
  );
}
src = src.replace(
  /\/\*__FIREFLY_DEFAULT_COVER_START__\*\/[\s\S]*?\/\*__FIREFLY_DEFAULT_COVER_END__\*\//,
  `/*__FIREFLY_DEFAULT_COVER_START__*/${JSON.stringify(defaultCoverUri)}/*__FIREFLY_DEFAULT_COVER_END__*/`
);
fs.writeFileSync(clientPath, src);
console.log(`OK: built lib/client.js = ${(src.length / 1048576).toFixed(1)} MB`);
