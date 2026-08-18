# 提交 awesome-dsh-plugin（org 新仓库）用的文案

## 提交规则（新）

- 目标仓库：`awesome-dsh-plugin/awesome-dsh-plugin`（注意是 org 名，不是 beancookie）
- **不要手改 README**，而是新增一个 YAML 文件，README 由脚本生成
- 文件路径：`data/plugins/Liu-ZA-81__dsh-theme-firefly.yml`

## YAML 内容（复制即用）

```yaml
url: https://github.com/Liu-ZA-81/dsh-theme-firefly
name: Liu-ZA-81/dsh-theme-firefly
category: theme
description:
  en: 'A Honkai: Star Rail "Firefly" theme with wallpaper/video backgrounds, firefly-green neon palette, transformation boot animation, ambient particles, BGM, typewriter SFX, and context-aware emote easter eggs.'
  zh: '崩坏：星穹铁道「流萤」主题：立绘/动态壁纸、萤火绿霓虹配色、开屏变身动画、萤火氛围粒子、背景音乐、打字音效与按对话触发的表情包彩蛋。'
```

> 注意：`en` 描述里的 "Honkai: Star Rail" 含冒号+空格，所以必须加单引号包裹，
> 否则 YAML 解析会报错。

## 提交步骤

1. Fork `awesome-dsh-plugin/awesome-dsh-plugin`
2. 在 fork 里新增 `data/plugins/Liu-ZA-81__dsh-theme-firefly.yml`（内容如上）
3. 本地运行 `npm ci` + `node scripts/generate-readme.mjs` 重新生成 README
4. 提交 YAML + 重新生成的 README，提 PR

## Checklist 对照

- [x] 新增一个 `data/plugins/<owner>__<repo>.yml` 文件
- [ ] 运行 `node scripts/generate-readme.mjs` 并提交重新生成的 README
- [x] package.json 声明 dsh.bundle
- [x] 仓库满 1 天 + 10 个提交
- [x] category = theme
- [x] 描述无营销词
- [x] 仓库有 dsh-plugin topic
