/**
 * Derive a domain palette from sampled image pixels.
 * Canvas / file loading stays in the web app; this is the testable color math.
 */

export type RgbSample = {
  r: number
  g: number
  b: number
}

export type ExtractedImagePalette = {
  background: string
  accent: string
  primary: string
  surface: string
  dark: boolean
}

const FALLBACK: ExtractedImagePalette = {
  background: "#f5f0e8",
  accent: "#2d6a7f",
  primary: "#2d6a7f",
  surface: "#f5f0e8",
  dark: false,
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

export function relativeLuminanceRgb(r: number, g: number, b: number): number {
  const channels = [r, g, b].map((raw) => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function saturationRgb(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  if (d === 0) return 0
  const l = (max + min) / 2
  return l > 0.5 ? d / (2 - max - min) : d / (max + min)
}

function colorDistance(a: RgbSample, b: RgbSample): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function averageSample(samples: ReadonlyArray<RgbSample>): RgbSample {
  let r = 0
  let g = 0
  let b = 0
  for (const sample of samples) {
    r += sample.r
    g += sample.g
    b += sample.b
  }
  const n = samples.length
  return { r: r / n, g: g / n, b: b / n }
}

/** Prefer saturated, distinct colors for accent; fall back to the most saturated pixel. */
function pickAccent(samples: ReadonlyArray<RgbSample>, background: RgbSample): RgbSample {
  let distinct: RgbSample | null = null
  let distinctSat = -1
  let any: RgbSample = background
  let anySat = -1

  for (const sample of samples) {
    const sat = saturationRgb(sample.r, sample.g, sample.b)
    if (sat > anySat) {
      anySat = sat
      any = sample
    }
    if (sat < 0.16) continue
    if (colorDistance(sample, background) < 36) continue
    if (sat > distinctSat) {
      distinctSat = sat
      distinct = sample
    }
  }

  return distinct ?? any
}

export function derivePaletteFromRgbSamples(
  samples: ReadonlyArray<RgbSample>,
): ExtractedImagePalette {
  if (samples.length === 0) return { ...FALLBACK }

  const background = averageSample(samples)
  const accent = pickAccent(samples, background)
  const dark = relativeLuminanceRgb(background.r, background.g, background.b) < 0.35
  const backgroundHex = rgbToHex(background.r, background.g, background.b)
  const accentHex = rgbToHex(accent.r, accent.g, accent.b)

  return {
    background: backgroundHex,
    accent: accentHex,
    primary: accentHex,
    surface: backgroundHex,
    dark,
  }
}
