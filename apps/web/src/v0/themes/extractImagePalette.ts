import {
  derivePaletteFromRgbSamples,
  type ExtractedImagePalette,
  type RgbSample,
} from "@keeper/shared"
import { getBlobProxyUrl } from "../../lib/blobProxy"

const SAMPLE_SIZE = 48

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Image could not be read for palette extraction."))
    image.src = src
  })
}

async function sourceToObjectUrl(source: File | string): Promise<{ src: string; revoke: () => void }> {
  if (source instanceof File) {
    const src = URL.createObjectURL(source)
    return { src, revoke: () => URL.revokeObjectURL(src) }
  }
  const proxied = getBlobProxyUrl(source.trim()) || source.trim()
  return { src: proxied, revoke: () => undefined }
}

function sampleImagePixels(image: HTMLImageElement): RgbSample[] {
  const canvas = document.createElement("canvas")
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  const samples: RgbSample[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }
  return samples
}

/** Read a File or image URL and derive Treatment / theme colors. */
export async function extractPaletteFromImageSource(
  source: File | string,
): Promise<ExtractedImagePalette> {
  const { src, revoke } = await sourceToObjectUrl(source)
  try {
    const image = await loadImageElement(src)
    return derivePaletteFromRgbSamples(sampleImagePixels(image))
  } finally {
    revoke()
  }
}
