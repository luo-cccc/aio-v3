import { readFile, lstat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function readManifest() {
  return JSON.parse(await readFile(join(projectRoot, "scripts/publish-manifest.json"), "utf8"));
}

export function publishPaths(manifest) {
  const files = [
    ...manifest.files,
    ...manifest.assets.map((file) => `assets/${file}`),
    ...manifest.data.map((file) => `data/${file}`),
  ];
  if (new Set(files).size !== files.length) throw new Error("Duplicate path in publish manifest.");
  for (const file of files) {
    if (!/^[\w./-]+$/.test(file) || file.startsWith("/") || file.split("/").some((part) => !part || part === ".." || part === ".")) {
      throw new Error(`Invalid publish path: ${file}`);
    }
    if (file !== "_headers" && !/\.(html|js|css|txt|json|webp|jpg|png|svg|woff2)$/.test(file)) {
      throw new Error(`Non-deployable file in publish manifest: ${file}`);
    }
  }
  return files;
}

// Only generated directories may be recursively replaced by the build.
export async function resolveOutputDirectory(requested = "public", root = projectRoot) {
  const output = resolve(root, requested);
  const relativePath = relative(root, output).split(sep).join("/");
  if (relativePath !== "public" && !/^\.tmp\/releases\/[\w-]+$/.test(relativePath)) {
    throw new Error("Output must be public or .tmp/releases/<name> (letters, numbers, _ and -).");
  }
  let current = root;
  for (const part of relativePath.split("/")) {
    current = join(current, part);
    const info = await lstat(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info && (!info.isDirectory() || info.isSymbolicLink())) {
      throw new Error(`Output path must contain only real directories: ${current}`);
    }
  }
  return output;
}

export function parseContent(source) {
  const context = { window: {} };
  runInNewContext(source, context, { timeout: 1000, filename: "site-content.js" });
  return JSON.parse(JSON.stringify(context.window.SITE_CONTENT));
}

export function validateContent(content, files) {
  const available = new Set(files);
  const collections = ["guides", "combos", "videos", "comboBranches"];
  const ids = {};
  for (const name of collections) {
    if (!Array.isArray(content[name])) throw new Error(`Missing content collection: ${name}`);
    ids[name] = new Set();
    for (const entry of content[name]) {
      if (!entry.id || ids[name].has(entry.id)) throw new Error(`Missing or duplicate ${name} id: ${entry.id}`);
      ids[name].add(entry.id);
    }
  }
  const requireFile = (file, label) => {
    if (!available.has(file)) throw new Error(`${label} is not in the publish manifest: ${file}`);
  };
  const requireIds = (values, collection, label) => {
    for (const id of values.filter(Boolean)) {
      if (!ids[collection].has(id)) throw new Error(`${label} references missing ${collection} id: ${id}`);
    }
  };
  const requireHttps = (value, label) => {
    if (!value) return;
    let url;
    try { url = new URL(value); } catch { throw new Error(`Invalid ${label} URL: ${value}`); }
    if (url.protocol !== "https:") throw new Error(`${label} URL must use HTTPS: ${value}`);
  };
  requireFile(content.profile.avatar, "Profile avatar");
  for (const platform of content.platforms) requireHttps(platform.url, platform.name);
  const guideUrls = new Set();
  for (const guide of content.guides) {
    requireFile(guide.url, guide.id);
    if (guideUrls.has(guide.url)) throw new Error(`Duplicate guide URL: ${guide.url}`);
    guideUrls.add(guide.url);
    requireIds(guide.comboIds || [], "combos", guide.id);
    requireIds(guide.videoIds || [], "videos", guide.id);
    const sections = new Set();
    for (const section of guide.article?.sections || []) {
      if (!section.id || sections.has(section.id)) throw new Error(`Duplicate or missing section id in ${guide.id}`);
      sections.add(section.id);
      if (section.image) requireFile(section.image, section.id);
      for (const image of section.images || []) requireFile(image.src, section.id);
    }
  }
  for (const combo of content.combos) {
    requireIds([combo.branch], "comboBranches", combo.id);
    if (!combo.branch) throw new Error(`Missing combo branch: ${combo.id}`);
    requireIds([combo.guideId], "guides", combo.id);
    requireIds([combo.videoId], "videos", combo.id);
    if (combo.code && !/^\[\[[A-Za-z0-9]+\]\]$/.test(combo.code)) throw new Error(`Invalid combo code format: ${combo.id}`);
  }
  for (const video of content.videos) {
    requireHttps(video.url, video.id);
    requireIds([video.guideId, ...(video.guideIds || [])], "guides", video.id);
    requireIds(video.comboIds || [], "combos", video.id);
  }
}

export async function checkRepository(root = projectRoot, suppliedManifest) {
  const manifest = suppliedManifest || await readManifest();
  const files = publishPaths(manifest);
  const available = new Set(files);
  const texts = new Map();
  for (const file of files) {
    const path = join(root, file);
    const info = await lstat(path).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) throw new Error(`Missing or non-regular publish file: ${file}`);
    if (/\.(html|js|css|json)$/.test(file)) {
      const source = await readFile(path, "utf8");
      if (/C:\\Users\\|file:\/\//i.test(source)) throw new Error(`Local path exposed in ${file}`);
      texts.set(file, source);
      if (file.endsWith(".json")) JSON.parse(source);
    }
    if (file.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
      if (result.status !== 0) throw new Error(`JavaScript syntax error in ${file}: ${result.stderr}`);
    }
  }
  const content = parseContent(texts.get("site-content.js"));
  validateContent(content, files);
  for (const [file, source] of texts) {
    if (!file.endsWith(".html")) continue;
    for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const url = match[1].replaceAll("&amp;", "&");
      if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) continue;
      const target = decodeURIComponent(url.split(/[?#]/)[0]);
      const resolved = relative(root, resolve(dirname(join(root, file)), target)).split(sep).join("/");
      if (!available.has(resolved)) throw new Error(`${file} references an unpublished file: ${target}`);
    }
  }
  for (const page of ["index.html", "guides.html"]) {
    const fallback = texts.get(page).match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] || "";
    for (const guide of content.guides) {
      if (!fallback.includes(`href="${guide.url}"`)) throw new Error(`${page} fallback is missing guide: ${guide.id}`);
    }
  }
  const comboFallback = texts.get("combos.html").match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] || "";
  for (const combo of content.combos) {
    const article = comboFallback.split(`id="combo-${combo.id}"`)[1]?.split("</article>")[0] || "";
    if (combo.code && !article.includes(`<code>${combo.code}</code>`)) throw new Error(`Static combo code is out of sync: ${combo.id}`);
  }
  return { files, content };
}
