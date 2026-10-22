# Cloudflare 发布说明

正式网站：<https://zephyr-eyes.com/>。当前实际部署为 **Cloudflare Workers Static Assets**，Worker 名称 `aio-v3`，通过 GitHub 的 `master` 分支自动部署。Pages 配置仅作为另建 Pages 项目时的参考。

## 当前项目结构

| 目录 / 文件 | 用途 | 是否上传 |
| --- | --- | --- |
| 根目录 HTML、JS、CSS、`assets/`、`data/` | 可维护的站点源文件 | 否，先构建 |
| `scripts/build-public.mjs` | 跨平台构建与发布包校验 | Git 集成时由 Cloudflare 运行 |
| `scripts/publish-manifest.json` | 页面、图片与数据的发布白名单 | 仅构建使用 |
| `wrangler.jsonc` | Workers 名称、兼容日期与 `./public` 资源目录 | 仅部署使用 |
| `public/` | 已验证、可直接部署的静态产物 | 是，仅上传此目录 |
| `local-source/`、`assets/archive/`、`.impeccable/`、`.tmp/` | 原始资料、历史配图、设计资料与本地缓存 | 否 |

`public/` 当前只包含运行所需的页面、脚本、样式、图片、公式资料和 `_headers`。构建按明确的文件白名单打包，先检查源码，再生成并检查产物；校验包括 JavaScript、公式 JSON、图片/页面引用、内容关联、连招码格式与静态副本，以及本机路径暴露。

## 构建

需要 Node.js 20 或以上，无需安装 npm 依赖。构建前可执行 `npm run check`；修改构建或校验逻辑后执行 `npm test`。

Windows 本地：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-public.ps1
```

任何装有 Node.js 的环境（包括 Cloudflare Git 构建）：

```powershell
node .\scripts\build-public.mjs
```

构建成功后，只使用 `public/` 进行部署。可用 `python -m http.server 4173 --bind 127.0.0.1 --directory public` 在本地验收。

自定义临时输出仅支持 `node scripts/build-public.mjs --output .tmp/releases/preview` 这种 `.tmp/releases/<name>` 路径；构建会替换输出目录，勿在其中保存手工文件。

## 当前生产部署：Workers

- Worker：`aio-v3`
- 正式域名：`zephyr-eyes.com`
- 生产分支：`master`
- 构建命令：`node scripts/build-public.mjs`
- 部署命令：`npx wrangler deploy`
- 根目录：`/`
- 静态资源目录：`wrangler.jsonc` 中的 `assets.directory: "./public"`

必须保留仓库中的 Wrangler 配置。缺少配置时，Wrangler 自动检测可能把仓库根目录当成静态资源目录，连同安装的工具一起扫描；2026-10-22 的失败部署因此读入了 134 MiB 的 `workerd` 文件，超过单文件 25 MiB 限制。构建本身成功，部署失败时线上继续运行旧版本。

推送后的验收顺序：

1. GitHub 提交的 `Workers Builds: aio-v3` 检查成功。
2. Cloudflare 构建日志中的构建和部署命令均成功。
3. 正式站 `/combos` 显示 5 个分支及“PVP · 锤子”，复制按钮包含完整代码。

## 备选部署方式：Cloudflare Pages

### 直接上传（手动，可作回退）

项目已使用 Git 仓库（origin：`https://github.com/luo-cccc/aio-v3.git`，默认分支 `master`）。Direct Upload 仅作为手动回退：在 Cloudflare Dashboard 的 **Workers & Pages** 中新建应用，选择 **Get started → Drag and drop your files**，将整个 `public/` 文件夹拖入后部署。

Cloudflare 的 Direct Upload 项目之后不能直接切换成 Git 集成；若你预计需要自动部署，请一开始采用 Git 方式并新建对应 Pages 项目。详见 [Cloudflare Direct Upload 文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

### Pages Git 自动部署（新建 Pages 项目时使用）

项目已放在 GitHub（`https://github.com/luo-cccc/aio-v3.git`）：

- Production branch：`master`
- Build command：`node scripts/build-public.mjs`
- Build output directory：`public`
- Root directory：留空（仓库根目录即本项目）

这是无框架静态站；Cloudflare 会按构建命令的退出码判断构建是否成功。参考 [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)。

## 页面检查

1. 首页、攻略、连招码、视频、关于与 `calculator.html` 都能打开。
2. 属性计算器可切换“自定义技能系数”，输入后实时更新，并能打开 `data/attribute-formulas.json`。
3. 手机宽度下导航可展开，计算器输入区不横向溢出。
4. 确认 `_headers` 已随静态资源上传，并在正式页面响应头中验证缓存及安全策略。
5. 在正式域名重复以上检查；已有自定义域名无需重新绑定。

Cloudflare 对 `_headers` 的处理见 [官方 Headers 文档](https://developers.cloudflare.com/pages/configuration/headers/)。
