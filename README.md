# dsh-theme-firefly · 流萤主题

> 🌌 崩坏：星穹铁道「流萤」主题的 **DeepSeek Harness Web UI** 皮肤插件。
> 萤火绿霓虹配色 × 立绘/动态壁纸 × 开屏变身动画 × 萤火氛围粒子 × 背景音乐 × 打字音效。

让流萤的萤火为你点亮DSH。✨

## 🖼️ 预览与演示

### 动态 / 静态壁纸

![壁纸](docs/screenshots/01-wallpaper.jpg)

### 开屏变身动画

![开屏动画](docs/screenshots/02-boot.jpg)

### 萤火氛围粒子

![萤火粒子](docs/screenshots/03-firefly.jpg)

### 背景音乐播放器

![背景音乐](docs/screenshots/04-music.jpg)

### 表情包彩蛋

![表情包](docs/screenshots/05-emote.jpg)

> 🎬 演示视频（B 站）：
https://www.bilibili.com/video/BV1nF8B6QEEj/?spm_id_from=333.1387.homepage.video_card.click&vd_source=573abae8b62b8edf27edc7cb8933e1b6

---

## ✨ 功能特性

### 壁纸系统（图片 / 动态视频）

- 全屏 `cover` 铺底，界面容器半透明让壁纸透出；左暗右亮渐变遮罩保证聊天区可读
- 右下角「**景**」按钮弹出常驻面板：
  - **类型**：动态（mp4）/ 静态（图片），各自独立记忆当前壁纸
  - **选择**：弹出缩略图网格，点选具体壁纸；**随机**：自动随机轮换
  - **随机间隔**：自定义分钟数（默认 5 分钟）
  - **＋ 添加壁纸**：从本机导入图片/视频，自动归入对应类型并立即生效（IndexedDB 持久化）
  - 点「**确定**」收起面板，所有设置实时生效并持久化

### 流萤配色

- 深空海军蓝黑 × 萤火虫青绿（`#00ff87` / `#7dff9e`）× 莹白文字
- 覆盖 100+ 个 `--dsw-*` 设计令牌，随主题即时生效

### 开屏变身动画

- 内嵌 GIF 居中淡入，带绿色辉光边框 + 「流萤 // FIREFLY」标题
- 每次刷新播放，时长跟随 GIF，点击任意处或「点击跳过」可跳过
- 尊重系统 `prefers-reduced-motion`，自动跳过

### 萤火氛围粒子

- 右下角「**萤**」按钮分档：关 / 星点（12）/ 曳光（28）/ 流萤（80）
- 数量切换带 0.9s 淡入淡出过渡，不陡然变化、不刷新页面
- 每只萤火虫有独立尺寸、亮度、漂浮轨迹与呼吸式闪烁

### 背景音乐

- 右下角「**乐**」按钮点击开/关，弹出迷你播放卡片
- 支持 上一首 / 播放暂停 / 下一首 / 循环模式（单曲循环 → 列表循环 → 随机播放）
- 当前曲目与循环模式持久化

### 打字音效

- 聊天输入框打字时播放「咔哒 + 低频咚」的萤火质感按键音
- Web Audio 实时合成，零音频文件；空格/回车音色更低；「**声**」按钮开关

### 彩蛋

- **开屏动画**：输入框发送 **`SAM`** → 重播开屏变身动画（精确匹配，普通消息不误触）
- **表情包**（`GIF/表情包/` 目录，按对话内容触发，每回合最多一个，右下角弹出）：
  - 你夸赞时 → 「开心」/「得意」（谢谢/太棒/厉害/绝了…）
  - 你确认开干时 → 「变身」（开始/开干/动手/走起/冲…）
  - 我确认时 → 「没错」（没错/正是/确实…）
  - 我需要你提供时 → 「期待」（发我/提供/给我…）
  - 我需要你确认时 → 「疑惑」（确认一下/要我…吗/可以吗…）

---

## 🎛️ 界面操作

右下角四个按钮（自右向左）：

| 按钮 | 功能 |
|---|---|
| **声** | 打字音效 开/关 |
| **萤** | 氛围粒子分档（关/星点/曳光/流萤） |
| **景** | 壁纸设置（类型 + 选择/随机 + 随机间隔 + 添加壁纸 + 确定） |
| **乐** | 背景音乐 开/关 + 播放卡片 |

> 按 **ESC** 可一键关闭所有右下角浮层。

---

## 🎨 灵感来源

- **角色与主题**：本主题致敬米哈游《崩坏：星穹铁道》中的角色 **流萤（Firefly）** 与其机甲 **S.A.M.** ——「完全燃烧」的变身、萤火虫般的荧光、以及那句「我将点燃大海」。
- **音乐**：默认曲目为 HOYO-MiX 出品的《**使一颗心免于哀伤**》（知更鸟演唱），曲库另含《在银河中孤独摇摆》《希望有羽毛和翅膀》《若我不曾见过太阳》。
- **实现参考**：客户端主题的「令牌层 + 身份层」架构与 cordis 插件结构，学习自 [dsh-theme-cyberpunk2077](https://github.com/Tommy00748/dsh-theme-cyberpunk2077)（作者 Tommy00748），特此致谢。
- **生态**：DSH 插件目录 [awesome-dsh-plugin](https://github.com/beancookie/awesome-dsh-plugin)。

---

## 📁 目录结构

```
dsh-theme-firefly/
├── package.json            # dsh.client 声明（web 插件，注入 ui-theme 槽位）
├── lib/index.js            # 服务端占位
├── lib/client.template.js  # 浏览器端主题源码（含占位符，随仓库提交）
├── lib/client.js           # 构建产物（build.cjs 生成，含 base64 素材，git 忽略）
├── assets/                 # 壁纸：图片(jpg/png/webp) + mp4 动态壁纸
├── GIF/                    # 开屏动图（取第一个 .gif）
│   └── 表情包/             # 表情包 GIF（文件名即触发情绪：开心/得意/变身/没错/期待/疑惑）
├── music/                  # 背景音乐（mp3/ogg/m4a/wav），默认第一首「使一颗心免于哀伤」
├── build.cjs               # 构建：读取 client.template.js，把素材内嵌成 lib/client.js
├── LICENSE                 # MIT（仅代码）
├── .gitignore              # 忽略构建产物与第三方壁纸
└── README.md
```

---

## 🚀 快速开始

### 方式一：npm 安装（推荐，一条命令开箱即用）

```powershell
dsh plugin --profile web add dsh-theme-firefly
```

装完重启 `dsh web` 即生效。npm 包已内置「干净版」`lib/client.js`，**免 git、免构建**。

### 方式二：GitHub 源码安装（开发者/想改素材时用）

```powershell
# 1. clone 本仓库（仓库已提交干净版 client.js，clone 后开箱即用）
git clone https://github.com/Liu-ZA-81/dsh-theme-firefly.git

# 2. 以 link 方式安装到 web profile（本插件声明了 dsh.bundle，会自动注册）
dsh plugin --profile web add "link:<本目录绝对路径>"

# 3. 重启 dsh web 生效
```

> 想改内置素材时，改完 `assets/` 等目录后运行 `node build.cjs --clean` 重新构建干净版。

> 💡 开箱即用含一张**动态壁纸**（演示视频）与多张静态立绘；想加更多壁纸，
> 直接点「景」→「＋ 添加壁纸」导入，或把文件放入 `assets/` 后重新构建（见「自定义素材」）。

> ⚠️ 与其它主题（如赛博朋克主题）互斥：多个主题都会调用 `ctx.theme.setTheme`
> 并注入 `!important` 令牌样式，**后加载的赢**。建议同时只启用一个主题
> （把其它主题的 patch 行注释掉即可，可随时恢复）。

## 卸载

```powershell
dsh plugin --profile web remove dsh-theme-firefly
# 重启 dsh web 生效
```

## 📚 更多文档

- [FAQ 常见问题](./FAQ.md)

---

## 🛠️ 自定义素材

**壁纸**有两种添加方式：

1. **运行时添加（推荐）**：点「景」→「＋ 添加壁纸」，从本机选图片/视频，立即生效并持久化
2. **打包内嵌**：把文件放入 `assets/` 后运行 `node build.cjs`（适合预置默认壁纸）

其余素材（开屏动图、音乐）需通过 `build.cjs` 内嵌进 `lib/client.js`：

```powershell
node build.cjs          # 完整构建：打包 assets/ 里全部素材（含第三方，仅供本地使用）
node build.cjs --clean  # 干净构建：只打包 build.include.txt 清单里的素材（用于提交仓库）
```

- **壁纸**：`assets/` 支持 `.jpg/.jpeg/.png/.webp`（静态）与 `.mp4`（动态）
- **开屏动图**：`GIF/` 目录取第一个 `.gif`
- **音乐**：`music/` 支持 `.mp3/.ogg/.m4a/.wav`，默认第一首为「使一颗心免于哀伤」

> 💡 体积建议：素材会 base64 内嵌进 JS 包，建议控制大小（mp3 ≤128kbps、图片 ≤500KB、
> 视频 ≤1080p），避免页面加载变慢。
>
> ⚠️ **提交仓库前记得跑 `node build.cjs --clean`**（生成只含官方素材的干净版），
> 避免把含第三方壁纸的完整版误提交。

---

## 🔧 技术实现

1. **客户端插件机制**：通过 `window.__ModuleLoader__.load()` 注册为 DSH 客户端模块，
   导出 cordis 插件 `{ isPlugin, inject: ["theme"], apply }`
2. **设计令牌覆盖**：`apply(ctx)` 中 `ctx.theme.register({ id, colorScheme, tokens })`
   向 ThemeRuntime 注册 `--dsw-*` 令牌并 `setTheme` 激活
3. **身份层**：注入 `<style>` 实现壁纸背景、粒子动画、开屏动画等；音频全部
   Web Audio 实时合成，无外部资源依赖
4. **壁纸/音乐渲染**：动态壁纸用 `<video muted loop autoplay>`、静态用 CSS 背景层、
   音乐用 `<audio>`；均以 base64 data-URI 内嵌

---

## ⚖️ 版权与合规（重要）

- **代码**：本项目源码采用 [MIT](./LICENSE) 协议，欢迎自由使用与修改。
- **素材**：
  - 仓库**随代码开源的素材**仅为**米哈游 / HoYoverse / HOYO-MiX 官方内容**：
    音乐（如《使一颗心免于哀伤》等）、开屏 GIF、表情包 GIF，以及官方角色壁纸
    （`firefly-bg.jpg`、`firefly2.png`、`firefly3.png`）。米哈游对非商业同人二创较为友好，
    不涉及商业盈利一般不予追究，但版权仍归米哈游所有。
  - **第三方壁纸**：仓库仅随带**一个**演示视频（哲风壁纸「台灯-城市夜景-夜晚」）
    用于开箱即用体验，其余第三方壁纸与 mp4 **不随仓库分发**。使用者可通过
    「景」→「＋ 添加壁纸」导入自己的素材，或替换 `assets/` 内的文件。

> ⚠️ 请勿将第三方壁纸资源随仓库公开分发；如需收录，请使用你自己的原创或已授权素材。

## 📄 免责声明

本项目为粉丝同人作品，与米哈游、HoYoverse、DeepSeek 无任何关联，也未获得官方授权。
仅用于技术学习与个人使用。如侵权请联系我删除。
