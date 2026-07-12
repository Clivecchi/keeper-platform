const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
])

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.85
const SKIP_IF_UNDER_BYTES = 400_000

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to read image"))
    }
    img.src = url
  })
}

function scaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / longest
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/**
 * Downscale large photos before upload — faster transfer and vision ingestion.
 * GIF/SVG and already-small files pass through unchanged.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!IMAGE_TYPES.has(file.type)) return file
  if (file.size <= SKIP_IF_UNDER_BYTES) return file

  try {
    const img = await loadImageElement(file)
    const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION)
    if (width === img.naturalWidth && height === img.naturalHeight && file.type === "image/jpeg") {
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    })
    if (!blob) return file

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload"
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
  } catch {
    return file
  }
}
