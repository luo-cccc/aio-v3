# 老洛MMO攻略站

面向《诡秘之主》歌颂者玩家的个人攻略静态站，提供 PVP / GVG / PVE 图文攻略、一键连招码、属性计算和原平台视频链接。

原生 HTML、CSS、JavaScript，无后端和数据库。Node.js 20 或以上用于校验与构建，无第三方 npm 依赖，无需执行 `npm install`。

## 快速开始

```powershell
npm run check
npm test
npm run build
python -m http.server 4173 --bind 127.0.0.1 --directory public
```

访问 <http://127.0.0.1:4173/>。Python 只用于这里的本地预览；构建只需要 Node.js。

也可以直接打开根目录 `index.html` 查看源码页面；同目录攻略链接支持本地文件预览。验收发布效果时以构建后的 `public/` 为准。

## 最新更新

### 2026-10-22

- 新增独立的 PVP 锤子一键连招栏目，支持复制夏亚丶方案，附惩戒、人脉技能、秘偶技能、飓风斧等技能说明与导入指引。
- 补齐禁用 JavaScript 时首页和攻略列表中的战略服、9 月 15 日 PVE 攻略入口，并统一连招分类顺序。
- 修复自动部署失败，确保新增内容能发布到正式网站。

完整记录见 [更新记录](docs/releases/release-notes.md)。

## 维护入口

| 任务 | 位置 |
| --- | --- |
| 修改攻略、连招码、视频、个人资料 | `site-content.js` |
| 新增或调整连招分类 | `site-content.js` → `comboBranches` |
| 修改页面模板、导航、复制交互 | `app.js` |
| 修改全站样式 | `styles.css` |
| 修改计算器 | `calculator.html`、`calculator.js`、`calculator.css` |
| 核对公式来源和边界 | `data/attribute-formulas.json` |
| 新增发布文件或图片 | `scripts/publish-manifest.json` |
| 记录用户可见更新 | `docs/releases/release-notes.md` 与本页最新更新 |

HTML 内保留了无 JavaScript 时的静态副本。更新内容后需同步对应 `<noscript>` 区域；校验会检查列表收录与连招码一致性。完整流程、关联字段和架构说明见 [仓库维护指南](docs/maintenance.md)。

## 目录职责

```text
*.html                 12 个页面入口及静态副本
app.js / styles.css    共用页面渲染、交互和样式
site-content.js        内容数据与连招分类
calculator.*           独立属性计算器
data/                  公开的公式资料
assets/                当前使用的配图与头像
  archive/             历史配图，保留在 Git 中，不发布
scripts/               构建、发布清单、校验和测试
docs/                  维护指南与更新记录
public/                自动生成的发布包，不进入 Git
local-source/          本机原始文档、PNG 和早期方案，不进入 Git
.tmp/ / .impeccable/    本地临时工作与设计资料，不进入 Git
```

计算器支持属性收益比较、自定义技能系数、五类目标、系数反推、实测校准和重置。输入不持久保存，刷新后回到初始值。

## 发布到 Cloudflare Workers

正式网站：<https://zephyr-eyes.com/>。当前使用 Cloudflare Workers Static Assets，Worker 名称为 `aio-v3`。

Git 仓库：<https://github.com/luo-cccc/aio-v3.git>，生产分支为 `master`。

- 构建命令：`node scripts/build-public.mjs`
- 部署命令：`npx wrangler deploy`
- 静态资源目录：由 `wrangler.jsonc` 明确指定 `./public`
- 根目录：仓库根目录 `/`

Windows 原有入口仍可用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-public.ps1
```

构建会校验源文件和产物；部署仅使用 `public/`，源码、原始资料、归档图片和临时文件不进入发布包。推送后需确认 Cloudflare 的构建及部署均成功，再检查正式网站。

部署设置和上线验收见 [Cloudflare 发布说明](DEPLOYMENT.md)。
