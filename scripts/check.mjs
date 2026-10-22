import { checkRepository } from "./lib/repository.mjs";

try {
  const { files, content } = await checkRepository();
  console.log(`Checked ${files.length} publish files, ${content.guides.length} guides, ${content.combos.length} combos and ${content.videos.length} video links.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
