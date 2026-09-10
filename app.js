(() => {
  "use strict";

  const content = window.SITE_CONTENT;
  const page = document.body.dataset.page || "home";
  const main = document.querySelector("#main-content");
  const toast = document.querySelector(".toast");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let toastTimer;

  if (!content || !main) return;

  const navItems = [
    ["home", "首页", "index.html"],
    ["guides", "PVP / GVG / PVE 攻略", "guides.html"],
    ["combos", "一键连招码", "combos.html"],
    ["calculator", "属性计算", "calculator.html"],
    ["videos", "往期视频", "videos.html"],
    ["about", "关于 / 合作", "about.html"],
  ];

  const icon = (name, label = "") =>
    `<i data-lucide="${name}"${label ? ` aria-label="${escapeHtml(label)}" role="img"` : " aria-hidden=\"true\""}></i>`;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const safeExternalUrl = (value) => {
    try {
      const parsed = new URL(String(value));
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch {
      return "";
    }
  };

  const safeContentUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const parsed = new URL(value, window.location.href);
      const runningFromFile = window.location.protocol === "file:";
      const isSiblingFile = runningFromFile && parsed.protocol === "file:" && !/[\\/]/.test(value) && /^[\w.-]+\.html(?:[?#].*)?$/i.test(value);
      const isLocal = parsed.origin === window.location.origin;
      const allowedProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
      return isSiblingFile || (allowedProtocol && (isLocal || parsed.protocol === "https:")) ? parsed.href : "";
    } catch {
      return "";
    }
  };

  const showToast = (message) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  };

  const enhanceIcons = () => {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
  };

  const headerTemplate = () => {
    const navigation = navItems
      .map(([id, label, href]) => {
        const current = id === page || (["guidePvpGvg", "guidePve"].includes(page) && id === "guides") ? ' aria-current="page"' : "";
        return `<a href="${href}"${current}>${label}</a>`;
      })
      .join("");

    return `
      <header class="site-header" id="top">
        <div class="nav-shell">
          <a class="wordmark" href="index.html" aria-label="老洛MMO 首页">老洛MMO</a>
          <nav class="site-nav" id="site-navigation" aria-label="主导航">${navigation}</nav>
          <div class="nav-mark" aria-hidden="true">${icon("sun")}</div>
          <button class="menu-toggle" type="button" aria-label="展开导航" aria-controls="site-navigation" aria-expanded="false">
            ${icon("menu")}
          </button>
        </div>
      </header>`;
  };

  const footerTemplate = () => `
    <footer class="site-footer">
      <div class="footer-grid">
        <p>老洛MMO · 歌颂者实战档案</p>
        <small>攻略文字、配装整理、截图标注与计算器内容由老洛MMO持续维护；转载、镜像或商业使用请先取得授权并保留原文链接。</small>
      </div>
    </footer>`;

  const ticks = () =>
    Array.from({ length: 40 }, (_, index) => {
      const angle = (index / 40) * Math.PI * 2 - Math.PI / 2;
      const radius = index % 4 === 0 ? 50 : 48.8;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      return `<span class="seal-tick" style="--x:${x.toFixed(3)}%;--y:${y.toFixed(3)}%;--rot:${(angle + Math.PI / 2).toFixed(3)}rad"></span>`;
    }).join("");

  const platformChoices = () => {
    const links = content.platforms
      .filter((platform) => safeExternalUrl(platform.url))
      .map((platform) => {
        const url = safeExternalUrl(platform.url);
        return `<a class="platform-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(platform.name)}${icon("external-link")}</a>`;
      })
      .join("");
    return links;
  };

  const versionText = () => escapeHtml(content.version.label);

  const homePage = () => {
    const featured = content.guides.find((guide) => guide.featured) || content.guides[0];
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__stage">
          <div class="seal-stage" aria-label="老洛MMO 个人头像印章">
            <div class="avatar-seal">
              <div class="seal-orbit" aria-hidden="true"></div>
              <div class="seal-orbit--inner" aria-hidden="true"></div>
              <div class="seal-orbit--ticks" aria-hidden="true">${ticks()}</div>
              <div class="seal-avatar"><img src="${escapeHtml(content.profile.avatar)}" alt="老洛MMO 黑白手绘头像" /></div>
              <div class="seal-crest" aria-hidden="true">${icon("sun")}</div>
            </div>
          </div>
          <div class="hero-copy">
            <p class="hero-brand">老洛MMO</p>
            <div class="solar-rule" aria-hidden="true">${icon("sun")}</div>
            <h1 id="hero-title" class="hero-specialty">歌颂者</h1>
            <p class="hero-mode">PVP / GVG / PVE</p>
            <p class="hero-claim">实战攻略</p>
            <p class="hero-description">${escapeHtml(content.profile.shortBio)}</p>
            <button class="command-button" type="button" data-platform-toggle aria-expanded="false" aria-controls="platform-panel">
              <span class="button-icon" aria-hidden="true">${icon("radio")}</span>
              关注老洛MMO
            </button>
            <div class="platform-panel" id="platform-panel" aria-label="平台主页入口" hidden>${platformChoices()}</div>
          </div>
        </div>
        <nav class="hero-dock" aria-label="首页快捷入口">
          <a class="dock-link" href="guides.html">
            <span class="dock-icon" aria-hidden="true">${icon("compass")}</span>
            <span class="dock-copy"><strong>最新攻略</strong><small>${escapeHtml(featured?.updated || "内容待补充")}</small></span>
          </a>
          <a class="dock-link" href="combos.html">
            <span class="dock-icon" aria-hidden="true">${icon("zap")}</span>
             <span class="dock-copy"><strong>一键连招码</strong><small>PVP / PVE / 小号 GVG 分类</small></span>
          </a>
          <a class="dock-link" href="calculator.html">
            <span class="dock-icon" aria-hidden="true">${icon("calculator")}</span>
            <span class="dock-copy"><strong>属性计算</strong><small>词条收益与伤害估算</small></span>
          </a>
          <a class="dock-link" href="#version-status">
            <span class="dock-icon" aria-hidden="true">${icon("clock-3")}</span>
            <span class="dock-copy"><strong>${versionText()}</strong><small>适用范围与核验说明</small></span>
          </a>
        </nav>
      </section>

      <section class="content-band" aria-labelledby="latest-guides">
        <div class="section-heading">
          <h2 id="latest-guides">攻略会留下判断，不只留下结论。</h2>
          <p>图文内容用于沉淀对局经验。已发布攻略标注适用阶段、发布日期与核验日期，并关联对应的连招码和外部视频。</p>
        </div>
        <div class="archive-index">
          ${archiveEntry(featured, true)}
          <div class="archive-index__rail">${content.guides.filter((guide) => guide !== featured).map((guide) => archiveEntry(guide)).join("")}</div>
        </div>
      </section>

      <section class="content-band content-band--compact" id="version-status" aria-labelledby="version-heading">
        <div class="field-note">
          ${icon("scroll-text")}
          <div>
            <strong id="version-heading">${versionText()}</strong>
            <p>${escapeHtml(content.version.detail)}</p>
          </div>
        </div>
      </section>

      <section class="content-band content-band--compact" aria-labelledby="follow-heading">
        <div class="platform-rally">
          <div>
            <h2 id="follow-heading">图文归档在这里，实战仍在平台继续。</h2>
            <p>本站不嵌入播放器。视频保留在原平台，页面只负责把图文、连招码和实战内容串起来。</p>
          </div>
          <button class="command-button" type="button" data-platform-toggle aria-expanded="false" aria-controls="platform-panel-bottom">
            <span class="button-icon" aria-hidden="true">${icon("external-link")}</span>
            前往关注入口
          </button>
          <div class="platform-panel" id="platform-panel-bottom" aria-label="平台主页入口" hidden>${platformChoices()}</div>
        </div>
      </section>`;
  };

  const findEntry = (collection, id) => collection.find((entry) => entry.id === id);

  const guideCard = (guide) => {
    const guideUrl = safeContentUrl(guide.url);
    const heading = guideUrl
      ? `<h3><a class="guide-title-link" href="${escapeHtml(guideUrl)}">${escapeHtml(guide.title)}</a></h3>`
      : `<h3>${escapeHtml(guide.title)}</h3>`;
    const comboLinks = (guide.comboIds || [])
      .map((id) => findEntry(content.combos, id))
      .filter((combo) => combo?.code)
      .map((combo) => `<a href="combos.html#combo-${escapeHtml(combo.id)}">${icon("zap")} 连招码</a>`);
    const videoLinks = (guide.videoIds || [])
      .map((id) => findEntry(content.videos, id))
      .filter((video) => safeExternalUrl(video?.url))
      .map((video) => `<a href="videos.html#video-${escapeHtml(video.id)}">${icon("play")} 实战视频</a>`);
    const articleLink = guideUrl ? `<a class="guide-read-link" href="${escapeHtml(guideUrl)}">进入图文 ${icon("arrow-up-right")}</a>` : "";

    return `
      <article class="guide-card" id="guide-${escapeHtml(guide.id)}" data-tags="${escapeHtml(guide.tags.join(","))}">
        <span class="card-status">${escapeHtml(guide.status)}</span>
        ${heading}
        <p>${escapeHtml(guide.summary)}</p>
        <ul class="tag-list" aria-label="内容标签">${guide.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
        <div class="card-meta">
          <span>${icon("refresh-cw")} ${escapeHtml(guide.updated)}</span>
          ${comboLinks.join("")}${videoLinks.join("")}${articleLink}
        </div>
      </article>`;
  };

  const archiveEntry = (guide, featured = false) => {
    const guideUrl = safeContentUrl(guide.url);
    const heading = guideUrl
      ? `<h3><a class="guide-title-link" href="${escapeHtml(guideUrl)}">${escapeHtml(guide.title)}</a></h3>`
      : `<h3>${escapeHtml(guide.title)}</h3>`;
    const entryState = guideUrl
      ? `<a class="archive-entry__link" href="${escapeHtml(guideUrl)}">进入图文 ${icon("arrow-up-right")}</a>`
      : `<span class="archive-entry__pending">图文待归档</span>`;

    return `
      <article class="archive-entry${featured ? " archive-entry--lead" : ""}">
        ${heading}
        <p>${escapeHtml(guide.summary)}</p>
        <div class="archive-entry__ledger">
          <span class="archive-entry__status">${escapeHtml(guide.status)}</span>
          <ul class="tag-list" aria-label="内容标签">${guide.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
          <span class="archive-entry__updated">${icon("refresh-cw")} ${escapeHtml(guide.updated)}</span>
        </div>
        <div class="archive-entry__foot">${entryState}</div>
      </article>`;
  };

  const guidesPage = () => `
    <section class="page-hero" aria-labelledby="page-title">
      <div class="page-hero__layout">
        <div>
          <h1 id="page-title" class="page-title">PVP / GVG / PVE 攻略</h1>
          <p>统一归档歌颂者的 PVP / GVG 对局判断与 PVE 实战内容，可按内容类型查找。</p>
        </div>
        <div class="page-hero__meta"><span>歌颂者实战档案</span><span>内容会随版本持续更新</span></div>
      </div>
    </section>
    <section class="content-band" aria-label="攻略列表">
      <div class="filter-row" role="group" aria-label="筛选攻略">
        ${["全部", "PVP", "GVG", "PVE"]
          .map((filter, index) => `<button class="filter-button" type="button" data-guide-filter="${filter}" aria-pressed="${index === 0}">${filter}</button>`)
          .join("")}
      </div>
      <div class="guide-list" data-guide-list>${content.guides.map(guideCard).join("")}</div>
      <div class="empty-state" data-guide-empty hidden>${icon("search-x")}<span>当前筛选下还没有归档内容。</span></div>
    </section>`;

  const guideArticlePage = (guideId) => {
    const guide = findEntry(content.guides, guideId);
    const article = guide?.article || {};
    const sections = article.sections || [];
    const relatedCombos = (guide?.comboIds || [])
      .map((id) => findEntry(content.combos, id))
      .filter((combo) => combo?.code)
      .map((combo) => `
        <a class="article-relation" href="combos.html#combo-${escapeHtml(combo.id)}">
          ${icon("zap")}
          <span><strong>一键连招码</strong><small>${escapeHtml(combo.title)}</small></span>
          ${icon("arrow-up-right")}
        </a>`)
      .join("");
    const relatedVideos = (guide?.videoIds || [])
      .map((id) => findEntry(content.videos, id))
      .filter((video) => safeExternalUrl(video?.url))
      .map((video) => `
        <a class="article-relation" href="${escapeHtml(safeExternalUrl(video.url))}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${video.platform}实战视频：${video.title}，在新窗口打开`)}">
          ${icon("play")}
          <span><strong>${escapeHtml(video.platform)}实战视频</strong><small>${escapeHtml(video.title)}</small></span>
          ${icon("external-link")}
        </a>`)
      .join("");

    return `
      <article class="guide-article" aria-labelledby="article-title">
        <header class="article-hero">
          <a class="article-back" href="guides.html">${icon("arrow-left")} 返回攻略库</a>
          <div class="article-hero__layout">
            <div>
              <ul class="tag-list" aria-label="内容标签">${(guide?.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}<li>图文攻略</li></ul>
              <h1 id="article-title">${escapeHtml(guide?.title || "歌颂者图文攻略")}</h1>
              <p>${escapeHtml(article.intro || "本文将原始配装与技能截图整理为便于查阅的实战参考。")}</p>
            </div>
            <dl class="article-ledger">
              <div><dt>发布</dt><dd>${escapeHtml(article.published || guide?.updated || "待补充")}</dd></div>
              <div><dt>适用</dt><dd>${escapeHtml(article.applicability || "待补充")}</dd></div>
              <div><dt>定位</dt><dd>${escapeHtml((guide?.tags || []).join(" / ") || "攻略")}</dd></div>
            </dl>
          </div>
        </header>

        <div class="article-layout">
          <aside class="article-aside" aria-label="文章目录">
            <nav class="article-toc" aria-label="文章目录">${sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join("")}</nav>
          </aside>

          <div class="article-body">${sections.map((section, index) => `
            <section class="article-section${index === 0 ? " article-section--opening" : ""}" id="${escapeHtml(section.id)}">
              <div class="article-section__heading"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.lead)}</p></div>
              ${section.image ? `<figure class="article-figure"><img src="${escapeHtml(section.image)}" alt="${escapeHtml(section.imageAlt)}" width="1920" height="1080" loading="lazy" decoding="async" /><figcaption>${escapeHtml(section.caption)}</figcaption></figure>` : ""}
              <div class="article-copy">${(section.blocks || []).map((block) => `<h3>${escapeHtml(block.title)}</h3><p>${escapeHtml(block.text)}</p>`).join("")}</div>
            </section>`).join("")}

            <section class="article-section article-section--related" aria-labelledby="related-heading">
              <div class="article-section__heading">
                <h2 id="related-heading">关联内容</h2>
                <p>${relatedVideos ? "需要直接导入方案或回看实战时，可从这里继续。" : "需要直接导入方案时，可从这里继续。"}</p>
              </div>
              <div class="article-relations">${relatedCombos}${relatedVideos}</div>
            </section>
          </div>
        </div>
      </article>`;
  };

  const comboItem = (combo) => {
    const available = Boolean(combo.code);
    const code = available ? escapeHtml(combo.code) : "等待填入真实连招码";
    const guide = findEntry(content.guides, combo.guideId);
    const guideUrl = safeContentUrl(guide?.url);
    const videoIds = [...new Set([
      combo.videoId,
      ...content.videos.filter((video) => video.comboIds?.includes(combo.id)).map((video) => video.id),
    ].filter(Boolean))];
    const videoLinks = videoIds
      .map((id) => findEntry(content.videos, id))
      .filter((video) => safeExternalUrl(video?.url))
      .map((video) => `<a href="${escapeHtml(safeExternalUrl(video.url))}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${video.platform}视频：${video.title}，在新窗口打开`)}">${icon("play")} ${escapeHtml(video.platform)}视频</a>`)
      .join("");
    const relations = [
      guideUrl ? `<a href="${escapeHtml(guideUrl)}">${icon("file-text")} 关联攻略</a>` : "",
      videoLinks,
    ].join("");
    return `
      <article class="combo-item" id="combo-${escapeHtml(combo.id)}">
        <div class="combo-item__grid">
          <div>
            <span class="card-status">${escapeHtml(combo.version)}</span>
            <h2>${escapeHtml(combo.title)}</h2>
            <p>${escapeHtml(combo.scenario)}</p>
            <div class="meta-line"><span>${icon("refresh-cw")} ${escapeHtml(combo.updated)}</span>${relations}</div>
          </div>
          <div>
            <div class="code-box">
              <code>${code}</code>
              <button class="copy-button" type="button" ${available ? `data-copy-code="${escapeHtml(combo.code)}" aria-label="复制 ${escapeHtml(combo.title)}"` : "disabled aria-label=\"尚未提供连招码\""}>
                ${icon("copy")}
              </button>
            </div>
            <p>${available ? escapeHtml(combo.note || "复制后请按条目备注与对应版本使用。") : "首批实测连招码正在整理，发布后可在此一键复制。"}</p>
          </div>
        </div>
      </article>`;
  };

  const comboBranches = [
    {
      id: "pvp",
      title: "PVP 连招码",
      description: "玩家对战使用的实测连招会在这里单独归档，并标注适用版本与最后测试时间。",
    },
    {
      id: "pve",
      title: "PVE 连招码",
      description: "PVE 场景使用的实测连招会在这里单独归档，并标注适用版本与最后测试时间。",
    },
    {
      id: "gvg-small-account",
      title: "小号 GVG · 烧尸体",
      description: "专门归档小号 GVG 烧尸体方案，适合装备与属性仍在成型中的歌颂者。",
    },
  ];

  const comboBranch = (branch) => {
    const entries = content.combos.filter((combo) => (combo.branch || "pvp") === branch.id);
    const items = entries.length
      ? entries.map(comboItem).join("")
      : `<div class="combo-branch__empty">${icon("archive-x")}<span>该分支的连招码正在整理。</span></div>`;

    return `
      <section class="combo-branch" aria-labelledby="combo-branch-${escapeHtml(branch.id)}">
        <div class="combo-branch__heading">
          <h2 id="combo-branch-${escapeHtml(branch.id)}">${escapeHtml(branch.title)}</h2>
          <p>${escapeHtml(branch.description)}</p>
        </div>
        <div class="combo-list" aria-label="${escapeHtml(branch.title)}条目">${items}</div>
      </section>`;
  };

  const combosPage = () => `
    <section class="page-hero" aria-labelledby="page-title">
      <div class="page-hero__layout">
        <div>
          <h1 id="page-title" class="page-title">一键连招码</h1>
           <p>连招码按 PVP、PVE 与小号 GVG 分支归档，方便按实战场景查找。每条内容标注适用阶段、核验信息与关联内容。</p>
         </div>
         <div class="page-hero__meta"><span>3 个实战分支</span><span>核验信息见条目</span></div>
       </div>
     </section>
    <section class="content-band combo-branches" aria-label="连招码分支">${comboBranches.map(comboBranch).join("")}</section>`;

  const videoItem = (video) => {
    const url = safeExternalUrl(video.url);
    const available = Boolean(url);
    const guideIds = [...new Set([video.guideId, ...(video.guideIds || [])].filter(Boolean))];
    const guideLinks = guideIds
      .map((id) => findEntry(content.guides, id))
      .filter((guide) => safeContentUrl(guide?.url))
      .map((guide) => `<a href="${escapeHtml(safeContentUrl(guide.url))}">${icon("file-text")} 关联攻略</a>`)
      .join("");
    const comboLinks = (video.comboIds || [])
      .map((id) => findEntry(content.combos, id))
      .filter((combo) => combo?.code)
      .map((combo) => `<a href="combos.html#combo-${escapeHtml(combo.id)}">${icon("zap")} 关联连招码</a>`)
      .join("");
    const action = available
      ? `<a class="video-action" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">前往观看 ${icon("external-link")}</a>`
      : `<span class="video-action video-action--pending">链接待补充</span>`;
    return `
      <article class="video-item" id="video-${escapeHtml(video.id)}">
        <div class="video-item__grid">
          <div>
            <span class="card-status">${escapeHtml(video.platform)}</span>
            <h2>${escapeHtml(video.title)}</h2>
            <p>${escapeHtml(video.description)}</p>
            <div class="meta-line"><span>${icon("calendar-days")} ${escapeHtml(video.published)}</span>${guideLinks}${comboLinks}</div>
          </div>
          ${action}
        </div>
      </article>`;
  };

  const videosPage = () => `
    <section class="page-hero" aria-labelledby="page-title">
      <div class="page-hero__layout">
        <div>
          <h1 id="page-title" class="page-title">往期视频</h1>
          <p>视频保留原平台外链，不在本站建立播放器或视频中心。可从对应图文与连招码直接跳转观看。</p>
        </div>
        <div class="page-hero__meta"><span>外部平台归档</span><span>链接由老洛MMO手动维护</span></div>
      </div>
    </section>
    <section class="content-band" aria-label="往期视频链接"><div class="video-list">${content.videos.map(videoItem).join("")}</div></section>`;

  const aboutPage = () => `
    <section class="page-hero" aria-labelledby="page-title">
      <div class="page-hero__layout">
        <div>
          <h1 id="page-title" class="page-title">关于 / 合作</h1>
          <p>这是老洛MMO围绕歌颂者 PVP / GVG / PVE 经验建立的个人攻略站。内容、判断与更新由创作者本人持续维护。</p>
        </div>
        <div class="page-hero__meta"><span>老洛MMO</span><span>歌颂者实战内容创作者</span></div>
      </div>
    </section>
    <section class="content-band">
      <div class="about-layout">
        <div class="about-portrait"><img src="${escapeHtml(content.profile.avatar)}" alt="老洛MMO 黑白手绘头像" /></div>
        <div class="about-copy">
          <section>
            <h2>为什么只写歌颂者</h2>
            <p>本站刻意保持专精范围。图文攻略的价值不是囊括所有职业，而是把歌颂者在 PVP / GVG / PVE 中的实战判断沉淀成可以回看的内容。</p>
          </section>
          <section>
            <h2>内容如何组织</h2>
            <p>图文负责解释对局思路；一键连招码负责快速使用；往期视频链接负责回到原平台观看实战。三类内容相互关联，便于连续查阅。</p>
          </section>
          <section>
            <h2>合作与联系</h2>
            <p>如需合作或交流，可通过微信联系我。</p>
            <span class="contact-line">${icon("message-circle")} 微信：${escapeHtml(content.profile.wechat || "")}</span>
          </section>
        </div>
      </div>
    </section>`;

  const calculatorPage = () => {
    const template = document.querySelector("#calculator-template");
    return template?.innerHTML || `
      <section class="page-hero" aria-labelledby="calculator-missing-title">
        <div class="page-hero__layout">
          <div>
            <h1 id="calculator-missing-title" class="page-title">属性计算</h1>
            <p>计算器内容暂未载入，请刷新页面后重试。</p>
          </div>
        </div>
      </section>`;
  };

  const renderPage = () => {
    document.querySelector("#site-header").innerHTML = headerTemplate();
    document.querySelector("#site-footer").innerHTML = footerTemplate();
    const views = {
      home: homePage,
      guides: guidesPage,
      guidePvpGvg: () => guideArticlePage("field-manual"),
      guidePve: () => guideArticlePage("pve-notes"),
      combos: combosPage,
      calculator: calculatorPage,
      videos: videosPage,
      about: aboutPage,
    };
    main.innerHTML = (views[page] || homePage)();
    enhanceIcons();
  };

  const copyText = async (value) => {
    if (!value) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fall through to the selection-based browser fallback.
    }
    const temporary = document.createElement("textarea");
    temporary.value = value;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    return copied;
  };

  const wireInteractions = () => {
    const header = document.querySelector(".site-header");
    const nav = document.querySelector(".site-nav");
    const menu = document.querySelector(".menu-toggle");
    const mobileNavMedia = window.matchMedia("(max-width: 900px)");

    const syncNavAccessibility = () => {
      if (!nav || !menu) return;
      const mobile = mobileNavMedia.matches;
      const open = menu.getAttribute("aria-expanded") === "true";
      if (mobile && !open) {
        nav.inert = true;
        nav.setAttribute("aria-hidden", "true");
      } else {
        nav.inert = false;
        nav.removeAttribute("aria-hidden");
      }
    };

    const closeNav = () => {
      if (!nav || !menu) return;
      nav.classList.remove("is-open");
      menu.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-label", "展开导航");
      syncNavAccessibility();
    };

    menu?.addEventListener("click", () => {
      const expanded = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", String(!expanded));
      menu.setAttribute("aria-label", expanded ? "展开导航" : "收起导航");
      nav?.classList.toggle("is-open", !expanded);
      syncNavAccessibility();
    });

    nav?.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav();
    });

    window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 8), { passive: true });
    mobileNavMedia.addEventListener?.("change", () => {
      if (!mobileNavMedia.matches) closeNav();
      syncNavAccessibility();
    });
    syncNavAccessibility();

    document.querySelectorAll("[data-platform-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        if (!panel) return;
        const nextState = panel.hidden;
        document.querySelectorAll(".platform-panel:not([hidden])").forEach((openPanel) => {
          if (openPanel !== panel) openPanel.hidden = true;
        });
        document.querySelectorAll("[data-platform-toggle][aria-expanded=\"true\"]").forEach((openButton) => {
          if (openButton !== button) openButton.setAttribute("aria-expanded", "false");
        });
        panel.hidden = !nextState;
        button.setAttribute("aria-expanded", String(nextState));
      });
    });

    document.querySelectorAll("[data-video-placeholder]").forEach((button) => {
      button.addEventListener("click", () => showToast("视频外链尚未填写。"));
    });

    document.querySelectorAll("[data-copy-code]").forEach((button) => {
      button.addEventListener("click", async () => {
        const copied = await copyText(button.dataset.copyCode);
        showToast(copied ? "连招码已复制。" : "复制失败，请手动选择连招码。" );
      });
    });

    const filterButtons = document.querySelectorAll("[data-guide-filter]");
    const guideCards = document.querySelectorAll("[data-guide-list] .guide-card");
    const guideEmpty = document.querySelector("[data-guide-empty]");
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.guideFilter;
        let matches = 0;
        filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        guideCards.forEach((card) => {
          const isMatch = filter === "全部" || card.dataset.tags.split(",").includes(filter);
          card.classList.toggle("is-hidden", !isMatch);
          if (isMatch) matches += 1;
        });
        if (guideEmpty) guideEmpty.hidden = matches !== 0;
      });
    });
  };

  const drawScene = () => {
    const canvas = document.querySelector(".scene-canvas");
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let sparks = [];
    let frame;

    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparks = Array.from({ length: Math.min(52, Math.max(20, Math.floor(width / 26))) }, (_, index) => ({
        x: ((index * 67.73) % width) / width,
        y: ((index * 37.19) % height) / height,
        speed: 0.05 + ((index * 0.081) % 0.18),
        size: index % 7 === 0 ? 1.6 : 0.8,
      }));
    };

    const skyline = (xStart, xEnd, baseline, scale, color) => {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(xStart, baseline);
      for (let x = xStart; x < xEnd; x += 12 * scale) {
        const unit = Math.sin(x * 0.084) * 0.5 + 0.5;
        const heightUnit = (20 + unit * 68) * scale;
        context.lineTo(x, baseline - heightUnit);
        context.lineTo(x + 4 * scale, baseline - heightUnit - 38 * scale);
        context.lineTo(x + 8 * scale, baseline - heightUnit);
        context.lineTo(x + 12 * scale, baseline - heightUnit + 9 * scale);
      }
      context.lineTo(xEnd, baseline);
      context.closePath();
      context.fill();
    };

    const gothicSpire = (x, baseline, scale, color) => {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(x - 44 * scale, baseline);
      context.lineTo(x - 35 * scale, baseline - 42 * scale);
      context.lineTo(x - 21 * scale, baseline - 49 * scale);
      context.lineTo(x - 15 * scale, baseline - 112 * scale);
      context.lineTo(x - 4 * scale, baseline - 132 * scale);
      context.lineTo(x, baseline - 185 * scale);
      context.lineTo(x + 4 * scale, baseline - 132 * scale);
      context.lineTo(x + 15 * scale, baseline - 112 * scale);
      context.lineTo(x + 21 * scale, baseline - 49 * scale);
      context.lineTo(x + 35 * scale, baseline - 42 * scale);
      context.lineTo(x + 44 * scale, baseline);
      context.closePath();
      context.fill();
    };

    const render = (now = 0) => {
      context.fillStyle = "#080909";
      context.fillRect(0, 0, width, height);

      const moonX = width * 0.84;
      const moonY = height * 0.22;
      const moonR = Math.max(68, Math.min(width, height) * 0.12);
      context.save();
      context.globalAlpha = 0.22;
      context.fillStyle = "#8e251d";
      context.beginPath();
      context.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.12;
      context.fillStyle = "#f0a191";
      context.beginPath();
      context.arc(moonX - moonR * 0.22, moonY - moonR * 0.2, moonR * 0.14, 0, Math.PI * 2);
      context.arc(moonX + moonR * 0.34, moonY + moonR * 0.12, moonR * 0.11, 0, Math.PI * 2);
      context.fill();
      context.restore();

      skyline(-10, width * 0.38, height * 0.63, 1.1, "#171817");
      skyline(width * 0.65, width + 10, height * 0.67, 1.25, "#141514");
      gothicSpire(width * 0.12, height * 0.63, 0.76, "#1b1c1a");
      gothicSpire(width * 0.93, height * 0.67, 0.88, "#191a18");
      skyline(-10, width + 10, height * 0.81, 0.52, "#0a0b0b");

      context.save();
      context.globalAlpha = 0.08;
      context.fillStyle = "#d6d1bd";
      for (let index = 0; index < 6; index += 1) {
        const y = height * (0.46 + index * 0.06) + Math.sin(now * 0.00022 + index) * 13;
        context.fillRect(0, y, width, 1 + index * 0.42);
      }
      context.restore();

      context.save();
      context.fillStyle = "#c76237";
      sparks.forEach((spark, index) => {
        const y = (spark.y * height + now * spark.speed * 0.02) % height;
        const x = (spark.x * width + Math.sin(now * 0.0003 + index) * 20 + width) % width;
        context.globalAlpha = 0.12 + (index % 5) * 0.055;
        context.fillRect(x, y, spark.size, spark.size);
      });
      context.restore();

      if (!reduceMotion.matches) frame = window.requestAnimationFrame(render);
    };

    const redraw = () => {
      window.cancelAnimationFrame(frame);
      setup();
      render(performance.now());
    };

    window.addEventListener("resize", redraw, { passive: true });
    reduceMotion.addEventListener?.("change", redraw);
    redraw();
  };

  renderPage();
  wireInteractions();
  drawScene();
})();
