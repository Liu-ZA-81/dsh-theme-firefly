/**
 * dsh-theme-firefly —— 崩坏：星穹铁道 · 流萤主题（浏览器端）
 *
 * 实现机制与 dsh-theme-cyberpunk2077 相同：
 *   1. window.__ModuleLoader__.load() 注册为 DSH 客户端模块；
 *   2. 导出 { isPlugin, inject: ["theme"], apply }；
 *   3. apply(ctx) 里 ctx.theme.register({ id, colorScheme, tokens }) 注册
 *      设计令牌（--dsw-* 变量）并 setTheme 激活；
 *   4. 注入身份层 <style>：
 *      - 壁纸背景（图片或 mp4 动态壁纸，可切换；build.cjs 内嵌 base64）
 *      - 开屏动画：内嵌 GIF（build.cjs 注入 base64）
 *      - 萤火绿霓虹配色、萤火氛围粒子、打字音效、彩蛋
 *
 * 构建：node build.cjs （收集 assets/ 下所有壁纸 + GIF/ 动图，内嵌进本文件）
 */
window.__ModuleLoader__.load({
	id: "dsh-theme-firefly",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const THEME_ID = "dsh-theme-firefly";
		const LS_AMBIENCE = "ff_ambience";
		const LS_TYPESOUND = "ff_type";
		const LS_BG = "ff_bg_id";
		const LS_BG_MODE = "ff_bg_mode";
		const LS_BG_INTERVAL = "ff_bg_interval";

		// ── 共享 IndexedDB（壁纸 / 音乐 / 封面 三张表，v2 起）──
		const FF_DB_NAME = "dsh-theme-firefly";
		const FF_DB_VERSION = 2;
		function ffIdbOpen() {
			return new Promise((resolve, reject) => {
				if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
				const req = indexedDB.open(FF_DB_NAME, FF_DB_VERSION);
				req.onupgradeneeded = () => {
					const db = req.result;
					["wallpapers", "music", "covers"].forEach((s) => {
						if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
					});
				};
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		}
		function ffIdbGetAll(store) {
			return ffIdbOpen().then((db) => new Promise((resolve) => {
				const req = db.transaction(store, "readonly").objectStore(store).getAll();
				req.onsuccess = () => { db.close(); resolve(req.result || []); };
				req.onerror = () => { db.close(); resolve([]); };
			})).catch(() => []);
		}
		function ffIdbPut(store, record) {
			return ffIdbOpen().then((db) => new Promise((resolve) => {
				const tx = db.transaction(store, "readwrite");
				tx.objectStore(store).put(record);
				tx.oncomplete = () => { db.close(); resolve(); };
				tx.onerror = () => { db.close(); resolve(); };
			})).catch(() => {});
		}
		function ffIdbDelete(store, key) {
			return ffIdbOpen().then((db) => new Promise((resolve) => {
				const tx = db.transaction(store, "readwrite");
				tx.objectStore(store).delete(key);
				tx.oncomplete = () => { db.close(); resolve(); };
				tx.onerror = () => { db.close(); resolve(); };
			})).catch(() => {});
		}

		// ═══════════ 1. 设计令牌层：流萤配色 ═══════════
		// 深空海军蓝黑 × 萤火虫青绿（#00ff87 / #7dff9e）× 莹白文字
		const TOKENS = {
			// 背景：半透明深空蓝黑（让壁纸透出来；bg-base 是根容器，要最透明）
			"--dsw-alias-bg-base": "rgba(6, 10, 20, 0.30)",
			"--dsw-alias-bg-layer-1": "rgba(10, 16, 30, 0.52)",
			"--dsw-alias-bg-layer-2": "rgba(13, 21, 37, 0.72)",
			"--dsw-alias-bg-layer-3": "rgba(17, 27, 45, 0.80)",
			"--dsw-alias-bg-overlay": "rgba(15, 25, 43, 0.92)",
			"--dsw-alias-bg-module-platform": "rgba(8, 14, 26, 0.84)",
			"--dsw-alias-bg-multi-select": "rgba(15, 25, 43, 0.90)",
			"--dsw-alias-bg-skeleton": "rgba(0, 255, 135, 0.07)",
			"--dsw-alias-bg-mask-1": "rgba(3, 7, 15, 0.72)",
			"--dsw-alias-bg-mask-2": "rgba(3, 7, 15, 0.40)",
			"--dsw-alias-bg-mask-drop": "rgba(4, 8, 18, 0.72)",

			// 文字：莹白 / 薄荷灰
			"--dsw-alias-label-primary": "#eafff3",
			"--dsw-alias-label-secondary": "#a9c9b9",
			"--dsw-alias-label-tertiary": "#6f8a7c",
			"--dsw-alias-label-caption": "#8fb8a4",
			"--dsw-alias-label-dimmed": "#546f60",
			"--dsw-alias-label-primary-foreground": "#06240f",
			"--dsw-alias-label-primary-inverted": "#06240f",

			// 品牌：流萤绿
			"--dsw-alias-brand-primary": "#7dff9e",
			"--dsw-alias-brand-text": "#7dff9e",
			"--dsw-alias-brand-primary-invert": "#042b11",

			// 按钮
			"--dsw-alias-button-primary-fill": "#00e676",
			"--dsw-alias-button-primary-hover": "#2bf58a",
			"--dsw-alias-button-primary-dimmed": "rgba(0, 230, 118, 0.14)",
			"--dsw-alias-button-contrast-fill": "#eafff3",
			"--dsw-alias-button-elevated-fill": "#0e1628",
			"--dsw-alias-button-floating-fill": "#0c1424",
			"--dsw-alias-button-floating-hover": "#122036",
			"--dsw-alias-button-ghost-active-fill": "#0f1c30",
			"--dsw-alias-button-ghost-active-hover": "#16283f",
			"--dsw-alias-button-info-fill": "#00c78a",
			"--dsw-alias-button-info-hover": "#00ff9d",
			"--dsw-alias-button-tool-bar-fill": "rgba(0, 255, 135, 0.12)",
			"--dsw-alias-button-tool-bar-hover": "rgba(0, 255, 135, 0.20)",
			"--dsw-alias-button-ghost-active-border": "#00ff87",

			// 交互
			"--dsw-alias-interactive-bg-hover": "rgba(0, 255, 135, 0.09)",
			"--dsw-alias-interactive-bg-active": "rgba(0, 255, 135, 0.16)",
			"--dsw-alias-interactive-bg-hover-accent": "rgba(125, 255, 158, 0.15)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(255, 93, 122, 0.15)",

			// 边框
			"--dsw-alias-border-l1": "rgba(0, 255, 135, 0.13)",
			"--dsw-alias-border-l2": "rgba(0, 255, 135, 0.22)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(0, 255, 135, 0.10)",
			"--dsw-alias-border-l3": "rgba(125, 255, 158, 0.25)",
			"--dsw-alias-border-l4": "rgba(0, 255, 135, 0.38)",

			// 状态
			"--dsw-alias-state-success-primary": "#00ff87",
			"--dsw-alias-state-success-secondary": "rgba(0, 255, 135, 0.16)",
			"--dsw-alias-state-success-tertiary": "rgba(0, 255, 135, 0.08)",
			"--dsw-alias-state-error-primary": "#ff5d7a",
			"--dsw-alias-state-error-secondary": "rgba(255, 93, 122, 0.16)",
			"--dsw-alias-state-warn-primary": "#ffd93b",
			"--dsw-alias-state-warn-secondary": "rgba(255, 217, 59, 0.16)",
			"--dsw-alias-state-business-primary": "#00e6a0",
			"--dsw-alias-state-business-tertiary": "rgba(0, 230, 160, 0.10)",

			// toast / tooltip / markdown / 滚动条
			"--dsw-alias-toast-bg": "rgba(8, 14, 26, 0.92)",
			"--dsw-alias-tooltip-bg": "rgba(8, 14, 26, 0.95)",
			"--dsw-alias-markdown-inline-code": "rgba(0, 255, 135, 0.12)",
			"--dsw-alias-markdown-code-block": "rgba(4, 9, 18, 0.70)",
			"--dsw-alias-markdown-code-block-banner": "rgba(0, 255, 135, 0.06)",
			"--dsw-alias-scrollbar-bg-l1": "rgba(0, 255, 135, 0.15)",
			"--dsw-alias-scrollbar-bg-l2": "rgba(0, 255, 135, 0.22)",
			"--dsw-alias-scrollbar-hover-l1": "rgba(0, 255, 135, 0.30)",
			"--dsw-alias-scrollbar-hover-l2": "rgba(0, 255, 135, 0.42)",

			// 组件特化
			"--dsw-specific-sidebar-fill": "rgba(6, 11, 22, 0.88)",
			"--dsw-specific-sidebar-nav-item-active": "rgba(0, 255, 135, 0.12)",
			"--dsw-specific-sidebar-nav-item-active-accent": "#00ff87",
			"--dsw-specific-sidebar-nav-item-hover": "rgba(0, 255, 135, 0.07)",
			"--dsw-specific-bubble": "rgba(12, 20, 36, 0.88)",
			"--dsw-specific-bubble-highlight": "rgba(0, 255, 135, 0.08)",
			"--dsw-specific-input-major": "rgba(8, 14, 26, 0.85)",
			"--dsw-specific-menu": "rgba(8, 14, 26, 0.94)",
			"--dsw-specific-selector": "rgba(10, 16, 30, 0.90)",
			"--dsw-specific-tip": "rgba(0, 255, 135, 0.10)",
		};

		// ═══════════ 2. 素材（base64，由 build.cjs 注入）═══════════
		// 壁纸清单：{ id, kind: "image"|"video", mime, data: dataURI, label }
		const WALLPAPERS = /*__FIREFLY_BG_MANIFEST_START__*/[]/*__FIREFLY_BG_MANIFEST_END__*/;
		// 开屏变身动图
		const GIF_DATA = /*__FIREFLY_GIF_START__*/""/*__FIREFLY_GIF_END__*/;
		// 背景音乐清单（build.cjs 注入）：{ id, mime, data: dataURI, label }
		const MUSIC = /*__FIREFLY_MUSIC_START__*/[]/*__FIREFLY_MUSIC_END__*/;
		// 内置歌曲开箱即用默认封面（虚拟歌手「知更鸟」图片，build.cjs 从 music/figure/ 注入）
		const DEFAULT_COVER = /*__FIREFLY_DEFAULT_COVER_START__*/null/*__FIREFLY_DEFAULT_COVER_END__*/;
		// 表情包（隐藏彩蛋，build.cjs 注入）：{ id, mime, data, label }，id 为文件名（开心/得意/变身/疑惑/没错/期待）
		const EMOTES = /*__FIREFLY_EMOTES_START__*/[]/*__FIREFLY_EMOTES_END__*/;

		// ═══════════ 3. 身份层 CSS ═══════════
		function identityCSS() {
			const tokenLines = Object.entries(TOKENS)
				.map(([name, value]) => "  " + name + ": " + value + " !important;")
				.join("\n");
			return [
				"html { color-scheme: dark !important; background: #050a14 !important; }",
				"body {",
				"  background-color: transparent !important;",
				"  color: #eafff3;",
				"  --dsw-font-family: 'MiSans', 'PingFang SC', 'Microsoft YaHei', -apple-system, 'Segoe UI', sans-serif;",
				"  --ds-font-family-code: 'SF Mono', 'JetBrains Mono', Consolas, Menlo, 'PingFang SC', monospace;",
				tokenLines,
				"}",

				// 壁纸背景层（z -2）+ 可读性遮罩（z -1）
				".ff-bg { position: fixed; inset: 0; z-index: -2; pointer-events: none; overflow: hidden;",
				"  background-color: #050a14; background-position: center; background-size: cover; background-repeat: no-repeat; }",
				".ff-bg video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }",
				".ff-bg-shade { position: fixed; inset: 0; z-index: -1; pointer-events: none;",
				"  background:",
				"    linear-gradient(100deg, rgba(4,8,18,0.72) 0%, rgba(4,8,18,0.52) 32%, rgba(4,8,18,0.20) 66%, rgba(4,8,18,0.06) 100%),",
				"    linear-gradient(180deg, rgba(4,8,18,0.40) 0%, rgba(4,8,18,0.02) 30%),",
				"    radial-gradient(90% 60% at 85% 10%, rgba(0,255,135,0.10), transparent 60%); }",

				"::selection { background: rgba(0, 255, 135, 0.25); color: #eafff3; }",

				// 萤火氛围粒子（分档：关/星点/曳光/流萤，数量渐变）
				".ff-amb { position: fixed; inset: 0; pointer-events: none; z-index: 60; overflow: hidden; }",
				".ff-amb i { position: absolute; bottom: -14px; left: 0; opacity: 0;",
				"  transition: opacity 0.9s ease;",
				"  animation: ffFloat var(--dur, 20s) linear var(--delay, -5s) infinite;",
				"  will-change: transform, opacity; }",
				".ff-amb i.on { opacity: 1; }",
				".ff-amb i span { display: block; border-radius: 50%; background: #7dff9e;",
				"  box-shadow: 0 0 8px 2px rgba(125,255,158,0.55); opacity: var(--op, 0.6);",
				"  animation: ffTwinkle 3.2s ease-in-out infinite; }",
				"@keyframes ffTwinkle { 0%, 100% { opacity: calc(var(--op, 0.6) * 0.45); } 50% { opacity: var(--op, 0.6); } }",
				"@keyframes ffFloat { 0% { transform: translate3d(0, 0, 0); }",
				"  100% { transform: translate3d(var(--drift, 24px), -110vh, 0); } }",
				// 右下角可拖动工具条（毛玻璃长条圆角，位置记忆）
				".ff-dock { position: fixed; right: 12px; bottom: 12px; z-index: 90; display: flex; align-items: center; gap: 7px;",
				"  padding: 6px 8px; border-radius: 999px; background: rgba(10, 18, 32, 0.42);",
				"  border: 1px solid rgba(125, 255, 158, 0.28); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);",
				"  backdrop-filter: blur(14px) saturate(150%); -webkit-backdrop-filter: blur(14px) saturate(150%);",
				"  cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; }",
				".ff-dock.dragging { cursor: grabbing; }",
				".ff-dock-btn { width: 30px; height: 30px; border-radius: 50%; font-size: 13px; line-height: 1;",
				"  color: rgba(170, 230, 200, 0.75); background: rgba(10, 18, 32, 0.5);",
				"  border: 1px solid rgba(125, 255, 158, 0.35); cursor: pointer; opacity: 0.55; padding: 0;",
				"  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease; }",
				".ff-dock-btn:hover { opacity: 1; }",
				".ff-amb-toggle.on, .ff-music-toggle.on { opacity: 1; color: #7dff9e; box-shadow: 0 0 10px rgba(0, 255, 135, 0.4); }",
				".ff-snd-toggle.off { opacity: 0.28; }",
				".ff-amb-menu { position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 92; display: none; flex-direction: column;",
				"  gap: 5px; background: rgba(10,18,32,0.88); border: 1px solid rgba(125,255,158,0.35);",
				"  border-radius: 10px; padding: 7px; box-shadow: 0 6px 24px rgba(0,0,0,0.4); }",
				".ff-amb-menu.open { display: flex; }",
				".ff-amb-opt { min-width: 64px; height: 26px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.25);",
				"  background: rgba(0,255,135,0.07); color: rgba(200,255,225,0.88); cursor: pointer; font-size: 12px; padding: 0 8px; }",
				".ff-amb-opt:hover { background: rgba(0,255,135,0.16); }",
				".ff-amb-opt.active { background: rgba(0,255,135,0.22); color: #7dff9e; border-color: rgba(125,255,158,0.55); }",
				".ff-bg-panel { position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 92; display: none; flex-direction: column;",
				"  gap: 8px; min-width: 212px; background: rgba(10,18,32,0.9); border: 1px solid rgba(125,255,158,0.35);",
				"  border-radius: 10px; padding: 10px 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.4); backdrop-filter: blur(6px); }",
				".ff-bg-panel.open { display: flex; }",
				".ff-bg-title { font-size: 12px; letter-spacing: 2px; color: rgba(170,230,200,0.85); }",
				".ff-bg-line { display: flex; align-items: center; gap: 6px; }",
				".ff-bg-label { font-size: 12px; color: rgba(170,230,200,0.7); min-width: 52px; }",
				".ff-bg-seg { flex: 1; height: 26px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.25);",
				"  background: rgba(0,255,135,0.07); color: rgba(200,255,225,0.88); cursor: pointer; font-size: 12px; padding: 0 6px; }",
				".ff-bg-seg:hover { background: rgba(0,255,135,0.16); }",
				".ff-bg-seg.active { background: rgba(0,255,135,0.24); color: #7dff9e; border-color: rgba(125,255,158,0.55); }",
				".ff-bg-seg:disabled { opacity: 0.32; cursor: not-allowed; }",
				".ff-bg-interval { flex: 1; height: 26px; min-width: 0; border-radius: 6px; border: 1px solid rgba(125,255,158,0.25);",
				"  background: rgba(0,255,135,0.07); color: rgba(220,255,235,0.95); font-size: 12px; padding: 0 8px; }",
				".ff-bg-unit { font-size: 12px; color: rgba(170,230,200,0.7); }",
				".ff-bg-ok { height: 28px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.4);",
				"  background: rgba(0,255,135,0.16); color: #c9ffe0; cursor: pointer; font-size: 13px; }",
				".ff-bg-ok:hover { background: rgba(0,255,135,0.26); }",
				".ff-bg-add { height: 28px; border-radius: 6px; border: 1px dashed rgba(125,255,158,0.45);",
				"  background: transparent; color: rgba(190,255,220,0.85); cursor: pointer; font-size: 13px; }",
				".ff-bg-add:hover { background: rgba(0,255,135,0.12); }",
				".ff-bg-picker { position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 93; display: none; flex-direction: column;",
				"  gap: 8px; width: 430px; max-width: calc(100vw - 24px); max-height: calc(100vh - 80px); background: rgba(10,18,32,0.95);",
				"  border: 1px solid rgba(125,255,158,0.35); border-radius: 10px; padding: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.45); }",
				".ff-bg-picker.open { display: flex; }",
				".ff-bg-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
				".ff-bg-picker-title { font-size: 12px; letter-spacing: 2px; color: rgba(170,230,200,0.85); }",
				".ff-bg-close { width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(125,255,158,0.3);",
				"  background: rgba(0,255,135,0.08); color: rgba(190,255,220,0.85); cursor: pointer; font-size: 12px; line-height: 1; padding: 0; }",
				".ff-bg-close:hover { background: rgba(0,255,135,0.2); color: #eafff3; }",
				".ff-bg-picker-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-content: start;",
				"  max-height: min(690px, calc(100vh - 210px)); overflow-y: auto; overscroll-behavior: contain; padding-right: 2px;",
				"  scrollbar-width: thin; scrollbar-color: rgba(0,255,135,0.35) rgba(255,255,255,0.04); }",
				".ff-bg-picker-list::-webkit-scrollbar { width: 8px; }",
				".ff-bg-picker-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 8px; }",
				".ff-bg-picker-list::-webkit-scrollbar-thumb { background: rgba(0,255,135,0.35); border-radius: 8px; }",
				".ff-bg-picker-list::-webkit-scrollbar-thumb:hover { background: rgba(0,255,135,0.55); }",
				".ff-bg-picker-empty { grid-column: 1 / -1; text-align: center; color: rgba(170,230,200,0.55); font-size: 12px; padding: 30px 0; }",
				".ff-bg-picker-item { position: relative; display: flex; flex-direction: column; gap: 4px; align-items: center; background: transparent;",
				"  min-width: 0; border: 1px solid rgba(125,255,158,0.2); border-radius: 8px; padding: 4px; cursor: pointer;",
				"  color: rgba(200,255,225,0.85); font-size: 11px; transition: border-color 0.15s ease, background 0.15s ease; }",
				".ff-bg-picker-item:hover { border-color: rgba(125,255,158,0.55); background: rgba(0,255,135,0.1); }",
				".ff-bg-picker-item.checked { border-color: #7dff9e; background: rgba(0,255,135,0.14); box-shadow: 0 0 10px rgba(0,255,135,0.2); }",
				".ff-bg-picker-item img, .ff-bg-picker-item video { width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 5px; background: #050a14; }",
				".ff-bg-picker-item span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 14px; height: 14px; }",
				".ff-bg-check { position: absolute; top: 6px; right: 6px; width: 16px; height: 16px; margin: 0; cursor: pointer;",
				"  accent-color: #00ff87; z-index: 2; }",
				".ff-bg-picker-actions { display: flex; gap: 8px; }",
				".ff-bg-act { flex: 1; height: 28px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.35);",
				"  background: rgba(0,255,135,0.1); color: rgba(200,255,225,0.9); cursor: pointer; font-size: 12px; }",
				".ff-bg-act:hover:not(:disabled) { background: rgba(0,255,135,0.22); }",
				".ff-bg-act:disabled { opacity: 0.35; cursor: not-allowed; }",
				".ff-bg-act.ff-bg-remove { color: #ffb3c0; border-color: rgba(255,93,122,0.4); background: rgba(255,93,122,0.1); }",
				".ff-bg-act.ff-bg-remove:hover:not(:disabled) { background: rgba(255,93,122,0.22); }",
				".ff-emote { position: fixed; right: 14px; bottom: 92px; z-index: 96; pointer-events: none;",
				"  opacity: 0; transform: translateY(8px) scale(0.9); transition: opacity 0.25s ease, transform 0.25s ease; }",
				".ff-emote img { display: block; max-width: min(34vw, 320px); max-height: min(38vh, 300px);",
				"  border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 40px rgba(0,255,135,0.25); }",
				".ff-emote.show { opacity: 1; transform: translateY(0) scale(1); }",
				".ff-music-card { position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 91; width: 252px; max-width: calc(100vw - 24px);",
				"  background: rgba(10,18,32,0.85); border: 1px solid rgba(125,255,158,0.35); border-radius: 10px;",
				"  padding: 10px 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;",
				"  box-shadow: 0 6px 24px rgba(0,0,0,0.4); backdrop-filter: blur(6px); }",
				".ff-music-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
				".ff-music-title { font-size: 12px; color: rgba(190,255,220,0.92); white-space: nowrap; overflow: hidden;",
				"  text-overflow: ellipsis; flex: 1; }",
				".ff-music-close { background: transparent; border: none; color: rgba(170,230,200,0.7); cursor: pointer;",
				"  font-size: 14px; line-height: 1; padding: 0 2px; }",
				".ff-music-close:hover { color: #eafff3; }",
				".ff-music-row { display: flex; gap: 6px; }",
				".ff-music-btn { flex: 1; height: 28px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.3);",
				"  background: rgba(0,255,135,0.08); color: rgba(200,255,225,0.9); cursor: pointer; font-size: 13px;",
				"  line-height: 1; padding: 0; }",
				".ff-music-btn:hover { background: rgba(0,255,135,0.18); }",
				".ff-music-mode { flex: 1.4; font-size: 11px; }",

				// ── 播放器：旋转唱片 / 进度条 / 歌单选择 / 封面 ──
				".ff-music-shrink { background: transparent; border: 1px solid rgba(125,255,158,0.3); color: rgba(170,230,200,0.75);",
				"  cursor: pointer; font-size: 11px; line-height: 1; padding: 3px 5px; border-radius: 5px; }",
				".ff-music-shrink:hover { color: #eafff3; background: rgba(0,255,135,0.12); }",
				".ff-music-mini { position: absolute; right: calc(100% + 8px); bottom: 0; z-index: 94; display: none; flex-direction: column; align-items: center; gap: 8px; padding: 10px; border-radius: 16px; background: rgba(10,18,32,0.62); border: 1px solid rgba(125,255,158,0.28); box-shadow: 0 6px 24px rgba(0,0,0,0.35); backdrop-filter: blur(14px) saturate(150%); -webkit-backdrop-filter: blur(14px) saturate(150%); }",
				".ff-music-mini.open { display: flex; }",
				".ff-music-mini .ff-music-disc-wrap { width: 200px; height: 200px; margin: 0; flex: 0 0 auto; }",
				".ff-music-mini .ff-music-seek-row { width: 172px; flex: 0 0 auto; gap: 6px; }",
				".ff-music-mini .ff-music-time { min-width: 28px; font-size: 10px; }",
				".ff-music-mini-bar { display: flex; gap: 6px; }",
				".ff-music-mini-expand, .ff-music-mini-disc { flex: 0 0 auto; background: transparent; border: 1px solid rgba(125,255,158,0.3); color: rgba(170,230,200,0.8); cursor: pointer; font-size: 10px; line-height: 1; padding: 5px 7px; border-radius: 6px; white-space: nowrap; }",
				".ff-music-mini-expand:hover, .ff-music-mini-disc:hover { color: #eafff3; background: rgba(0,255,135,0.14); }",
				".ff-music-mini.compact { flex-direction: row; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 999px; }",
				".ff-music-mini.compact .ff-music-disc-wrap { display: none; }",
				".ff-music-mini.compact .ff-music-seek-row { width: 118px; gap: 5px; }",
				".ff-music-mini.compact .ff-music-time { min-width: 26px; font-size: 9px; }",
				".ff-music-disc-wrap { position: relative; width: 150px; height: 150px; margin: 0 auto; }",
				".ff-music-disc { position: absolute; inset: 0; border-radius: 50%; cursor: pointer;",
				"  background:",
				"    radial-gradient(circle at 50% 50%, rgba(0,255,135,0.05) 0%, rgba(0,255,135,0) 58%),",
				"    repeating-radial-gradient(circle at 50% 50%, #101a2c 0 2px, #0a1322 3px 5px);",
				"  box-shadow: 0 6px 22px rgba(0,0,0,0.55), 0 0 0 1px rgba(125,255,158,0.12), 0 0 24px rgba(0,255,135,0.12);",
				"  animation: ffSpin 8s linear infinite; animation-play-state: paused; }",
				".ff-music-disc.playing { animation-play-state: running; }",
				"@keyframes ffSpin { to { transform: rotate(360deg); } }",
				".ff-music-cover { position: absolute; left: 18%; top: 18%; width: 64%; height: 64%; border-radius: 50%;",
				"  background-size: cover; background-position: center; background-color: #0a1322;",
				"  display: flex; align-items: center; justify-content: center; overflow: hidden;",
				"  box-shadow: inset 0 0 14px rgba(0,0,0,0.65);",
				"  background-image: radial-gradient(circle at 50% 38%, rgba(0,255,135,0.30), rgba(0,230,118,0.06) 62%, transparent 80%),",
				"    linear-gradient(160deg, #123a28, #072013); }",
				".ff-music-lbl { font-size: 30px; font-weight: 800; color: rgba(234,255,243,0.92);",
				"  text-shadow: 0 0 14px rgba(125,255,158,0.8); pointer-events: none; line-height: 1; }",
				".ff-music-hub { position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px;",
				"  border-radius: 50%; background: #050a14; box-shadow: inset 0 0 0 2px rgba(234,255,243,0.9), 0 0 6px rgba(0,255,135,0.6); }",
				".ff-music-seek-row { display: flex; align-items: center; gap: 6px; }",
				".ff-music-time { font-size: 10px; color: rgba(170,230,200,0.72); font-variant-numeric: tabular-nums;",
				"  min-width: 30px; text-align: center; }",
				".ff-music-seek { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px;",
				"  background: rgba(125,255,158,0.18); outline: none; cursor: pointer; }",
				".ff-music-seek::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%;",
				"  background: #7dff9e; box-shadow: 0 0 6px rgba(0,255,135,0.7); }",
				".ff-music-seek::-moz-range-thumb { width: 10px; height: 10px; border: none; border-radius: 50%;",
				"  background: #7dff9e; box-shadow: 0 0 6px rgba(0,255,135,0.7); }",

				// ── 歌单选择面板（勾选后移除 / 随机，类似壁纸选择器）──
				".ff-ms-picker { position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 93; display: none; flex-direction: column;",
				"  gap: 8px; width: 320px; max-width: calc(100vw - 24px); max-height: calc(100vh - 80px); background: rgba(10,18,32,0.95);",
				"  border: 1px solid rgba(125,255,158,0.35); border-radius: 10px; padding: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.45); }",
				".ff-ms-picker.open { display: flex; }",
				".ff-ms-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
				".ff-ms-picker-title { font-size: 12px; letter-spacing: 2px; color: rgba(170,230,200,0.85); }",
				".ff-ms-picker-list { display: flex; flex-direction: column; gap: 4px; align-content: start;",
				"  max-height: min(400px, calc(100vh - 210px)); overflow-y: auto; overscroll-behavior: contain; padding-right: 2px;",
				"  scrollbar-width: thin; scrollbar-color: rgba(0,255,135,0.35) rgba(255,255,255,0.04); }",
				".ff-ms-picker-list::-webkit-scrollbar { width: 8px; }",
				".ff-ms-picker-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 8px; }",
				".ff-ms-picker-list::-webkit-scrollbar-thumb { background: rgba(0,255,135,0.35); border-radius: 8px; }",
				".ff-ms-picker-list::-webkit-scrollbar-thumb:hover { background: rgba(0,255,135,0.55); }",
				".ff-ms-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; cursor: pointer;",
				"  min-width: 0; border: 1px solid rgba(125,255,158,0.15); background: rgba(0,255,135,0.05); color: rgba(200,255,225,0.9);",
				"  font-size: 12px; transition: border-color 0.15s ease, background 0.15s ease; }",
				".ff-ms-item:hover { border-color: rgba(125,255,158,0.55); background: rgba(0,255,135,0.1); }",
				".ff-ms-item.checked { border-color: #7dff9e; background: rgba(0,255,135,0.14); box-shadow: 0 0 10px rgba(0,255,135,0.2); }",
				".ff-ms-item.active { border-color: rgba(125,255,158,0.6); color: #7dff9e; }",
				".ff-ms-check { width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: #00ff87; flex: none; }",
				".ff-ms-item .ttl { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }",
				".ff-ms-empty { font-size: 11px; color: rgba(170,230,200,0.55); text-align: center; padding: 20px 4px; }",
				".ff-ms-picker-actions { display: flex; gap: 8px; }",

				// ═══ 开屏变身动画（GIF）═══
				".ff-boot { position: fixed; inset: 0; z-index: 99999; background: #03070f; overflow: hidden;",
				"  display: flex; flex-direction: column; align-items: center; justify-content: center;",
				"  opacity: 1; transition: opacity 0.5s ease; }",
				".ff-boot.gone { opacity: 0; pointer-events: none; }",
				".ff-boot::before { content: ''; position: absolute; inset: 0; pointer-events: none;",
				"  background: radial-gradient(70% 55% at 50% 42%, rgba(0,255,135,0.13), transparent 70%); }",
				".ff-boot img.ff-gif { position: relative; max-width: min(94vw, 1000px); max-height: min(70vh, 562px);",
				"  border-radius: 14px; box-shadow: 0 0 70px rgba(0,255,135,0.35), 0 0 160px rgba(0,255,135,0.16);",
				"  opacity: 0; transform: scale(0.95); animation: ffGifIn 0.5s ease forwards; }",
				"@keyframes ffGifIn { to { opacity: 1; transform: scale(1); } }",
				".ff-title { position: relative; margin-top: 30px; font-size: 32px; font-weight: 800; letter-spacing: 14px;",
				"  color: #eafff3; text-shadow: 0 0 18px rgba(125,255,158,0.9), 0 0 60px rgba(0,255,135,0.5);",
				"  opacity: 0; animation: ffFadeIn 0.7s 0.4s ease forwards; }",
				".ff-sub { position: relative; margin-top: 12px; font-size: 14px; letter-spacing: 6px;",
				"  color: rgba(170,230,200,0.85); opacity: 0; animation: ffFadeIn 0.7s 0.7s ease forwards; }",
				"@keyframes ffFadeIn { to { opacity: 1; } }",
				".ff-skip { position: absolute; right: 18px; bottom: 14px; padding: 6px 14px; font-size: 12px;",
				"  letter-spacing: 2px; color: rgba(170,230,200,0.8); background: rgba(125,255,158,0.08);",
				"  border: 1px solid rgba(125,255,158,0.35); border-radius: 6px; cursor: pointer; }",
				".ff-skip:hover { background: rgba(125,255,158,0.16); }",

				"@media (max-width: 640px) {",
				"  .ff-title { font-size: 22px; letter-spacing: 8px; }",
				"  .ff-sub { font-size: 12px; }",
				"}",
				"@media (prefers-reduced-motion: reduce) { .ff-amb { display: none; } .ff-music-disc { animation: none; } }"
			].join("\n");
		}

		// ═══════════ 4. 开屏变身动画（GIF 版）═══════════
		function buildBootOverlay() {
			const ov = document.createElement("div");
			ov.className = "ff-boot";
			ov.innerHTML =
				'<img class="ff-gif" src="' + GIF_DATA + '" alt="流萤变身">' +
				'<div class="ff-title">流萤 // FIREFLY</div>' +
				'<div class="ff-sub">萤火归位 · 变身完成</div>' +
				'<button class="ff-skip" type="button">点击跳过</button>';
			return ov;
		}

		function playTransformIntro() {
			if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
			const ov = buildBootOverlay();
			document.body.appendChild(ov);
			let done = false;
			const timers = [];
			const finish = () => {
				if (done) return;
				done = true;
				timers.forEach(clearTimeout);
				ov.classList.add("gone");
				setTimeout(() => ov.remove(), 520);
			};
			ov.querySelector(".ff-skip").addEventListener("click", finish);
			ov.addEventListener("click", (e) => { if (e.target === ov) finish(); });
			// GIF 播放约 10 秒后淡出；点击可随时跳过
			timers.push(setTimeout(finish, 10000));
		}

		// ═══════════ 5. 壁纸系统（类型选择 + 切换/随机 + 随机间隔）═══════════
		function startWallpaper(dock) {
			const all = Array.isArray(WALLPAPERS) ? WALLPAPERS : [];
			const LS_BG_HIDDEN = "ff_bg_hidden";
			const LS_BG_RANDOM = "ff_bg_random";
			function loadIdSet(key) {
				try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
				catch (e) { return new Set(); }
			}
			function saveIdSet(key, set) {
				try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {}
			}
			const hidden = loadIdSet(LS_BG_HIDDEN);     // 内置壁纸「移除」后的隐藏名单
			const randomPool = loadIdSet(LS_BG_RANDOM); // 随机展示的勾选池（空=全部）
			const vids = all.filter((w) => w.kind === "video" && !hidden.has(w.id));
			const imgs = all.filter((w) => w.kind === "image" && !hidden.has(w.id));

			const bg = document.createElement("div");
			bg.className = "ff-bg";
			const shade = document.createElement("div");
			shade.className = "ff-bg-shade";
			document.body.append(bg, shade);

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-bg-toggle ff-dock-btn";
			btn.textContent = "景";
			btn.title = "壁纸设置";
			dock.appendChild(btn);

			const panel = document.createElement("div");
			panel.className = "ff-bg-panel";
			panel.innerHTML =
				'<div class="ff-bg-title">壁纸设置</div>' +
				'<div class="ff-bg-line"><span class="ff-bg-label">类型</span>' +
					'<button class="ff-bg-seg" data-type="video" type="button">动态</button>' +
					'<button class="ff-bg-seg" data-type="image" type="button">静态</button></div>' +
				'<div class="ff-bg-line"><span class="ff-bg-label">模式</span>' +
					'<button class="ff-bg-seg" data-mode="switch" type="button">选择</button>' +
					'<button class="ff-bg-seg" data-mode="random" type="button">随机</button></div>' +
				'<div class="ff-bg-line"><span class="ff-bg-label">随机间隔</span>' +
					'<input class="ff-bg-interval" type="number" min="1" max="1440" step="1">' +
					'<span class="ff-bg-unit">分钟</span></div>' +
				'<button class="ff-bg-add" type="button">＋ 添加壁纸</button>' +
				'<button class="ff-bg-ok" type="button">确定</button>';
			dock.appendChild(panel);

			// 壁纸选择器（点击「选择」弹出，缩略图网格点选，支持勾选后移除/随机）
			const picker = document.createElement("div");
			picker.className = "ff-bg-picker";
			picker.innerHTML =
				'<div class="ff-bg-picker-head">' +
					'<div class="ff-bg-picker-title">选择壁纸</div>' +
					'<button class="ff-bg-close" type="button" title="收起">—</button>' +
				'</div>' +
				'<div class="ff-bg-picker-list"></div>' +
				'<div class="ff-bg-picker-actions">' +
					'<button class="ff-bg-act ff-bg-remove" type="button">移除</button>' +
					'<button class="ff-bg-act ff-bg-random" type="button">随机</button>' +
				'</div>';
			dock.appendChild(picker);
			const pickerTitle = picker.querySelector(".ff-bg-picker-title");
			const pickerList = picker.querySelector(".ff-bg-picker-list");
			const pickerRemove = picker.querySelector(".ff-bg-remove");
			const pickerRandom = picker.querySelector(".ff-bg-random");

			const typeBtns = {
				video: panel.querySelector('[data-type="video"]'),
				image: panel.querySelector('[data-type="image"]'),
			};
			const modeBtns = {
				switch: panel.querySelector('[data-mode="switch"]'),
				random: panel.querySelector('[data-mode="random"]'),
			};
			const intervalInput = panel.querySelector(".ff-bg-interval");

			// 无视频/无图片时禁用对应类型按钮（避免点了没反应）
			if (vids.length === 0) typeBtns.video.disabled = true;
			if (imgs.length === 0) typeBtns.image.disabled = true;

			let vidIndex = 0, imgIndex = 0, activeType = "image";
			let mode = localStorage.getItem(LS_BG_MODE) || "switch";
			let interval = parseInt(localStorage.getItem(LS_BG_INTERVAL) || "5", 10) || 5;
			let randomTimer = null;
			let currentId = null;
			const selected = new Set();      // 选择面板里的勾选（移除/随机 共用的临时选择）
			const customKeys = new Set();    // 运行时壁纸去重：name:size

			function render(item) {
				if (!item) return;
				bg.innerHTML = "";
				bg.style.backgroundImage = "none";
				if (item.kind === "video") {
					const video = document.createElement("video");
					video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
					video.src = item.data;
					bg.appendChild(video);
					video.play().catch(() => {});
				} else {
					bg.style.backgroundImage = 'url("' + item.data + '")';
				}
				activeType = item.kind;
				currentId = item.id || null;
				if (item.id) localStorage.setItem(LS_BG, item.id);
				btn.title = "壁纸：" + (item.label || item.id);
				typeBtns.video.classList.toggle("active", activeType === "video");
				typeBtns.image.classList.toggle("active", activeType === "image");
			}

			function showByIndex(kind, idx) {
				const arr = kind === "video" ? vids : imgs;
				if (arr.length === 0) return;
				const i = ((idx % arr.length) + arr.length) % arr.length;
				if (kind === "video") vidIndex = i; else imgIndex = i;
				render(arr[i]);
			}

			function pickType(kind) {
				if (kind === "video") showByIndex("video", vidIndex);
				else showByIndex("image", imgIndex);
			}

			function activeArr() { return activeType === "video" ? vids : imgs; }

			function showItem(item) {
				if (!item) return;
				const list = item.kind === "video" ? vids : imgs;
				const i = list.indexOf(item);
				if (i < 0) return;
				if (item.kind === "video") vidIndex = i; else imgIndex = i;
				render(item);
			}

			function doSwitch() {
				if (activeType === "video") showByIndex("video", vidIndex + 1);
				else showByIndex("image", imgIndex + 1);
			}

			function randomCandidates() {
				const arr = activeArr();
				if (randomPool.size === 0) return arr;
				return arr.filter((it) => randomPool.has(it.id));
			}

			function doRandom() {
				const arr = randomCandidates();
				if (arr.length === 0) return;
				const cur = arr.findIndex((it) => it.id === currentId);
				let n = cur;
				if (arr.length > 1) while (n === cur) n = Math.floor(Math.random() * arr.length);
				showItem(arr[n]);
			}

			function clearRandom() { if (randomTimer) { clearTimeout(randomTimer); randomTimer = null; } }

			function scheduleRandom() {
				clearRandom();
				if (mode !== "random") return;
				randomTimer = setTimeout(() => { doRandom(); scheduleRandom(); }, Math.max(1, interval) * 60000);
			}

			function setMode(m) {
				mode = m;
				localStorage.setItem(LS_BG_MODE, mode);
				modeBtns.switch.classList.toggle("active", mode === "switch");
				modeBtns.random.classList.toggle("active", mode === "random");
				if (mode === "random") {
					doRandom();
					scheduleRandom();
				} else {
					clearRandom();
				}
			}

			function setIntervalMinutes(v) {
				const n = parseInt(v, 10);
				interval = n > 0 ? n : 5;
				localStorage.setItem(LS_BG_INTERVAL, String(interval));
				if (mode === "random") scheduleRandom();
			}

			function closePanel() { panel.classList.remove("open"); }

			// ── 选择面板：勾选 → 移除 / 随机；点卡片本体 → 应用该壁纸 ──
			function closePicker() { picker.classList.remove("open"); }

			function updatePickerActions() {
				const n = selected.size;
				pickerRemove.disabled = n === 0;
				pickerRandom.disabled = n === 0;
				pickerRemove.textContent = n > 0 ? "移除(" + n + ")" : "移除";
				pickerRandom.textContent = n > 0 ? "随机(" + n + ")" : "随机";
			}

			function buildPicker() {
				const arr = activeArr();
				pickerTitle.textContent = "选择壁纸（" + (activeType === "video" ? "动态" : "静态") + "）";
				pickerList.innerHTML = "";
				if (arr.length === 0) {
					pickerList.innerHTML = '<div class="ff-bg-picker-empty">暂无壁纸</div>';
					updatePickerActions();
					return;
				}
				arr.forEach((item) => {
					const cell = document.createElement("div");
					cell.className = "ff-bg-picker-item" + (selected.has(item.id) ? " checked" : "");
					if (item.kind === "video") {
						const v = document.createElement("video");
						v.src = item.data; v.muted = true; v.preload = "metadata"; v.playsInline = true;
						cell.appendChild(v);
					} else {
						const img = document.createElement("img");
						img.src = item.data;
						img.draggable = false;
						cell.appendChild(img);
					}
					const lab = document.createElement("span");
					lab.textContent = item.label || item.id;
					cell.appendChild(lab);

					const cb = document.createElement("input");
					cb.type = "checkbox";
					cb.className = "ff-bg-check";
					cb.checked = selected.has(item.id);
					cb.title = "勾选后可用下方「移除 / 随机」";
					cb.addEventListener("click", (e) => {
						e.stopPropagation();
						if (cb.checked) selected.add(item.id); else selected.delete(item.id);
						cell.classList.toggle("checked", cb.checked);
						updatePickerActions();
					});
					cell.appendChild(cb);

					cell.addEventListener("click", () => {
						showItem(item);
						closePicker();
					});
					pickerList.appendChild(cell);
				});
				updatePickerActions();
			}

			// 打开选择器（再次点击「选择」或「收起」关闭）
			function openPicker() {
				if (picker.classList.contains("open")) { closePicker(); return; }
				setMode("switch");
				selected.clear();
				buildPicker();
				picker.classList.add("open");
				dock.__ffCenter(picker);
			}

			// 移除勾选的壁纸：内置→隐藏名单(localStorage)；运行时→删除 IndexedDB
			function removeSelected() {
				const ids = [...selected];
				if (ids.length === 0) return;
				const removed = new Set(ids);
				for (const id of ids) {
					const item = vids.concat(imgs).find((w) => w.id === id);
					if (!item) continue;
					if (item.custom) {
						idbDelete(id);
					} else {
						hidden.add(id);
					}
					randomPool.delete(id);
					const list = item.kind === "video" ? vids : imgs;
					const idx = list.indexOf(item);
					if (idx >= 0) list.splice(idx, 1);
				}
				selected.clear();
				saveIdSet(LS_BG_HIDDEN, hidden);
				saveIdSet(LS_BG_RANDOM, randomPool);
				typeBtns.video.disabled = vids.length === 0;
				typeBtns.image.disabled = imgs.length === 0;
				// 若当前展示壁纸被移除，切到可用的第一张
				if (removed.has(currentId)) {
					if (vids.length) { activeType = "video"; showByIndex("video", 0); }
					else if (imgs.length) { activeType = "image"; showByIndex("image", 0); }
					else { bg.innerHTML = ""; bg.style.backgroundImage = "none"; currentId = null; }
				}
				if (picker.classList.contains("open")) buildPicker();
			}

			// 随机：以勾选的壁纸作为随机池，并立即进入随机模式
			function applyRandomPool() {
				if (selected.size === 0) return;
				randomPool.clear();
				for (const id of selected) {
					if (vids.concat(imgs).some((w) => w.id === id)) randomPool.add(id);
				}
				saveIdSet(LS_BG_RANDOM, randomPool);
				selected.clear();
				closePicker();
				setMode("random");
			}

			// ── 运行时添加壁纸（IndexedDB 持久化，刷新后仍在）──
			function idbOpen() {
				return new Promise((resolve, reject) => {
					if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
					const req = indexedDB.open("dsh-theme-firefly", 1);
					req.onupgradeneeded = () => {
						if (!req.result.objectStoreNames.contains("wallpapers")) {
							req.result.createObjectStore("wallpapers", { keyPath: "id" });
						}
					};
					req.onsuccess = () => resolve(req.result);
					req.onerror = () => reject(req.error);
				});
			}
			function idbGetAll() {
				return idbOpen().then((db) => new Promise((resolve) => {
					const req = db.transaction("wallpapers", "readonly").objectStore("wallpapers").getAll();
					req.onsuccess = () => { db.close(); resolve(req.result || []); };
					req.onerror = () => { db.close(); resolve([]); };
				})).catch(() => []);
			}
			function idbPut(record) {
				return idbOpen().then((db) => new Promise((resolve) => {
					const tx = db.transaction("wallpapers", "readwrite");
					tx.objectStore("wallpapers").put(record);
					tx.oncomplete = () => { db.close(); resolve(); };
					tx.onerror = () => { db.close(); resolve(); };
				})).catch(() => {});
			}
			function idbDelete(id) {
				return idbOpen().then((db) => new Promise((resolve) => {
					const tx = db.transaction("wallpapers", "readwrite");
					tx.objectStore("wallpapers").delete(id);
					tx.oncomplete = () => { db.close(); resolve(); };
					tx.onerror = () => { db.close(); resolve(); };
				})).catch(() => {});
			}

			async function loadCustomWallpapers() {
				try {
					const records = await idbGetAll();
					for (const r of records) {
						if (!r || !r.file) continue;
						const url = URL.createObjectURL(r.file);
						const item = { id: r.id, kind: r.kind, data: url, label: r.label || r.id, custom: true };
						if (r.kind === "video") vids.push(item); else imgs.push(item);
						if (r.file && r.file.name) customKeys.add(r.file.name + ":" + r.file.size);
					}
					typeBtns.video.disabled = vids.length === 0;
					typeBtns.image.disabled = imgs.length === 0;
				} catch (e) { /* IndexedDB 不可用则忽略 */ }
			}

			function addWallpaper() {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = "image/jpeg,image/png,image/webp,video/mp4";
				input.multiple = true; // Windows 文件窗：可一次框选/按住 Ctrl 多选
				input.addEventListener("change", async () => {
					const files = Array.from(input.files || []);
					if (files.length === 0) return;
					let last = null, added = 0;
					for (const file of files) {
						const okType = /^image\/(jpeg|png|webp)$/.test(file.type) || /^video\/mp4$/.test(file.type);
						if (!okType) continue;
						const key = file.name + ":" + file.size;
						if (customKeys.has(key)) continue; // 同名同大小视为重复，跳过
						customKeys.add(key);
						const kind = file.type.startsWith("video") ? "video" : "image";
						const id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
						const url = URL.createObjectURL(file);
						const item = { id, kind, data: url, label: file.name, custom: true };
						if (kind === "video") vids.push(item); else imgs.push(item);
						await idbPut({ id, kind, file, label: file.name });
						last = item;
						added++;
					}
					typeBtns.video.disabled = vids.length === 0;
					typeBtns.image.disabled = imgs.length === 0;
					if (last) {
						if (last.kind === "video") { activeType = "video"; showByIndex("video", vids.indexOf(last)); }
						else { activeType = "image"; showByIndex("image", imgs.indexOf(last)); }
						btn.title = added > 1 ? "已添加 " + added + " 张壁纸" : "已添加壁纸：" + last.label;
					}
				});
				input.click();
			}

			btn.addEventListener("click", () => {
				panel.classList.toggle("open");
				if (panel.classList.contains("open")) dock.__ffCenter(panel);
			});
			typeBtns.video.addEventListener("click", () => pickType("video"));
			typeBtns.image.addEventListener("click", () => pickType("image"));
			modeBtns.switch.addEventListener("click", () => openPicker());
			modeBtns.random.addEventListener("click", () => setMode("random"));
			intervalInput.addEventListener("change", () => setIntervalMinutes(intervalInput.value));
			panel.querySelector(".ff-bg-ok").addEventListener("click", closePanel);
			panel.querySelector(".ff-bg-add").addEventListener("click", addWallpaper);
			picker.querySelector(".ff-bg-close").addEventListener("click", closePicker);
			pickerRemove.addEventListener("click", removeSelected);
			pickerRandom.addEventListener("click", applyRandomPool);

			// 初始化 UI
			intervalInput.value = interval;
			modeBtns.switch.classList.toggle("active", mode === "switch");
			modeBtns.random.classList.toggle("active", mode === "random");

			// 恢复上次壁纸；首次安装（无记录）时优先「默认壁纸」（Default*），否则第一张可用
			function defaultWallpaper() {
				const list = vids.concat(imgs);
				return list.find((w) => /(^|[-_ ])default([-_ ]|$)/i.test(w.id) && w.kind === "image")
					|| list.find((w) => /(^|[-_ ])default([-_ ]|$)/i.test(w.id))
					|| null;
			}

			async function initWallpaper() {
				await loadCustomWallpapers();
				let startItem = defaultWallpaper() || vids[0] || imgs[0] || null;
				const saved = localStorage.getItem(LS_BG);
				if (saved) {
					const found = vids.concat(imgs).find((w) => w.id === saved);
					if (found) startItem = found;
				}
				if (startItem) {
					if (startItem.kind === "video") vidIndex = Math.max(0, vids.indexOf(startItem));
					else imgIndex = Math.max(0, imgs.indexOf(startItem));
				}
				render(startItem);
				// 上次是随机模式则恢复自动切换
				if (mode === "random") scheduleRandom();
			}
			initWallpaper();

			return () => {
				clearRandom();
				bg.remove(); shade.remove(); btn.remove(); panel.remove(); picker.remove();
			};
		}

		// ═══════════ 6. 常驻萤火氛围（分档：关/星点/曳光/流萤，数量渐变）═══════════
		const AMB_LEVELS = [
			{ key: "off", label: "关", count: 0 },
			{ key: "star", label: "星点", count: 12 },
			{ key: "trail", label: "曳光", count: 28 },
			{ key: "firefly", label: "流萤", count: 80 },
		];
		function startAmbience(dock) {
			const wrap = document.createElement("div");
			wrap.className = "ff-amb";
			const maxCount = AMB_LEVELS.reduce((m, l) => Math.max(m, l.count), 0);
			const dots = [];
			for (let i = 0; i < maxCount; i++) {
				const dot = document.createElement("i");
				const core = document.createElement("span");
				dot.appendChild(core);
				const size = 3 + Math.random() * 4;
				const op = 0.35 + Math.random() * 0.45;
				dot.style.left = (Math.random() * 100) + "%";
				dot.style.setProperty("--dur", (12 + Math.random() * 20) + "s");
				dot.style.setProperty("--delay", (-Math.random() * 25) + "s");
				dot.style.setProperty("--drift", Math.round((Math.random() - 0.5) * 120) + "px");
				core.style.width = size + "px";
				core.style.height = size + "px";
				core.style.setProperty("--op", op.toFixed(2));
				wrap.appendChild(dot);
				dots.push(dot);
			}
			document.body.appendChild(wrap);

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-amb-toggle ff-dock-btn";
			btn.textContent = "萤";
			btn.title = "萤火氛围数量";
			dock.appendChild(btn);

			const menu = document.createElement("div");
			menu.className = "ff-amb-menu";
			for (const lv of AMB_LEVELS) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "ff-amb-opt";
				b.dataset.key = lv.key;
				b.textContent = lv.label;
				b.addEventListener("click", () => { setLevel(lv.key); closeMenu(); });
				menu.appendChild(b);
			}
			dock.appendChild(menu);

			function closeMenu() { menu.classList.remove("open"); }

			function setLevel(key, instant) {
				const lv = AMB_LEVELS.find((l) => l.key === key) || AMB_LEVELS[0];
				localStorage.setItem(LS_AMBIENCE, lv.key);
				for (let i = 0; i < dots.length; i++) {
					const on = i < lv.count;
					if (instant) {
						dots[i].style.transition = "none";
						dots[i].classList.toggle("on", on);
						void dots[i].offsetWidth; // 强制回流，使下次切换恢复过渡
						dots[i].style.transition = "";
					} else {
						dots[i].classList.toggle("on", on);
					}
				}
				btn.classList.toggle("on", lv.key !== "off");
				btn.title = "萤火氛围：" + lv.label;
				menu.querySelectorAll(".ff-amb-opt").forEach((b) => b.classList.toggle("active", b.dataset.key === lv.key));
			}

			btn.addEventListener("click", () => menu.classList.toggle("open"));
			const onDocClick = (e) => {
				if (!menu.contains(e.target) && e.target !== btn) closeMenu();
			};
			document.addEventListener("click", onDocClick);

			// 迁移旧值："1"→曳光、"0"→关、缺失→星点；其它旧档位键直接沿用
			const old = localStorage.getItem(LS_AMBIENCE);
			let initial = "star";
			if (old === "0") initial = "off";
			else if (old === "1") initial = "trail";
			else if (AMB_LEVELS.some((l) => l.key === old)) initial = old;
			setLevel(initial, true); // 首帧即时显示，不做渐变

			return () => {
				document.removeEventListener("click", onDocClick);
				wrap.remove();
				btn.remove();
				menu.remove();
			};
		}

		// ═══════════ 7. 打字音效（Web Audio 合成，无音频文件）═══════════
		let typeAudioCtx = null;
		let typeNoiseBuf = null;
		function ensureTypeAudio() {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (AC === undefined) return null;
			if (typeAudioCtx === null) typeAudioCtx = new AC();
			if (typeAudioCtx.state === "suspended") typeAudioCtx.resume().catch(() => {});
			return typeAudioCtx;
		}
		function typeNoiseBuffer(ctx) {
			if (typeNoiseBuf !== null) return typeNoiseBuf;
			const len = Math.floor(ctx.sampleRate * 0.05);
			const buf = ctx.createBuffer(1, len, ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			typeNoiseBuf = buf;
			return buf;
		}
		function playTypeClick(key) {
			const ctx = ensureTypeAudio();
			if (ctx === null || ctx.state !== "running") return;
			const t = ctx.currentTime;
			const src = ctx.createBufferSource();
			src.buffer = typeNoiseBuffer(ctx);
			const bp = ctx.createBiquadFilter();
			bp.type = "bandpass";
			const base = key === " " ? 1400 : key === "Enter" ? 1050 : 2100;
			bp.frequency.value = base + Math.random() * 700;
			bp.Q.value = 1.4;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.04, t + 0.002);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
			src.connect(bp); bp.connect(g); g.connect(ctx.destination);
			src.start(t); src.stop(t + 0.06);
			const osc = ctx.createOscillator();
			osc.type = "sine";
			const f0 = key === "Enter" ? 150 : key === " " ? 110 : 120 + Math.random() * 30;
			osc.frequency.setValueAtTime(f0, t);
			osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
			const g2 = ctx.createGain();
			g2.gain.setValueAtTime(0.0001, t);
			g2.gain.exponentialRampToValueAtTime(0.045, t + 0.003);
			g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
			osc.connect(g2); g2.connect(ctx.destination);
			osc.start(t); osc.stop(t + 0.07);
		}
		function startTypeSound(dock) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-snd-toggle ff-dock-btn";
			btn.title = "打字音效开关";
			const setState = (on) => {
				btn.textContent = on ? "声" : "声̶";
				btn.classList.toggle("off", !on);
			};
			setState(localStorage.getItem(LS_TYPESOUND) !== "0");
			btn.addEventListener("click", () => {
				const on = localStorage.getItem(LS_TYPESOUND) === "0";
				localStorage.setItem(LS_TYPESOUND, on ? "1" : "0");
				setState(on);
			});
			const onKeydown = (e) => {
				if (localStorage.getItem(LS_TYPESOUND) === "0") return;
				const el = e.target;
				if (el === null || el.tagName !== "TEXTAREA") return;
				if (e.metaKey || e.ctrlKey || e.altKey) return;
				playTypeClick(e.key === "Enter" ? "Enter" : e.key === " " ? " " : "");
			};
			document.addEventListener("keydown", onKeydown, true);
			dock.appendChild(btn);
			return () => {
				document.removeEventListener("keydown", onKeydown, true);
				btn.remove();
			};
		}

		// ═══════════ 7.5 背景音乐播放器 ═══════════
		const LS_MUSIC_MODE = "ff_music_mode";
		const LS_MUSIC_ID = "ff_music_id";
		function startMusic(dock) {
			const LS_MUSIC_HIDDEN = "ff_music_hidden";
			const LS_MUSIC_RANDOM = "ff_music_random";
			function loadIdSet(key) {
				try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
				catch (e) { return new Set(); }
			}
			function saveIdSet(key, set) {
				try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {}
			}
			const hidden = loadIdSet(LS_MUSIC_HIDDEN);       // 内置歌曲「移除」后的隐藏名单
			const randomPool = loadIdSet(LS_MUSIC_RANDOM);   // 随机(洗牌)用的勾选池（空=全部）
			const list = (Array.isArray(MUSIC) ? MUSIC : [])
				.filter((m) => !hidden.has(m.id))
				.map((m) => Object.assign({}, m, { custom: false }));
			const audio = new Audio();
			audio.volume = 0.9;
			let current = -1;
			let mode = localStorage.getItem(LS_MUSIC_MODE) || "list"; // single | list | shuffle
			let playing = false;
			let seeking = false;
			const coverCache = new Map();   // 歌曲 id -> 封面 objectURL（null = 无内嵌封面）
			const customCovers = new Map(); // 歌曲 id -> 用户手动指定封面 objectURL
			const selected = new Set();     // 选择面板里的勾选（移除/随机 共用临时选择）

			const MODES = { single: "单曲", list: "列表", shuffle: "随机" };

			// ─ 封面提取：MP3(ID3v2 APIC) / FLAC(PICTURE 块) ─
			function ss(v, i) { return ((v[i] & 127) << 21) | ((v[i + 1] & 127) << 14) | ((v[i + 2] & 127) << 7) | (v[i + 3] & 127); }
			function a4(v, i) { return String.fromCharCode(v[i], v[i + 1], v[i + 2], v[i + 3]); }
			function str(v, s, e) { let r = ""; for (let i = s; i < e && i < v.length; i++) r += String.fromCharCode(v[i]); return r; }
			function flacPicture(b) {
				const u32 = (i) => ((b[i] << 24) >>> 0) | ((b[i + 1] << 16)) | ((b[i + 2] << 8)) | b[i + 3];
				let o = 4; // 跳过 picture type
				const ml = u32(o); o += 4;
				if (o + ml > b.length) return null;
				const mime = str(b, o, o + ml); o += ml;
				const dl = u32(o); o += 4; o += dl; // 描述
				o += 4 + 4 + 4 + 4; // width / height / depth / colors
				const il = u32(o); o += 4;
				if (o + il > b.length) return null;
				return { mime: mime || "image/jpeg", data: b.slice(o, o + il) };
			}
			function extractCover(buf) {
				const v = new Uint8Array(buf);
				if (v.length < 12) return null;
				// ID3v2（MP3）
				if (v[0] === 0x49 && v[1] === 0x44 && v[2] === 0x33) {
					const ver = v[3];
					const tagSize = ss(v, 6);
					let off = 10;
					const end = Math.min(10 + tagSize, v.length);
					while (off + 10 <= end) {
						const id = a4(v, off);
						if (!/[A-Z]/.test(id[0])) break;
						const fsize = ver === 4 ? ss(v, off + 4) : ((v[off + 4] << 24) | (v[off + 5] << 16) | (v[off + 6] << 8) | v[off + 7]);
						if (fsize <= 0 || off + 10 + fsize > v.length) break;
						if (id === "APIC") {
							const body = v.slice(off + 10, off + 10 + fsize);
							const enc = body[0];
							let m = 1;
							while (m < body.length && body[m] !== 0) m++;
							if (m >= body.length) break;
							const mime = str(body, 1, m);
							let q = m + 2; // 跳过 null + 图片类型字节
							let d = q;
							if (enc === 1 || enc === 2) {
								while (d + 1 < body.length && !(body[d] === 0 && body[d + 1] === 0)) d += 2;
								d += 2;
							} else {
								while (d < body.length && body[d] !== 0) d++;
								if (d < body.length) d += 1;
							}
							const img = body.slice(d);
							if (img.length > 64) return { mime: mime || "image/jpeg", data: img };
						}
						off += 10 + fsize;
					}
					return null;
				}
				// FLAC：fLaC，扫描 PICTURE 元数据块（type 6）
				if (v[0] === 0x66 && v[1] === 0x4c && v[2] === 0x61 && v[3] === 0x43) {
					let o = 4;
					while (o + 4 <= v.length) {
						const last = (v[o] & 0x80) !== 0;
						const type = v[o] & 0x7f;
						const len = (v[o + 1] << 16) | (v[o + 2] << 8) | v[o + 3];
						o += 4;
						if (type === 6 && o + len <= v.length) return flacPicture(v.slice(o, o + len));
						if (last) break;
						o += len;
					}
					return null;
				}
				return null;
			}
			function dataUriToBuffer(uri) {
				const comma = uri.indexOf(",");
				if (comma < 0) return null;
				const meta = uri.slice(0, comma);
				const payload = uri.slice(comma + 1);
				if (/;base64/i.test(meta)) {
					const bin = atob(payload);
					const out = new Uint8Array(bin.length);
					for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
					return out.buffer;
				}
				let txt;
				try { txt = decodeURIComponent(payload); } catch (e) { txt = payload; }
				const out = new Uint8Array(txt.length);
				for (let i = 0; i < txt.length; i++) out[i] = txt.charCodeAt(i) & 0xff;
				return out.buffer;
			}
			async function resolveCover(item) {
				if (coverCache.has(item.id)) return;
				coverCache.set(item.id, null);
				if (customCovers.has(item.id)) { coverCache.set(item.id, customCovers.get(item.id)); return; }
			// 内置歌曲：开箱即用的默认封面（知更鸟图）；无则回退 ♪ 占位
			if (!item.custom) { if (DEFAULT_COVER) coverCache.set(item.id, DEFAULT_COVER); return; }
				try {
					let buf;
					if (item.file) buf = await item.file.arrayBuffer();
					else if (typeof item.data === "string" && item.data.indexOf("data:") === 0) buf = dataUriToBuffer(item.data);
					else { const r = await fetch(item.data); if (!r.ok) return; buf = await r.arrayBuffer(); }
					if (!buf) return;
					const art = extractCover(buf);
					if (art && art.data && art.data.length) {
						coverCache.set(item.id, URL.createObjectURL(new Blob([art.data], { type: art.mime || "image/jpeg" })));
					}
				} catch (e) { /* 解析失败视为无内嵌封面 */ }
			}

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-music-toggle ff-dock-btn";
			btn.textContent = "乐";
			btn.title = "背景音乐开关";
			dock.appendChild(btn);

			const card = document.createElement("div");
			card.className = "ff-music-card";
			card.innerHTML =
				'<div class="ff-music-top"><span class="ff-music-title">—</span>' +
				'<button class="ff-music-shrink" data-act="shrink" type="button" title="缩小">缩小</button>' +
				'<button class="ff-music-close" type="button" title="收起">×</button></div>' +
				'<div class="ff-music-disc-wrap" title="点击播放/暂停">' +
					'<div class="ff-music-disc"><div class="ff-music-cover"><span class="ff-music-lbl">♪</span></div><div class="ff-music-hub"></div></div>' +
				'</div>' +
				'<div class="ff-music-seek-row">' +
					'<span class="ff-music-time ff-music-cur">0:00</span>' +
					'<input class="ff-music-seek" type="range" min="0" max="100" step="0.01" value="0">' +
					'<span class="ff-music-time ff-music-dur">0:00</span>' +
				'</div>' +
				'<div class="ff-music-row">' +
					'<button class="ff-music-btn" data-act="prev" type="button" title="上一首">⏮</button>' +
					'<button class="ff-music-btn ff-music-play" data-act="play" type="button" title="播放/暂停">▶</button>' +
					'<button class="ff-music-btn" data-act="next" type="button" title="下一首">⏭</button>' +
					'<button class="ff-music-btn ff-music-mode" data-act="mode" type="button" title="循环模式">列表</button>' +
				'</div>' +
				'<div class="ff-music-row">' +
					'<button class="ff-music-btn" data-act="select" type="button" title="选择歌曲（勾选后移除/随机）">选择</button>' +
					'<button class="ff-music-btn" data-act="add" type="button" title="导入本机歌曲">＋添加</button>' +
					'<button class="ff-music-btn" data-act="cover" type="button" title="为当前歌曲指定封面">封面</button>' +
				'</div>';
			card.style.display = "none";
			dock.appendChild(card);

			// 歌单选择面板（勾选后移除 / 随机，类似壁纸选择器）
			const picker = document.createElement("div");
			picker.className = "ff-ms-picker";
			picker.innerHTML =
				'<div class="ff-ms-picker-head">' +
					'<div class="ff-ms-picker-title">选择歌曲</div>' +
					'<button class="ff-bg-close" type="button" title="收起">—</button>' +
				'</div>' +
				'<div class="ff-ms-picker-list"></div>' +
				'<div class="ff-ms-picker-actions">' +
					'<button class="ff-bg-act ff-bg-remove" type="button">移除</button>' +
					'<button class="ff-bg-act ff-ms-random" type="button">随机</button>' +
				'</div>';
			dock.appendChild(picker);

			// 迷你播放器：折叠后紧邻 dock 左侧（唱片在上、进度条在下，可切换简洁模式隐藏唱片）
			const mini = document.createElement("div");
			mini.className = "ff-music-mini";
			mini.title = "迷你播放器（点击唱片播放/暂停）";
			const miniBar = document.createElement("div");
			miniBar.className = "ff-music-mini-bar";
			const miniDiscToggle = document.createElement("button");
			miniDiscToggle.type = "button";
			miniDiscToggle.className = "ff-music-mini-disc";
			miniDiscToggle.title = "隐藏唱片与封面，只保留进度条";
			miniDiscToggle.textContent = "隐藏封面";
			const miniExpand = document.createElement("button");
			miniExpand.type = "button";
			miniExpand.className = "ff-music-mini-expand";
			miniExpand.title = "展开音乐面板";
			miniExpand.textContent = "展开";
			miniBar.appendChild(miniDiscToggle);
			miniBar.appendChild(miniExpand);
			mini.appendChild(miniBar);
			dock.appendChild(mini);

			const discWrap = card.querySelector(".ff-music-disc-wrap");
			const seekRow = card.querySelector(".ff-music-seek-row");
			const transportRow = card.querySelector('[data-act="prev"]').parentElement;

			const titleEl = card.querySelector(".ff-music-title");
			const playBtn = card.querySelector('[data-act="play"]');
			const modeBtn = card.querySelector('[data-act="mode"]');
			const shrinkBtn = card.querySelector('[data-act="shrink"]');
			const discEl = card.querySelector(".ff-music-disc");
			const coverEl = card.querySelector(".ff-music-cover");
			const lblEl = card.querySelector(".ff-music-lbl");
			const seekEl = card.querySelector(".ff-music-seek");
			const timeCur = card.querySelector(".ff-music-cur");
			const timeDur = card.querySelector(".ff-music-dur");
			const pickerList = picker.querySelector(".ff-ms-picker-list");
			const pickerRemove = picker.querySelector(".ff-bg-remove");
			const pickerRandom = picker.querySelector(".ff-ms-random");

			function fmt(t) {
				if (!isFinite(t) || t < 0) t = 0;
				t = Math.floor(t);
				const m = Math.floor(t / 60), s = t % 60;
				return m + ":" + (s < 10 ? "0" : "") + s;
			}
			function setCoverImage(url) { coverEl.style.backgroundImage = 'url("' + url + '")'; lblEl.style.display = "none"; }
			function setCoverFallback(item) {
				coverEl.style.backgroundImage = "";
				lblEl.style.display = "";
				const t = (item && (item.label || item.id)) || "♪";
				lblEl.textContent = (t.trim().charAt(0) || "♪");
			}
			function updateDisc(item) {
				const cached = item ? coverCache.get(item.id) : null;
				if (cached) setCoverImage(cached);
				else setCoverFallback(item);
				if (item && !coverCache.has(item.id)) {
					resolveCover(item).then(() => {
						if (list[current] === item) {
							const c = coverCache.get(item.id);
							if (c) setCoverImage(c);
						}
					});
				}
			}
			function refresh() {
				btn.classList.toggle("on", playing);
				playBtn.textContent = playing ? "⏸" : "▶";
				modeBtn.textContent = MODES[mode];
				modeBtn.title = "循环模式：" + MODES[mode] + "（点击切换）";
				discEl.classList.toggle("playing", playing);
				const item = list[current];
				titleEl.textContent = item ? "♪ " + (item.label || item.id) : "—";
				updateDisc(item);
			}

			function loadAndPlay(i) {
				if (list.length === 0) return;
				current = ((i % list.length) + list.length) % list.length;
				const item = list[current];
				seekEl.value = "0";
				timeCur.textContent = "0:00";
				timeDur.textContent = "0:00";
				audio.src = item.data;
				audio.loop = mode === "single";
				audio.play().then(() => { playing = true; refresh(); }).catch(() => { playing = false; refresh(); });
				if (item.id) localStorage.setItem(LS_MUSIC_ID, item.id);
				refresh();
			}

			function expandCard() {
				if (mini.contains(discWrap)) {
					card.insertBefore(discWrap, transportRow);
					card.insertBefore(seekRow, transportRow);
				}
				mini.classList.remove("open");
				card.style.display = "flex";
				dock.__ffCenter(card);
			}
			function collapseMini() {
				card.style.display = "none";
				closePicker();
				const anchor = miniBar;
				if (!mini.contains(discWrap)) mini.insertBefore(discWrap, anchor);
				if (!mini.contains(seekRow)) mini.insertBefore(seekRow, anchor);
				mini.classList.add("open");
			}
			function openPicker() {
				if (picker.classList.contains("open")) { closePicker(); return; }
				selected.clear();
				buildPicker();
				picker.classList.add("open");
				dock.__ffCenter(picker);
			}
			function closePicker() { picker.classList.remove("open"); }

			function toggle() {
				if (list.length === 0) { openPicker(); return; }
				if (!audio.src) {
					let start = 0;
					const saved = localStorage.getItem(LS_MUSIC_ID);
					if (saved) { const idx = list.findIndex((m) => m.id === saved); if (idx >= 0) start = idx; }
					expandCard();
					loadAndPlay(start);
					return;
				}
				if (audio.paused) {
					audio.play().then(() => { playing = true; refresh(); }).catch(() => {});
				} else {
					audio.pause();
					playing = false;
					refresh();
				}
			}

			function shuffleCandidates() {
				if (randomPool.size === 0) return list;
				return list.filter((s) => randomPool.has(s.id));
			}
			function next() {
				if (list.length === 0) return;
				if (mode === "shuffle") {
					const arr = shuffleCandidates();
					if (arr.length === 0) return;
					let n = list.indexOf(arr[Math.floor(Math.random() * arr.length)]);
					if (arr.length > 1) {
						let guard = 0;
						while (n === current && guard++ < 40) n = list.indexOf(arr[Math.floor(Math.random() * arr.length)]);
					}
					loadAndPlay(n);
				} else {
					loadAndPlay(current + 1);
				}
			}
			function prev() { if (list.length === 0) return; loadAndPlay(current > 0 ? current - 1 : list.length - 1); }

			function cycleMode() {
				mode = mode === "single" ? "list" : mode === "list" ? "shuffle" : "single";
				localStorage.setItem(LS_MUSIC_MODE, mode);
				audio.loop = mode === "single";
				refresh();
			}
			function setMode(m) {
				mode = m;
				localStorage.setItem(LS_MUSIC_MODE, mode);
				audio.loop = mode === "single";
				refresh();
				if (mode === "shuffle" && list.length > 0) next();
			}

			function updatePickerActions() {
				const n = selected.size;
				pickerRemove.disabled = n === 0;
				pickerRandom.disabled = n === 0;
				pickerRemove.textContent = n > 0 ? "移除(" + n + ")" : "移除";
				pickerRandom.textContent = n > 0 ? "随机(" + n + ")" : "随机";
			}
			function buildPicker() {
				pickerList.innerHTML = "";
				if (list.length === 0) {
					const d = document.createElement("div");
					d.className = "ff-ms-empty";
					d.textContent = "暂无歌曲，点「＋添加」导入本机音乐";
					pickerList.appendChild(d);
					updatePickerActions();
					return;
				}
				list.forEach((item, i) => {
					const row = document.createElement("div");
					row.className = "ff-ms-item" + (selected.has(item.id) ? " checked" : "") + (i === current ? " active" : "");
					const cb = document.createElement("input");
					cb.type = "checkbox";
					cb.className = "ff-ms-check";
					cb.checked = selected.has(item.id);
					cb.title = "勾选后可用下方「移除 / 随机」";
					cb.addEventListener("click", (e) => {
						e.stopPropagation();
						if (cb.checked) selected.add(item.id); else selected.delete(item.id);
						row.classList.toggle("checked", cb.checked);
						updatePickerActions();
					});
					const t = document.createElement("span");
					t.className = "ttl";
					t.textContent = (item.custom ? "★ " : "") + (item.label || item.id);
					row.appendChild(cb);
					row.appendChild(t);
					row.addEventListener("click", () => { loadAndPlay(i); closePicker(); });
					pickerList.appendChild(row);
				});
				updatePickerActions();
			}
			function removeSelectedSongs() {
				const ids = [...selected];
				if (ids.length === 0) return;
				const removed = new Set(ids);
				const curId = list[current] ? list[current].id : null;
				const kept = [];
				for (const item of list) {
					if (removed.has(item.id)) {
						if (item.custom) ffIdbDelete("music", item.id);
						else hidden.add(item.id);
						randomPool.delete(item.id);
						if (item.data && /^blob:/.test(item.data)) URL.revokeObjectURL(item.data);
						const cc = coverCache.get(item.id);
						if (cc && /^blob:/.test(cc)) URL.revokeObjectURL(cc);
						coverCache.delete(item.id);
					} else {
						kept.push(item);
					}
				}
				list.length = 0;
				Array.prototype.push.apply(list, kept);
				saveIdSet(LS_MUSIC_HIDDEN, hidden);
				saveIdSet(LS_MUSIC_RANDOM, randomPool);
				selected.clear();
				if (list.length === 0) {
					audio.pause();
					audio.removeAttribute("src");
					audio.load();
					current = -1;
					playing = false;
					refresh();
				} else {
					const still = curId && list.some((s) => s.id === curId);
					current = still ? list.findIndex((s) => s.id === curId) : 0;
					if (!still) loadAndPlay(current);
					else refresh();
				}
				if (picker.classList.contains("open")) buildPicker();
			}
			function applyRandomPool() {
				if (selected.size === 0) return;
				randomPool.clear();
				for (const id of selected) if (list.some((s) => s.id === id)) randomPool.add(id);
				saveIdSet(LS_MUSIC_RANDOM, randomPool);
				selected.clear();
				closePicker();
				setMode("shuffle");
			}

			function addSong() {
				const input = document.createElement("input");
				input.type = "file";
				input.multiple = true;
				input.accept = "audio/*,.mp3,.ogg,.m4a,.wav,.flac";
				input.addEventListener("change", async () => {
					const files = Array.from(input.files || []);
					if (!files.length) return;
					const mimeMap = { mp3: "audio/mpeg", ogg: "audio/ogg", m4a: "audio/mp4", wav: "audio/wav", flac: "audio/flac" };
					for (const file of files) {
						const ext = (file.name.split(".").pop() || "").toLowerCase();
						if (!/^audio\//.test(file.type) && !mimeMap[ext]) continue;
						const id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
						const url = URL.createObjectURL(file);
						const label = file.name.replace(/\.[^.]+$/, "");
						list.push({ id, mime: file.type || mimeMap[ext], data: url, label, custom: true, file });
						await ffIdbPut("music", { id, file, label });
						btn.title = "已添加歌曲：" + file.name;
					}
					buildPicker();
					refresh();
					if (!audio.src && list.length) loadAndPlay(0);
				});
				input.click();
			}

			function setCover() {
				const item = list[current];
				if (!item) return;
				const input = document.createElement("input");
				input.type = "file";
				input.accept = "image/jpeg,image/png,image/webp";
				input.addEventListener("change", async () => {
					const file = input.files && input.files[0];
					if (!file) return;
					const url = URL.createObjectURL(file);
					await ffIdbPut("covers", { id: item.id, cover: file });
					const old = customCovers.get(item.id);
					if (old && /^blob:/.test(old)) URL.revokeObjectURL(old);
					customCovers.set(item.id, url);
					coverCache.set(item.id, url);
					setCoverImage(url);
				});
				input.click();
			}

			audio.addEventListener("loadedmetadata", () => {
				seekEl.max = String(audio.duration || 0);
				timeDur.textContent = fmt(audio.duration);
			});
			audio.addEventListener("timeupdate", () => {
				if (!seeking) seekEl.value = String(audio.currentTime || 0);
				timeCur.textContent = fmt(audio.currentTime);
			});
			seekEl.addEventListener("input", () => { seeking = true; timeCur.textContent = fmt(parseFloat(seekEl.value)); });
			seekEl.addEventListener("change", () => { audio.currentTime = parseFloat(seekEl.value); seeking = false; });

			audio.addEventListener("ended", () => { if (!audio.loop) next(); });
			btn.addEventListener("click", () => { if (card.style.display !== "flex") expandCard(); toggle(); });
			discEl.addEventListener("click", () => { if (list.length === 0) { openPicker(); return; } if (audio.src) toggle(); });
			card.querySelector('[data-act="prev"]').addEventListener("click", prev);
			playBtn.addEventListener("click", () => {
				if (list.length === 0) { openPicker(); return; }
				if (playing) { audio.pause(); playing = false; refresh(); }
				else { audio.play().then(() => { playing = true; refresh(); }).catch(() => {}); }
			});
			card.querySelector('[data-act="next"]').addEventListener("click", next);
			modeBtn.addEventListener("click", cycleMode);
			card.querySelector(".ff-music-close").addEventListener("click", collapseMini);
			shrinkBtn.title = "收起为迷你播放器（保留唱片与进度）"; shrinkBtn.addEventListener("click", collapseMini);
			miniExpand.addEventListener("click", expandCard);
			miniDiscToggle.addEventListener("click", () => {
				const compact = mini.classList.toggle("compact");
				miniDiscToggle.textContent = compact ? "显示封面" : "隐藏封面";
				miniDiscToggle.title = compact ? "显示唱片与封面" : "隐藏唱片与封面，只保留进度条";
			});
			card.querySelector('[data-act="select"]').addEventListener("click", openPicker);
			card.querySelector('[data-act="add"]').addEventListener("click", addSong);
			card.querySelector('[data-act="cover"]').addEventListener("click", setCover);
			picker.querySelector(".ff-bg-close").addEventListener("click", closePicker);
			pickerRemove.addEventListener("click", removeSelectedSongs);
			pickerRandom.addEventListener("click", applyRandomPool);

			const onDocClick = (e) => {
				if (!picker.contains(e.target) && e.target !== card.querySelector('[data-act="select"]')) closePicker();
			};
			document.addEventListener("click", onDocClick);

			ffIdbGetAll("covers").then((recs) => {
				for (const r of recs) if (r && r.id && r.cover) customCovers.set(r.id, URL.createObjectURL(r.cover));
				refresh();
			});
			ffIdbGetAll("music").then((recs) => {
				for (const r of recs) {
					if (!r || !r.file) continue;
					const url = URL.createObjectURL(r.file);
					list.push({ id: r.id, mime: r.file.type || "audio/mpeg", data: url, label: r.label || r.id, custom: true, file: r.file });
				}
				buildPicker();
				refresh();
			});

			refresh();
			// ESC 收起：只把「展开面板」折叠成迷你播放器，不关闭迷你播放器
			dock.__ffMusicEscape = () => { if (card.style.display === "flex") collapseMini(); };
			return () => {
				audio.pause();
				audio.src = "";
				document.removeEventListener("click", onDocClick);
				delete dock.__ffMusicEscape;
				btn.remove();
				card.remove();
				picker.remove();
				mini.remove();
			};
		}

		// ═══════════ 7.8 表情包隐藏彩蛋（按对话内容触发）═══════════
		function startEmotes() {
			const map = {};
			(Array.isArray(EMOTES) ? EMOTES : []).forEach((e) => { map[e.id] = e.data; });

			const overlay = document.createElement("div");
			overlay.className = "ff-emote";
			const img = document.createElement("img");
			overlay.appendChild(img);
			document.body.appendChild(overlay);

			let hideTimer = null, lastShown = 0, turnLocked = false;
			function showEmote(name) {
				const data = map[name];
				if (!data) return;
				const now = Date.now();
				if (now - lastShown < 2500) return; // 冷却，避免连闪
				lastShown = now;
				turnLocked = true; // 每个回合最多展示一次
				img.src = data;
				overlay.classList.add("show");
				if (hideTimer) clearTimeout(hideTimer);
				hideTimer = setTimeout(() => overlay.classList.remove("show"), 3200);
			}

			// 用户侧触发词（由 Enter 捕获用户输入）
			const USER_RULES = [
				["得意", /厉害|牛逼|太强|666|大神|佩服|绝了/i],
				["开心", /谢谢|感谢|太棒|真好|不错|满意|喜欢|赞|优秀|很好|太好|好耶/],
				["变身", /开干|开工|开始|动手|走起|冲|搞起|出发|干活/],
			];
			// 助手侧触发词（由 DOM 监听助手回复）
			const ASSIST_RULES = [
				["没错", /没错|正是|确实|对极了/],
				["期待", /提供|发我|上传|发一下|给我|给个|请.*(发|给|提供|上传|告诉)/],
				["疑惑", /确认一下|是否|可以吗|要不要|需不需要|要我.*吗|帮你.*吗|你.*确认/],
			];
			function classify(text, rules) {
				for (const [name, re] of rules) if (re.test(text)) return name;
				return null;
			}

			// 1) 用户输入：Enter 发送时分类（开心/得意/变身）
			const onUserKey = (e) => {
				if (e.key !== "Enter") return;
				const t = e.target;
				if (!t || (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA")) return;
				turnLocked = false; // 新回合，解锁
				const name = classify(t.value || "", USER_RULES);
				if (name) showEmote(name);
			};
			document.addEventListener("keydown", onUserKey, true);

			// 2) 助手回复：MutationObserver 监听新增文本（疑惑/没错/期待）
			let buf = "", flushTimer = null;
			const observer = new MutationObserver((muts) => {
				let added = "";
				for (const m of muts) {
					for (const n of m.addedNodes) {
						if (n.nodeType !== 1) continue;
						if (n.closest && n.closest(".ff-emote, .ff-bg-panel, .ff-amb-menu, .ff-music-card, .ff-music-mini, .ff-ms-picker, .ff-amb, .ff-boot")) continue;
						if (n.matches && n.matches("textarea, input, .ff-boot")) continue;
						const txt = (n.textContent || "").trim();
						if (txt.length > 1) added += " " + txt;
					}
				}
				if (!added.trim()) return;
				buf += " " + added;
				if (flushTimer) clearTimeout(flushTimer);
				flushTimer = setTimeout(() => {
					const text = buf;
					buf = "";
					if (turnLocked) return; // 本回合已展示过表情
					const name = classify(text, ASSIST_RULES);
					if (name) showEmote(name);
				}, 1500);
			});
			observer.observe(document.body, { childList: true, subtree: true });

			return () => {
				document.removeEventListener("keydown", onUserKey, true);
				observer.disconnect();
				if (flushTimer) clearTimeout(flushTimer);
				if (hideTimer) clearTimeout(hideTimer);
				overlay.remove();
			};
		}

		// ═══════════ 8. 彩蛋：输入「SAM」重播开屏变身 ═══════════
		function startEasterEgg() {
			let last = 0;
			const onKey = (e) => {
				if (e.key !== "Enter") return;
				const t = e.target;
				if (!t || (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA")) return;
				const v = (t.value || "").trim().toLowerCase();
				if (v !== "sam") return; // 仅保留 SAM 触发开屏动画
				const now = Date.now();
				if (now - last < 8000) return;
				last = now;
				playTransformIntro();
			};
			document.addEventListener("keydown", onKey, true);
			return () => document.removeEventListener("keydown", onKey, true);
		}

		// ═══════════ 8.9 可拖动工具条（毛玻璃长条，位置记忆）═══════════
		function startDock() {
			const dock = document.createElement("div");
			dock.className = "ff-dock";
			document.body.appendChild(dock);

			const LS_DOCK = "ff_dock_pos";
			// 恢复上次位置
			try {
				const raw = localStorage.getItem(LS_DOCK);
				if (raw) {
					const p = JSON.parse(raw);
					if (typeof p.x === "number" && typeof p.y === "number") {
						dock.style.left = p.x + "px";
						dock.style.top = p.y + "px";
						dock.style.right = "auto";
						dock.style.bottom = "auto";
					}
				}
			} catch (e) {}

			let startX = 0, startY = 0, origL = 0, origT = 0;
			let pid = null, dragging = false, moved = false, suppressUntil = 0;

			// 弹层相对 dock 水平居中（宽度大于 dock 时左右对称）；超出视口则贴边钳制
			const popups = new Set();
			function repositionPopup(el) {
				if (!el || el.offsetParent === null) return; // 未挂载或 display:none
				const dr = dock.getBoundingClientRect();
				el.style.right = "auto";
				el.style.left = "0px";
				const r = el.getBoundingClientRect();
				const vw = window.innerWidth;
				const centered = (dr.width - r.width) / 2;
				const minL = 8 - dr.left;
				const maxL = vw - 8 - dr.left - r.width;
				let left;
				if (minL > maxL) left = minL;
				else left = Math.min(Math.max(centered, minL), maxL);
				el.style.left = left + "px";
			}
			function repositionPopups() { for (const el of popups) repositionPopup(el); }
			dock.__ffCenter = (el) => { popups.add(el); repositionPopup(el); };

			function clamp(x, y) {
				const r = dock.getBoundingClientRect();
				const pad = 8;
				const maxX = Math.max(pad, window.innerWidth - r.width - pad);
				const maxY = Math.max(pad, window.innerHeight - r.height - pad);
				return [Math.min(Math.max(pad, x), maxX), Math.min(Math.max(pad, y), maxY)];
			}

			const onDown = (e) => {
				const r = dock.getBoundingClientRect();
				pid = e.pointerId;
				startX = e.clientX; startY = e.clientY;
				origL = r.left; origT = r.top;
				dragging = true; moved = false;
			};
			const onMove = (e) => {
				if (!dragging || e.pointerId !== pid) return;
				const dx = e.clientX - startX, dy = e.clientY - startY;
				if (!moved && Math.hypot(dx, dy) < 4) return;
				if (!moved) {
					moved = true;
					dock.classList.add("dragging");
					try { dock.setPointerCapture(pid); } catch (err) {}
				}
				const pos = clamp(origL + dx, origT + dy);
				dock.style.left = pos[0] + "px";
				dock.style.top = pos[1] + "px";
				dock.style.right = "auto";
				dock.style.bottom = "auto";
				repositionPopups();
			};
			const onUp = (e) => {
				if (e.pointerId !== pid) return;
				dragging = false;
				dock.classList.remove("dragging");
				try { if (dock.hasPointerCapture(pid)) dock.releasePointerCapture(pid); } catch (err) {}
				if (moved) {
					const r = dock.getBoundingClientRect();
					try { localStorage.setItem(LS_DOCK, JSON.stringify({ x: r.left, y: r.top })); } catch (err) {}
					suppressUntil = Date.now() + 300; // 拖动后吞掉本次 click，避免误触按钮
				}
				pid = null;
			};
			const onClickCapture = (e) => {
				if (Date.now() < suppressUntil) { e.stopPropagation(); e.preventDefault(); }
			};
			const onResize = () => {
				if (!dock.style.left) return;
				const r = dock.getBoundingClientRect();
				const pos = clamp(r.left, r.top);
				dock.style.left = pos[0] + "px";
				dock.style.top = pos[1] + "px";
				repositionPopups();
			};

			dock.addEventListener("pointerdown", onDown);
			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
			window.addEventListener("pointercancel", onUp);
			dock.addEventListener("click", onClickCapture, true);
			window.addEventListener("resize", onResize);

			return {
				el: dock,
				dispose: () => {
					dock.removeEventListener("pointerdown", onDown);
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
					window.removeEventListener("pointercancel", onUp);
					dock.removeEventListener("click", onClickCapture, true);
					window.removeEventListener("resize", onResize);
					dock.remove();
				}
			};
		}

		// ═══════════ 9. apply ═══════════
		function apply(ctx) {
			ctx.effect(() => {
				// 1) 注入身份层样式
				if (!document.querySelector("style[data-firefly-theme]")) {
					const style = document.createElement("style");
					style.dataset.fireflyTheme = THEME_ID;
					style.textContent = identityCSS();
					document.head.appendChild(style);
				}

				// 2) 注册主题并激活
				try {
					ctx.theme.register({
						id: THEME_ID,
						colorScheme: "dark",
						tokens: TOKENS
					});
					ctx.theme.setTheme(THEME_ID);
				} catch (e) {
					console.error("dsh-theme-firefly register failed", e);
				}

				// 3) 锁深色（防止主题服务切回亮色把壁纸冲淡）
				document.documentElement.style.colorScheme = "dark";
				document.body.toggleAttribute("data-ds-dark-theme", true);
				const darkObserver = new MutationObserver(() => {
					document.documentElement.style.colorScheme = "dark";
					document.body.toggleAttribute("data-ds-dark-theme", true);
				});
				darkObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });

				// 4) 右下角可拖动工具条（承载四个按钮，弹层跟随其位置）
				const dockState = startDock();
				const dock = dockState.el;

				// 4.5) 背景音乐（先挂载，按钮排最左）
				const stopMusic = startMusic(dock);

				// 4.6) 壁纸（图片/动态视频，可切换）
				const stopWallpaper = startWallpaper(dock);

				// 5) 开屏变身动画（每次加载播放）
				playTransformIntro();

				// 6) 萤火氛围
				const stopAmbience = startAmbience(dock);

				// 7) 打字音效（排最右）
				const stopType = startTypeSound(dock);

				// 8) 彩蛋（SAM 重播开屏）
				const stopEgg = startEasterEgg();

				// 8.5) 表情包彩蛋
				const stopEmotes = startEmotes();

				// 8.6) ESC 一键关闭所有右下角浮层
				const onEsc = (e) => {
					if (e.key !== "Escape") return;
					document.querySelectorAll(".ff-bg-panel.open, .ff-amb-menu.open, .ff-bg-picker.open, .ff-ms-picker.open").forEach((el) => el.classList.remove("open"));
					if (dock.__ffMusicEscape) dock.__ffMusicEscape();
				};
				document.addEventListener("keydown", onEsc);

				return () => {
					document.removeEventListener("keydown", onEsc);
					darkObserver.disconnect();
					stopWallpaper();
					stopAmbience();
					stopType();
					stopMusic();
					stopEgg();
					stopEmotes();
					dockState.dispose();
					document.querySelectorAll("style[data-firefly-theme]").forEach((s) => s.remove());
				};
			}, "dsh-theme-firefly: apply");
		}

		exports.isPlugin = true;
		exports.inject = ["theme"];
		exports.apply = apply;
		return module.exports;
	}
});
