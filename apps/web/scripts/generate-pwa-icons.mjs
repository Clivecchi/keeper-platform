import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const publicDir = path.join(repoRoot, "public");
const sourceSvg = path.join(publicDir, "icons", "keeper-mark.svg");

const outputs = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

async function main() {
  const svg = await readFile(sourceSvg);
  await mkdir(path.join(publicDir, "icons"), { recursive: true });

  for (const { file, size } of outputs) {
    const target = path.join(publicDir, file);
    await sharp(svg).resize(size, size).png().toFile(target);
    console.log(`[pwa-icons] wrote ${target}`);
  }
}

main().catch((error) => {
  console.error("[pwa-icons] failed:", error);
  process.exit(1);
});
