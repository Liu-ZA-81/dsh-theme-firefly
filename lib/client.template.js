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
				".ff-amb-toggle { position: fixed; right: 50px; bottom: 12px; z-index: 90; width: 30px; height: 30px;",
				"  border-radius: 50%; font-size: 13px; line-height: 1; color: rgba(170,230,200,0.75);",
				"  background: rgba(10,18,32,0.55); border: 1px solid rgba(125,255,158,0.35); cursor: pointer;",
				"  opacity: 0.55; padding: 0; }",
				".ff-amb-toggle:hover { opacity: 1; }",
				".ff-amb-toggle.on { opacity: 1; color: #7dff9e; box-shadow: 0 0 10px rgba(0,255,135,0.4); }",
				".ff-amb-menu { position: fixed; right: 50px; bottom: 52px; z-index: 92; display: none; flex-direction: column;",
				"  gap: 5px; background: rgba(10,18,32,0.88); border: 1px solid rgba(125,255,158,0.35);",
				"  border-radius: 10px; padding: 7px; box-shadow: 0 6px 24px rgba(0,0,0,0.4); }",
				".ff-amb-menu.open { display: flex; }",
				".ff-amb-opt { min-width: 64px; height: 26px; border-radius: 6px; border: 1px solid rgba(125,255,158,0.25);",
				"  background: rgba(0,255,135,0.07); color: rgba(200,255,225,0.88); cursor: pointer; font-size: 12px; padding: 0 8px; }",
				".ff-amb-opt:hover { background: rgba(0,255,135,0.16); }",
				".ff-amb-opt.active { background: rgba(0,255,135,0.22); color: #7dff9e; border-color: rgba(125,255,158,0.55); }",
				".ff-snd-toggle { position: fixed; right: 12px; bottom: 12px; z-index: 90; width: 30px; height: 30px;",
				"  border-radius: 50%; font-size: 13px; line-height: 1; color: rgba(170,230,200,0.75);",
				"  background: rgba(10,18,32,0.55); border: 1px solid rgba(125,255,158,0.35); cursor: pointer;",
				"  opacity: 0.55; padding: 0; }",
				".ff-snd-toggle:hover { opacity: 1; }",
				".ff-snd-toggle.off { opacity: 0.35; }",
				".ff-bg-toggle { position: fixed; right: 88px; bottom: 12px; z-index: 90; width: 30px; height: 30px;",
				"  border-radius: 50%; font-size: 13px; line-height: 1; color: rgba(170,230,200,0.75);",
				"  background: rgba(10,18,32,0.55); border: 1px solid rgba(125,255,158,0.35); cursor: pointer;",
				"  opacity: 0.55; padding: 0; }",
				".ff-bg-toggle:hover { opacity: 1; }",
				".ff-bg-panel { position: fixed; right: 88px; bottom: 52px; z-index: 92; display: none; flex-direction: column;",
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
				".ff-bg-picker { position: fixed; right: 88px; bottom: 52px; z-index: 93; display: none; flex-direction: column;",
				"  gap: 8px; max-height: 62vh; max-width: 340px; background: rgba(10,18,32,0.94);",
				"  border: 1px solid rgba(125,255,158,0.35); border-radius: 10px; padding: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.45); }",
				".ff-bg-picker.open { display: flex; }",
				".ff-bg-picker-title { font-size: 12px; letter-spacing: 2px; color: rgba(170,230,200,0.85); }",
				".ff-bg-picker-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; overflow-y: auto; }",
				".ff-bg-picker-item { display: flex; flex-direction: column; gap: 4px; align-items: center; background: transparent;",
				"  min-width: 0; border: 1px solid rgba(125,255,158,0.2); border-radius: 8px; padding: 4px; cursor: pointer;",
				"  color: rgba(200,255,225,0.85); font-size: 11px; }",
				".ff-bg-picker-item:hover { border-color: rgba(125,255,158,0.55); background: rgba(0,255,135,0.1); }",
				".ff-bg-picker-item img, .ff-bg-picker-item video { width: 100%; height: 72px; object-fit: cover; border-radius: 5px; background: #050a14; }",
				".ff-bg-picker-item span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
				".ff-emote { position: fixed; right: 14px; bottom: 92px; z-index: 96; pointer-events: none;",
				"  opacity: 0; transform: translateY(8px) scale(0.9); transition: opacity 0.25s ease, transform 0.25s ease; }",
				".ff-emote img { display: block; max-width: min(34vw, 320px); max-height: min(38vh, 300px);",
				"  border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 40px rgba(0,255,135,0.25); }",
				".ff-emote.show { opacity: 1; transform: translateY(0) scale(1); }",
				".ff-music-toggle { position: fixed; right: 126px; bottom: 12px; z-index: 90; width: 30px; height: 30px;",
				"  border-radius: 50%; font-size: 13px; line-height: 1; color: rgba(170,230,200,0.75);",
				"  background: rgba(10,18,32,0.55); border: 1px solid rgba(125,255,158,0.35); cursor: pointer;",
				"  opacity: 0.55; padding: 0; }",
				".ff-music-toggle:hover { opacity: 1; }",
				".ff-music-toggle.on { opacity: 1; color: #7dff9e; box-shadow: 0 0 10px rgba(0,255,135,0.4); }",
				".ff-music-card { position: fixed; right: 12px; bottom: 52px; z-index: 91; min-width: 230px;",
				"  background: rgba(10,18,32,0.85); border: 1px solid rgba(125,255,158,0.35); border-radius: 10px;",
				"  padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;",
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
				"@media (prefers-reduced-motion: reduce) { .ff-amb { display: none; } }"
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
		function startWallpaper() {
			const all = Array.isArray(WALLPAPERS) ? WALLPAPERS : [];
			const vids = all.filter((w) => w.kind === "video");
			const imgs = all.filter((w) => w.kind === "image");

			const bg = document.createElement("div");
			bg.className = "ff-bg";
			const shade = document.createElement("div");
			shade.className = "ff-bg-shade";
			document.body.append(bg, shade);

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-bg-toggle";
			btn.textContent = "景";
			btn.title = "壁纸设置";
			document.body.appendChild(btn);

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
			document.body.appendChild(panel);

			// 壁纸选择器（点击「选择」弹出，缩略图网格点选）
			const picker = document.createElement("div");
			picker.className = "ff-bg-picker";
			picker.innerHTML =
				'<div class="ff-bg-picker-title">选择壁纸</div>' +
				'<div class="ff-bg-picker-list"></div>';
			document.body.appendChild(picker);
			const pickerTitle = picker.querySelector(".ff-bg-picker-title");
			const pickerList = picker.querySelector(".ff-bg-picker-list");

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

			function doSwitch() {
				if (activeType === "video") showByIndex("video", vidIndex + 1);
				else showByIndex("image", imgIndex + 1);
			}

			function doRandom() {
				const arr = activeType === "video" ? vids : imgs;
				if (arr.length === 0) return;
				const cur = activeType === "video" ? vidIndex : imgIndex;
				let n = cur;
				if (arr.length > 1) while (n === cur) n = Math.floor(Math.random() * arr.length);
				showByIndex(activeType, n);
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

			// 打开壁纸选择器（点选具体壁纸；再次点击「选择」或选中后关闭）
			function openPicker() {
				if (picker.classList.contains("open")) { picker.classList.remove("open"); return; }
				setMode("switch");
				const arr = activeType === "video" ? vids : imgs;
				pickerTitle.textContent = "选择壁纸（" + (activeType === "video" ? "动态" : "静态") + "）";
				pickerList.innerHTML = "";
				arr.forEach((item, i) => {
					const cell = document.createElement("button");
					cell.type = "button";
					cell.className = "ff-bg-picker-item";
					if (item.kind === "video") {
						const v = document.createElement("video");
						v.src = item.data; v.muted = true; v.preload = "metadata"; v.playsInline = true;
						cell.appendChild(v);
					} else {
						const img = document.createElement("img");
						img.src = item.data;
						cell.appendChild(img);
					}
					const lab = document.createElement("span");
					lab.textContent = item.label || item.id;
					cell.appendChild(lab);
					cell.addEventListener("click", () => {
						if (item.kind === "video") showByIndex("video", i);
						else showByIndex("image", i);
						picker.classList.remove("open");
					});
					pickerList.appendChild(cell);
				});
				picker.classList.add("open");
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

			async function loadCustomWallpapers() {
				try {
					const records = await idbGetAll();
					for (const r of records) {
						if (!r || !r.file) continue;
						const url = URL.createObjectURL(r.file);
						const item = { id: r.id, kind: r.kind, data: url, label: r.label || r.id, custom: true };
						if (r.kind === "video") vids.push(item); else imgs.push(item);
					}
					typeBtns.video.disabled = vids.length === 0;
					typeBtns.image.disabled = imgs.length === 0;
				} catch (e) { /* IndexedDB 不可用则忽略 */ }
			}

			function addWallpaper() {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = "image/jpeg,image/png,image/webp,video/mp4";
				input.addEventListener("change", async () => {
					const file = input.files && input.files[0];
					if (!file) return;
					const kind = file.type.startsWith("video") ? "video" : "image";
					const id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
					const url = URL.createObjectURL(file);
					const item = { id, kind, data: url, label: file.name, custom: true };
					if (kind === "video") vids.push(item); else imgs.push(item);
					typeBtns.video.disabled = vids.length === 0;
					typeBtns.image.disabled = imgs.length === 0;
					render(item);
					await idbPut({ id, kind, file, label: file.name });
					btn.title = "已添加壁纸：" + file.name;
				});
				input.click();
			}

			btn.addEventListener("click", () => panel.classList.toggle("open"));
			typeBtns.video.addEventListener("click", () => pickType("video"));
			typeBtns.image.addEventListener("click", () => pickType("image"));
			modeBtns.switch.addEventListener("click", () => openPicker());
			modeBtns.random.addEventListener("click", () => setMode("random"));
			intervalInput.addEventListener("change", () => setIntervalMinutes(intervalInput.value));
			panel.querySelector(".ff-bg-ok").addEventListener("click", closePanel);
			panel.querySelector(".ff-bg-add").addEventListener("click", addWallpaper);

			// 初始化 UI
			intervalInput.value = interval;
			modeBtns.switch.classList.toggle("active", mode === "switch");
			modeBtns.random.classList.toggle("active", mode === "random");

			// 恢复上次壁纸（含运行时添加的）；否则默认第一张视频，再否则第一张图
			async function initWallpaper() {
				await loadCustomWallpapers();
				let startItem = vids[0] || imgs[0] || null;
				const saved = localStorage.getItem(LS_BG);
				if (saved) {
					const found = vids.concat(imgs).find((w) => w.id === saved);
					if (found) {
						startItem = found;
						if (found.kind === "video") vidIndex = Math.max(0, vids.indexOf(found));
						else imgIndex = Math.max(0, imgs.indexOf(found));
					}
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
		function startAmbience() {
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
			btn.className = "ff-amb-toggle";
			btn.textContent = "萤";
			btn.title = "萤火氛围数量";
			document.body.appendChild(btn);

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
			document.body.appendChild(menu);

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
		function startTypeSound() {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-snd-toggle";
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
			document.body.appendChild(btn);
			return () => {
				document.removeEventListener("keydown", onKeydown, true);
				btn.remove();
			};
		}

		// ═══════════ 7.5 背景音乐播放器 ═══════════
		const LS_MUSIC_MODE = "ff_music_mode";
		const LS_MUSIC_ID = "ff_music_id";
		function startMusic() {
			const list = Array.isArray(MUSIC) ? MUSIC : [];
			const audio = new Audio();
			audio.volume = 0.9;
			let current = 0;
			let mode = localStorage.getItem(LS_MUSIC_MODE) || "list"; // single | list | shuffle
			let playing = false;

			const MODES = { single: "单曲", list: "列表", shuffle: "随机" };

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ff-music-toggle";
			btn.textContent = "乐";
			btn.title = "背景音乐开关";
			document.body.appendChild(btn);

			const card = document.createElement("div");
			card.className = "ff-music-card";
			card.innerHTML =
				'<div class="ff-music-top"><span class="ff-music-title">—</span>' +
				'<button class="ff-music-close" type="button" title="收起">×</button></div>' +
				'<div class="ff-music-row">' +
				'<button class="ff-music-btn" data-act="prev" title="上一首">⏮</button>' +
				'<button class="ff-music-btn ff-music-play" data-act="play" title="播放/暂停">▶</button>' +
				'<button class="ff-music-btn" data-act="next" title="下一首">⏭</button>' +
				'<button class="ff-music-btn ff-music-mode" data-act="mode" title="循环模式">列表</button>' +
				'</div>';
			card.style.display = "none";
			document.body.appendChild(card);

			const titleEl = card.querySelector(".ff-music-title");
			const playBtn = card.querySelector('[data-act="play"]');
			const modeBtn = card.querySelector('[data-act="mode"]');

			function refresh() {
				btn.classList.toggle("on", playing);
				playBtn.textContent = playing ? "⏸" : "▶";
				modeBtn.textContent = MODES[mode];
				modeBtn.title = "循环模式：" + MODES[mode] + "（点击切换）";
				if (list[current]) titleEl.textContent = "♪ " + (list[current].label || list[current].id);
			}

			function loadAndPlay(i) {
				if (list.length === 0) return;
				current = ((i % list.length) + list.length) % list.length;
				const item = list[current];
				audio.src = item.data;
				audio.loop = mode === "single";
				audio.play().then(() => { playing = true; refresh(); }).catch(() => { playing = false; refresh(); });
				if (item.id) localStorage.setItem(LS_MUSIC_ID, item.id);
				refresh();
			}

			function openCard() { card.style.display = "flex"; }
			function closeCard() { card.style.display = "none"; }

			function toggle() {
				if (list.length === 0) return;
				if (!audio.src) {
					let start = 0;
					const saved = localStorage.getItem(LS_MUSIC_ID);
					if (saved) { const idx = list.findIndex((m) => m.id === saved); if (idx >= 0) start = idx; }
					openCard();
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

			function next() {
				if (list.length === 0) return;
				if (mode === "shuffle" && list.length > 1) {
					let n = current;
					while (n === current) n = Math.floor(Math.random() * list.length);
					loadAndPlay(n);
				} else {
					loadAndPlay(current + 1);
				}
			}
			function prev() { if (list.length === 0) return; loadAndPlay(current - 1); }

			function cycleMode() {
				mode = mode === "single" ? "list" : mode === "list" ? "shuffle" : "single";
				localStorage.setItem(LS_MUSIC_MODE, mode);
				audio.loop = mode === "single";
				refresh();
			}

			audio.addEventListener("ended", () => { if (!audio.loop) next(); });
			btn.addEventListener("click", () => { toggle(); if (audio.src) openCard(); });
			card.querySelector('[data-act="prev"]').addEventListener("click", prev);
			playBtn.addEventListener("click", () => {
				if (playing) { audio.pause(); playing = false; refresh(); }
				else { audio.play().then(() => { playing = true; refresh(); }).catch(() => {}); }
			});
			card.querySelector('[data-act="next"]').addEventListener("click", next);
			modeBtn.addEventListener("click", cycleMode);
			card.querySelector(".ff-music-close").addEventListener("click", closeCard);

			refresh();
			return () => { audio.pause(); audio.src = ""; btn.remove(); card.remove(); };
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
						if (n.closest && n.closest(".ff-emote, .ff-bg-panel, .ff-amb-menu, .ff-music-card, .ff-amb, .ff-boot")) continue;
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

				// 4) 壁纸（图片/动态视频，可切换）
				const stopWallpaper = startWallpaper();

				// 5) 开屏变身动画（每次加载播放）
				playTransformIntro();

				// 6) 萤火氛围
				const stopAmbience = startAmbience();

				// 7) 打字音效
				const stopType = startTypeSound();

				// 7.5) 背景音乐
				const stopMusic = startMusic();

				// 8) 彩蛋（SAM 重播开屏）
				const stopEgg = startEasterEgg();

				// 8.5) 表情包彩蛋
				const stopEmotes = startEmotes();

				// 8.6) ESC 一键关闭所有右下角浮层
				const onEsc = (e) => {
					if (e.key !== "Escape") return;
					document.querySelectorAll(".ff-bg-panel.open, .ff-amb-menu.open, .ff-bg-picker.open").forEach((el) => el.classList.remove("open"));
					document.querySelectorAll(".ff-music-card").forEach((el) => { el.style.display = "none"; });
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
