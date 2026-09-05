# Cloudflare 发布说明

## 当前项目结构

| 目录 / 文件 | 用途 | 是否上传 |
| --- | --- | --- |
| 根目录 HTML、JS、CSS、`assets/`、`data/` | 可维护的站点源文件 | 否，先构建 |
| `scripts/build-public.mjs` | 跨平台构建与发布包校验 | Git 集成时由 Cloudflare 运行 |
| `public/` | 已验证、可直接部署的静态产物 | 是，仅上传此目录 |
| Word 文档、方案 Markdown、`.impeccable/`、`.tmp/` | 内容源、设计资料与本地缓存 | 否 |

`public/` 当前只包含运行所需的页面、脚本、样式、图片、公式资料和 `_headers`。构建会验证 JavaScript、公式 JSON、清单完整性、无本机路径和无 Word / Markdown / 临时文件。

## 构建

Windows 本地：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-public.ps1
```

任何装有 Node.js 的环境（包括 Cloudflare Git 构建）：

```powershell
node .\scripts\build-public.mjs
```

构建成功后，只使用 `public/` 进行部署。

## 部署方式

### 直接上传（手动，可作回退）

项目已使用 Git 仓库（origin：`https://github.com/luo-cccc/aio-v3.git`，默认分支 `master`）。Direct Upload 仅作为手动回退：在 Cloudflare Dashboard 的 **Workers & Pages** 中新建应用，选择 **Get started → Drag and drop your files**，将整个 `public/` 文件夹拖入后部署。

Cloudflare 的 Direct Upload 项目之后不能直接切换成 Git 集成；若你预计需要自动部署，请一开始采用 Git 方式并新建对应 Pages 项目。详见 [Cloudflare Direct Upload 文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

### Git 自动部署（推荐）

项目已放在 GitHub（`https://github.com/luo-cccc/aio-v3.git`）：

- Production branch：`master`
- Build command：`node scripts/build-public.mjs`
- Build output directory：`public`
- Root directory：留空（仓库根目录即本项目）

这是无框架静态站；Cloudflare 会按构建命令的退出码判断构建是否成功。参考 [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)。

## 发布后检查

1. 首页、攻略、连招码、视频、关于与 `calculator.html` 都能打开。
2. 属性计算器可切换“自定义技能系数”，输入后实时更新，并能打开 `data/attribute-formulas.json`。
3. 手机宽度下导航可展开，计算器输入区不横向溢出。
4. 在 Pages 的部署列表确认 `_headers` 已随产物上传；它会被 Pages 解析为响应头规则而不是作为页面提供。
5. 最后再绑定自定义域名，并在正式域名重复以上检查。

Cloudflare 对 `_headers` 的处理见 [官方 Headers 文档](https://developers.cloudflare.com/pages/configuration/headers/)。
