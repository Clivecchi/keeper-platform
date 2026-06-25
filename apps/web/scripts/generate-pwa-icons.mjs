import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const publicDir = path.join(repoRoot, "public");
const sourcePng = path.join(publicDir, "icons", "keeper-app-icon.png");

const MASKABLE_BG = "#0b1220";

const outputs = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon-16x16.png", size: 16 },
];

async function writeMaskableIcon(source, target, size) {
  const innerSize = Math.round(size * 0.72);
  const inset = Math.round((size - innerSize) / 2);
  const resized = await sharp(source)
    .resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: MASKABLE_BG,
    },
  })
    .composite([{ input: resized, top: inset, left: inset }])
    .png()
    .toFile(target);
}

async function main() {
  const source = await readFile(sourcePng);
  await mkdir(path.join(publicDir, "icons"), { recursive: true });

  for (const { file, size } of outputs) {
    const target = path.join(publicDir, file);
    await sharp(source).resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(target);
    console.log(`[pwa-icons] wrote ${target}`);
  }

  const maskableTarget = path.join(publicDir, "pwa-512x512-maskable.png");
  await writeMaskableIcon(source, maskableTarget, 512);
  console.log(`[pwa-icons] wrote ${maskableTarget}`);

  const favicon16 = path.join(publicDir, "favicon-16x16.png");
  const favicon32 = path.join(publicDir, "favicon-32x32.png");
  const favicon48 = path.join(publicDir, "favicon-48x48.png");
  await sharp(source).resize(48, 48, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(favicon48);

  const icoBuffer = await pngToIco([favicon16, favicon32, favicon48]);
  const faviconIco = path.join(publicDir, "favicon.ico");
  await writeFile(faviconIco, icoBuffer);
  console.log(`[pwa-icons] wrote ${faviconIco}`);
}

main().catch((error) => {
  console.error("[pwa-icons] failed:", error);
  process.exit(1);
});
