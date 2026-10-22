import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { checkRepository, projectRoot, readManifest, resolveOutputDirectory } from "./lib/repository.mjs";

async function buildRelease() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--output" || !args[1])) {
    throw new Error("Usage: node scripts/build-public.mjs [--output public|.tmp/releases/<name>]");
  }
  const output = await resolveOutputDirectory(args[1]);
  const manifest = await readManifest();
  const { files } = await checkRepository(projectRoot, manifest);

  // The output path is restricted and all sources are checked before replacement.
  await rm(output, { recursive: true, force: true });
  for (const file of files) {
    const destination = join(output, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(projectRoot, file), destination);
  }
  await checkRepository(output, manifest);
  const totalBytes = (await Promise.all(files.map(async (file) => (await stat(join(output, file))).size)))
    .reduce((sum, size) => sum + size, 0);
  console.log(`Release package ready: ${output}`);
  console.log(`Validated ${files.length} files (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);
}

buildRelease().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
