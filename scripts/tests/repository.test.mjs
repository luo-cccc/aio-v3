import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parseContent, projectRoot, publishPaths, readManifest, resolveOutputDirectory, validateContent } from "../lib/repository.mjs";

const content = parseContent(await readFile(join(projectRoot, "site-content.js"), "utf8"));
const manifest = await readManifest();
const files = publishPaths(manifest);

test("Workers deploys only the generated public directory", async () => {
  const config = JSON.parse(await readFile(join(projectRoot, "wrangler.jsonc"), "utf8"));
  assert.equal(config.name, "aio-v3");
  assert.equal(config.assets.directory, "./public");
});

test("all current content, including PVP hammer, resolves to published resources", () => {
  validateContent(content, files);
});

test("duplicate IDs and broken cross-links are rejected", () => {
  const duplicate = structuredClone(content);
  duplicate.guides.push(duplicate.guides[0]);
  assert.throws(() => validateContent(duplicate, files), /duplicate guides id/);
  const broken = structuredClone(content);
  broken.combos[0].guideId = "missing-guide";
  assert.throws(() => validateContent(broken, files), /missing guides id/);
});

test("unpublished images and unknown combo branches are rejected", () => {
  const missingImage = structuredClone(content);
  missingImage.profile.avatar = "assets/missing.webp";
  assert.throws(() => validateContent(missingImage, files), /not in the publish manifest/);
  const missingBranch = structuredClone(content);
  missingBranch.combos[0].branch = "unknown";
  assert.throws(() => validateContent(missingBranch, files), /missing comboBranches id/);
});

test("malformed import codes and non-HTTPS external links are rejected", () => {
  const badCode = structuredClone(content);
  badCode.combos[0].code = "[[broken code]]";
  assert.throws(() => validateContent(badCode, files), /Invalid combo code format/);
  const badUrl = structuredClone(content);
  badUrl.videos[0].url = "javascript:alert(1)";
  assert.throws(() => validateContent(badUrl, files), /must use HTTPS/);
});

test("publish manifest rejects path traversal, duplicate paths and source documents", () => {
  assert.throws(() => publishPaths({ files: ["../index.html"], assets: [], data: [] }), /Invalid publish path/);
  assert.throws(() => publishPaths({ files: ["index.html", "index.html"], assets: [], data: [] }), /Duplicate path/);
  assert.throws(() => publishPaths({ files: ["notes.docx"], assets: [], data: [] }), /Non-deployable/);
});

test("build output is limited to disposable directories", async () => {
  assert.equal(await resolveOutputDirectory(), join(projectRoot, "public"));
  assert.equal(await resolveOutputDirectory(".tmp/releases/preview"), join(projectRoot, ".tmp/releases/preview"));
  for (const path of [".", "..", ".git", "assets", "data", "scripts", "local-source", ".tmp", ".tmp/releases", "public/../assets"]) {
    await assert.rejects(resolveOutputDirectory(path), /Output must be/);
  }
});

test("a junction or symbolic link cannot redirect the build output", async () => {
  await mkdir(join(projectRoot, ".tmp"), { recursive: true });
  const fixture = await mkdtemp(join(projectRoot, ".tmp/repository-test-"));
  try {
    const destination = join(fixture, "important-files");
    await mkdir(destination);
    await symlink(destination, join(fixture, "public"), process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(resolveOutputDirectory("public", fixture), /real directories/);
  } finally {
    const path = relative(projectRoot, fixture).split(sep).join("/");
    assert.match(path, /^\.tmp\/repository-test-[\w-]+$/);
    await rm(fixture, { recursive: true, force: true });
  }
});
