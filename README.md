# 老洛MMO攻略站

这是一个可直接发布到 Cloudflare Pages 的静态网站，服务于《诡秘之主》歌颂者 PVP / GVG / PVE 图文攻略、一键连招码、属性计算和往期视频外链。

## 本地预览

在该目录执行：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

然后访问 `http://127.0.0.1:4173/`。

也可以直接双击 `index.html` 打开；已发布攻略的同目录图文链接支持本地文件预览。使用本地服务器更接近正式部署环境。

## 最新更新

### 2026-09-10

- 新增专门面向小号的 GVG“炸尸体”一键连招分支与夏亚丶方案。
- 首页连招入口与连招页说明同步展示 PVP、PVE、小号 GVG 三类分支。
- 新增 9 月 7 日发布的歌颂者序列 8 PVP/PVE 攻略与属性计算器视频，支持哔哩哔哩和抖音观看。
- 新视频已关联 PVP/GVG、PVE 图文攻略及对应连招码，原有往期视频继续保留。

完整记录见 [更新记录](docs/releases/release-notes.md)。

## 更新内容

所有需要日常更新的内容集中在 `site-content.js`：

- `platforms`：填入各平台主页的完整 `https://` 链接。
- `version`：填入适用阶段、官方版本信息和最后核验日期。
- `guides`：新增或更新图文攻略条目。
- `combos`：按 `branch: "pvp"`、`branch: "pve"` 或 `branch: "gvg-small-account"` 填入实测连招码；填写后复制按钮会自动启用。
- `videos`：填入原平台的完整 `https://` 视频地址。

条目之间可选的关联字段也已预留：攻略可使用 `url`、`comboIds`、`videoIds`；连招码可使用 `guideId`、`videoId`；视频可使用 `guideId`、`comboIds`。只有关联内容真实可用时，页面才会显示对应入口。

## 属性计算器

`calculator.html` 是独立的属性收益与伤害估算工具，不依赖后端或第三方脚本。它支持两种口径、五类目标、词条即时比较、技能系数反推、实测校准和一键重置；计算器默认不保存输入，刷新页面会回到初始值。

- `calculator.js`：计算公式、状态联动和输入交互。
- `calculator.css`：仅作用于计算器页面的样式，避免影响其他攻略页面。
- `data/attribute-formulas.json`：公开的公式与核验边界资料；已移除原始本机文件路径。

## 发布到 Cloudflare Pages

发布包位于 `public/`，只包含网站运行所需的 HTML、CSS、JavaScript、`_headers`、公开的公式资料与 WebP 图片。不要上传项目根目录；根目录包含的 Word 成品、原始截图和设计资料已由 `.gitignore` 排除，不会进入版本库。

项目使用 Git 仓库（origin：`https://github.com/luo-cccc/aio-v3.git`，默认分支 `master`）。

1. 执行 `powershell -ExecutionPolicy Bypass -File .\scripts\build-public.ps1` 生成并校验发布包。
2. Cloudflare Pages 的 Git 集成自动部署：生产分支设为 `master`，构建命令设为 `node scripts/build-public.mjs`，输出目录设为 `public`，Root directory 留空。
3. 若采用 Direct Upload 手动上传：只将整个 `public/` 文件夹拖入 Cloudflare Pages。
4. 发布后，在 Pages 的自定义域名设置中绑定你的域名。

详细的部署选择、Cloudflare 配置和发布后检查见 [DEPLOYMENT.md](DEPLOYMENT.md)。发布前核对：游戏官网版本或适用阶段、最后核验日期、平台和视频外链、图文/连招码关联入口，以及 `public/` 内不含源文档或临时文件。

## 文件结构

```text
index.html          首页
guides.html         PVP / GVG / PVE 攻略页
combos.html         一键连招码页
calculator.html     属性计算器页
videos.html         往期视频外链页
about.html          关于 / 合作页
site-content.js     可替换内容数据
styles.css          全站样式
app.js              页面渲染与交互
calculator.css      计算器页面样式（隔离）
calculator.js       计算器公式与交互
data/               公开的公式资料
assets/             本地品牌资产与原始截图
scripts/            发布包构建脚本
public/             可直接上传到 Cloudflare Pages 的发布包
DEPLOYMENT.md        Cloudflare 部署与验收清单
```
