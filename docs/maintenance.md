# 仓库维护指南

## 当前架构

这是原生 HTML、CSS、JavaScript 多页面静态站，无后端、数据库和运行时包依赖。Node.js 20 或以上用于本地校验、测试和生成发布包；正式网站由 Cloudflare Workers Static Assets 托管。

当前包含 12 个页面入口：6 个栏目页和 6 篇独立攻略；内容数据包含 6 篇攻略、5 条连招和 6 条视频外链。视频外链包含同一作品的不同平台版本。

页面地址保持在根目录，方便旧链接和直接打开 HTML 继续使用。

```text
根目录 *.html          页面入口与无 JavaScript 时的静态内容
site-content.js        个人资料、平台链接、攻略、连招分类、连招码和视频
app.js                 页面模板、路由映射、复制、筛选、导航和背景动画
styles.css             共用样式
calculator.*           计算器模板、公式和隔离样式
data/                  随站点公开的公式参考资料
assets/                当前使用的头像与攻略配图
assets/archive/        历史配图；纳入 Git，不发布
scripts/               构建入口、发布清单、校验工具及其回归测试
wrangler.jsonc         Workers 部署配置，静态目录固定为 ./public
docs/                  维护指南与按日期归档的更新记录
public/                构建生成的发布包；不纳入 Git
local-source/          本机 Word、原始 PNG、早期方案；不纳入 Git
.tmp/                  提取工具、预览证据和临时构建；不纳入 Git
.impeccable/            本机设计与验收资料；不纳入 Git
PRODUCT.md / DESIGN.md 本机产品与设计约定；不纳入 Git
```

`local-source/documents/` 保存 3 份 Word，`images/` 保存 10 张原始 PNG，`planning/` 保存 9 月 3 日的早期方案。历史方案不代表当前功能。旧 `.tmp/` 提取脚本可能引用归档前的素材路径，重用前需要调整路径。

## 常用命令

无需 `npm install`；没有第三方 npm 依赖。

```powershell
npm run check
npm test
npm run build
python -m http.server 4173 --bind 127.0.0.1 --directory public
```

`npm run check` 检查发布文件、JavaScript 语法、JSON、资源引用、重复 ID、攻略/连招/视频关联、连招分支、连招码格式、平台 URL，以及首页/攻略页的静态列表和连招码静态副本。

检查不验证第三方视频是否仍可访问、不判断游戏中的连招效果，也不替代浏览器对复制和计算器的验收。公式以 `calculator.js` 的实现为准；`data/attribute-formulas.json` 是证据和边界参考，不会被计算器自动加载。

`npm test` 保护校验器和构建目录边界，包括资源遗漏、无效关联、错误代码格式与目录联接；不用于证明游戏公式正确。

## 内容更新位置

| 要修改的内容 | 主要文件 | 需要同步检查 |
| --- | --- | --- |
| 个人资料、平台链接 | `site-content.js` | `about.html` 等无脚本内容 |
| 攻略正文、截图、适用阶段 | `site-content.js` | 对应攻略 HTML 的 `<noscript>` 内容 |
| 新增攻略 | `site-content.js` 和新 HTML | `app.js` 页面映射、首页/攻略静态列表、发布清单 |
| 连招分类 | `site-content.js` 的 `comboBranches` | `combos.html` 静态分类、分类介绍文案 |
| 连招码、技能说明 | `site-content.js` 的 `combos` | `combos.html` 对应静态条目，完整保留 `[[...]]` |
| 视频外链 | `site-content.js` 的 `videos` | `videos.html` 静态条目 |
| 计算公式 | `calculator.js` | 页面解释、公式证据资料和实测边界 |
| 发布页面、图片、数据文件 | `scripts/publish-manifest.json` | HTML/内容数据中的路径 |

当前连招分支为 `pvp`、`pvp-hammer`、`pve`、`pve-hammer`、`gvg-small-account`。分支定义集中在内容文件，页面从这些定义生成分类和数量。

所有内容 ID 保持稳定，关联字段通过 ID 查找。攻略使用 `comboIds` / `videoIds`，连招使用 `guideId` / `videoId`，视频使用 `guideId` / `guideIds` / `comboIds`。不要为尚未核验的内容填写实测日期，也不要把旧攻略关联到不匹配的新技能方案。

## 日常维护流程

1. 修改数据与对应 HTML 静态副本；新增资源时更新发布清单。
2. 执行 `npm run check`。它不会修改文件。
3. 调整了构建或校验逻辑时执行 `npm test`。
4. 执行 `npm run build`，再预览 `public/`，检查桌面和手机布局、复制、攻略跳转及计算器输入。
5. 用户可见变更写入 `docs/releases/release-notes.md`，同一天合并；README 只保留最新日期记录。纯内部整理不单独编造用户功能更新。
6. 发布仅使用 `public/`。推送后确认 Workers Builds 检查成功并核对正式网站；Git 推送成功不代表部署成功。Cloudflare 设置见根目录 `DEPLOYMENT.md`。

## 构建边界

发布清单采用明确的文件白名单，归档图片、源文档和临时文件不会自动加入。构建先检查源码，检查通过后替换输出目录，再验证产物。

默认输出为 `public/`。临时发布包只允许放在 `.tmp/releases/<name>`，其中名称使用字母、数字、下划线或连字符，例如：

```powershell
node scripts/build-public.mjs --output .tmp/releases/preview
```

输出目录会被重新生成，不能存放手工维护文件。脚本拒绝把源码目录、仓库根目录、上级目录或目录联接作为输出位置。

## 已知维护边界

- JavaScript 模板与 `<noscript>` 副本仍需同步；检查覆盖列表收录与连招码，不逐句比对全部攻略正文。
- Google Fonts 和 Lucide 图标通过外部 CDN 加载；核心内容和计算公式保存在本地文件中。
- `.tmp/` 保留历史工作资料，其中可能包含旧发布暂存或独立 Git 目录，不能作为现行源码或直接发布。
- 旧图片已归档保留；如恢复使用，必须重新加入发布清单。
