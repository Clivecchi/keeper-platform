import * as React from "react"
import { visualViewportMetrics } from "./visualViewportMetrics"

const HEIGHT_VAR = "--keeper-vvh"
const OFFSET_VAR = "--keeper-vv-top"

/**
 * Pin the mobile board shell to the visual viewport so the composer
 * stays above the software keyboard.
 */
export function useVisualViewportHeight(enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const root = document.documentElement
    const apply = () => {
      const metrics = visualViewportMetrics(
        window.visualViewport
          ? {
              height: window.visualViewport.height,
              offsetTop: window.visualViewport.offsetTop,
            }
          : null,
        window.innerHeight,
      )
      root.style.setProperty(HEIGHT_VAR, `${Math.round(metrics.height)}px`)
      root.style.setProperty(OFFSET_VAR, `${Math.round(metrics.offsetTop)}px`)
    }

    apply()
    const viewport = window.visualViewport
    viewport?.addEventListener("resize", apply)
    viewport?.addEventListener("scroll", apply)
    window.addEventListener("resize", apply)
    return () => {
      viewport?.removeEventListener("resize", apply)
      viewport?.removeEventListener("scroll", apply)
      window.removeEventListener("resize", apply)
      root.style.removeProperty(HEIGHT_VAR)
      root.style.removeProperty(OFFSET_VAR)
    }
  }, [enabled])
}
