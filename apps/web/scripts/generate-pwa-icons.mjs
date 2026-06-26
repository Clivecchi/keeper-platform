import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const publicDir = path.join(repoRoot, "public");
const iconsDir = path.join(publicDir, "icons");
const sourcePng = path.join(iconsDir, "keeper-app-icon.png");

/** Matches PWA theme_color / app chrome */
const KEEPER_BG = { r: 36, g: 31, b: 28, alpha: 1 };
const MASTER_SIZE = 1024;
/** Maskable safe zone — artwork inside ~80% reads larger on Android home screens */
const MASKABLE_INNER_RATIO = 0.8;

const outputs = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon-16x16.png", size: 16 },
];

/** Replace near-white export backgrounds with Keeper dark (Canva white → theme). */
async function replaceNearWhiteBackground(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= 245 && g >= 245 && b >= 245) {
      data[i] = KEEPER_BG.r;
      data[i + 1] = KEEPER_BG.g;
      data[i + 2] = KEEPER_BG.b;
      data[i + 3] = 255;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Normalize any export to a centered 1024×1024 square on Keeper dark.
 * Landscape Canva banners (e.g. 1024×576): center-crop the largest square first.
 */
async function prepareSquareMaster(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  const width = meta.width ?? MASTER_SIZE;
  const height = meta.height ?? MASTER_SIZE;

  let cropped = inputBuffer;
  if (width !== height) {
    const cropSize = Math.min(width, height);
    const left = Math.max(0, Math.floor((width - cropSize) / 2));
    const top = Math.max(0, Math.floor((height - cropSize) / 2));
    cropped = await sharp(inputBuffer)
      .extract({ left, top, width: cropSize, height: cropSize })
      .toBuffer();
  } else {
    cropped = inputBuffer;
  }

  const keyed = await replaceNearWhiteBackground(cropped);

  return sharp(keyed)
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function writeMaskableIcon(source, target, size) {
  const innerSize = Math.round(size * MASKABLE_INNER_RATIO);
  const inset = Math.round((size - innerSize) / 2);
  const resized = await sharp(source)
    .resize(innerSize, innerSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: KEEPER_BG,
    },
  })
    .composite([{ input: resized, top: inset, left: inset }])
    .png()
    .toFile(target);
}

async function writeSizedIcon(source, target, size) {
  await sharp(source)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(target);
}

async function main() {
  const source = await readFile(sourcePng);
  await mkdir(iconsDir, { recursive: true });

  const squareMaster = await prepareSquareMaster(source);
  await writeFile(sourcePng, squareMaster);
  console.log(`[pwa-icons] normalized master → ${sourcePng} (${MASTER_SIZE}×${MASTER_SIZE})`);

  for (const { file, size } of outputs) {
    const target = path.join(publicDir, file);
    await writeSizedIcon(squareMaster, target, size);
    console.log(`[pwa-icons] wrote ${target}`);
  }

  const maskableTarget = path.join(publicDir, "pwa-512x512-maskable.png");
  await writeMaskableIcon(squareMaster, maskableTarget, 512);
  console.log(`[pwa-icons] wrote ${maskableTarget}`);

  const favicon16 = path.join(publicDir, "favicon-16x16.png");
  const favicon32 = path.join(publicDir, "favicon-32x32.png");
  const favicon48 = path.join(publicDir, "favicon-48x48.png");
  await writeSizedIcon(squareMaster, favicon48, 48);

  const icoBuffer = await pngToIco([favicon16, favicon32, favicon48]);
  const faviconIco = path.join(publicDir, "favicon.ico");
  await writeFile(faviconIco, icoBuffer);
  console.log(`[pwa-icons] wrote ${faviconIco}`);
}

main().catch((error) => {
  console.error("[pwa-icons] failed:", error);
  process.exit(1);
});
