export interface VisualViewportLike {
  height: number
  offsetTop: number
}

export interface VisualViewportMetrics {
  height: number
  offsetTop: number
}

/**
 * Map the visual viewport (keyboard-aware) to CSS pixels.
 * Falls back to the layout viewport when Visual Viewport API is missing.
 */
export function visualViewportMetrics(
  viewport: VisualViewportLike | null | undefined,
  fallbackHeight: number,
): VisualViewportMetrics {
  const height = viewport?.height
  const offsetTop = viewport?.offsetTop
  return {
    height: typeof height === "number" && height > 0 ? height : fallbackHeight,
    offsetTop: typeof offsetTop === "number" && offsetTop > 0 ? offsetTop : 0,
  }
}
