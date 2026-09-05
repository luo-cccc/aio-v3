import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const outputFlagIndex = process.argv.indexOf("--output");
const requestedOutput = outputFlagIndex === -1 ? "public" : process.argv[outputFlagIndex + 1];

if (outputFlagIndex !== -1 && !requestedOutput) {
  throw new Error("--output requires a child directory of the project root.");
}

const outputDirectory = resolve(projectRoot, requestedOutput || "public");
const outputRelativePath = relative(projectRoot, outputDirectory);

if (!outputRelativePath || outputRelativePath.startsWith("..") || /^[\\/]/.test(outputRelativePath)) {
  throw new Error(`Output directory must be a child of the project root: ${projectRoot}`);
}

const publishFiles = [
  "index.html",
  "guides.html",
  "combos.html",
  "calculator.html",
  "videos.html",
  "about.html",
  "guide-singer-pvp-gvg.html",
  "guide-singer-pve.html",
  "app.js",
  "calculator.js",
  "site-content.js",
  "styles.css",
  "calculator.css",
  "_headers",
  "robots.txt",
];

const publishAssets = [
  "laoluo-avatar.jpg",
  "singer-pvp-gvg-character.webp",
  "singer-pvp-gvg-skills.webp",
  "singer-pvp-gvg-sealed-artifacts.webp",
  "singer-pvp-gvg-marionettes.webp",
  "singer-pvp-gvg-talents.webp",
  "singer-pve-character.webp",
  "singer-pve-skills.webp",
  "singer-pve-sealed-artifacts.webp",
  "singer-pve-marionettes.webp",
  "singer-pve-talents.webp",
];

const publishData = ["attribute-formulas.json"];

const sourcePath = (...segments) => join(projectRoot, ...segments);
const releasePath = (...segments) => join(outputDirectory, ...segments);

async function requireFile(filePath) {
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile()) throw new Error(`Required source file is missing: ${filePath}`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function validateJavaScript(relativeFile) {
  const result = spawnSync(process.execPath, ["--check", releasePath(relativeFile)], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`JavaScript syntax check failed for ${relativeFile}:\n${result.stderr || result.stdout}`);
  }
}

async function validateRelease() {
  const requiredReleaseFiles = [
    ...publishFiles,
    ...publishAssets.map((asset) => join("assets", asset)),
    ...publishData.map((dataFile) => join("data", dataFile)),
  ];

  await Promise.all(requiredReleaseFiles.map((file) => requireFile(releasePath(file))));
  validateJavaScript("app.js");
  validateJavaScript("calculator.js");
  validateJavaScript("site-content.js");
  JSON.parse(await readFile(releasePath("data", "attribute-formulas.json"), "utf8"));

  const files = await listFiles(outputDirectory);
  const forbiddenExtensions = new Set([".docx", ".md", ".ps1", ".mjs", ".tmp"]);
  const forbiddenFiles = files.filter((file) => forbiddenExtensions.has(extname(file).toLowerCase()));
  if (forbiddenFiles.length) {
    throw new Error(`Release package contains non-deployable files:\n${forbiddenFiles.join("\n")}`);
  }

  const textFiles = files.filter((file) => [".html", ".js", ".css", ".json"].includes(extname(file).toLowerCase()));
  for (const file of textFiles) {
    const text = await readFile(file, "utf8");
    if (/C:\\Users\\|file:\/\//i.test(text)) {
      throw new Error(`Release package exposes a local path: ${file}`);
    }
  }

  const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size)))
    .reduce((sum, size) => sum + size, 0);
  return { files, totalBytes };
}

async function buildRelease() {
  await Promise.all([
    ...publishFiles.map((file) => requireFile(sourcePath(file))),
    ...publishAssets.map((asset) => requireFile(sourcePath("assets", asset))),
    ...publishData.map((dataFile) => requireFile(sourcePath("data", dataFile))),
  ]);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(releasePath("assets"), { recursive: true });
  await mkdir(releasePath("data"), { recursive: true });

  await Promise.all(publishFiles.map((file) => copyFile(sourcePath(file), releasePath(file))));
  await Promise.all(publishAssets.map((asset) => copyFile(sourcePath("assets", asset), releasePath("assets", asset))));
  await Promise.all(publishData.map((dataFile) => copyFile(sourcePath("data", dataFile), releasePath("data", dataFile))));

  const { files, totalBytes } = await validateRelease();
  const manifest = files
    .map((file) => relative(outputDirectory, file))
    .sort((left, right) => left.localeCompare(right));

  console.log(`Release package ready: ${outputDirectory}`);
  console.log(`Validated ${manifest.length} files (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);
  manifest.forEach((file) => console.log(file));
}

buildRelease().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
