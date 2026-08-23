/**
 * Board type density — persisted as `keeper-density` on <html data-density>.
 * Comfortable is the member default (aging-eyes / Readable). Compact remains
 * for anyone who already chose it (Design Board historically).
 */

import * as React from "react"

export const KEEPER_DENSITY_KEY = "keeper-density"

export type KeeperDensity = "compact" | "default" | "comfortable"

export const DEFAULT_KEEPER_DENSITY: KeeperDensity = "comfortable"

const listeners = new Set<() => void>()

export function parseKeeperDensity(value: string | null | undefined): KeeperDensity {
  if (value === "compact" || value === "default" || value === "comfortable") {
    return value
  }
  return DEFAULT_KEEPER_DENSITY
}

export function applyKeeperDensityAttribute(density: KeeperDensity): void {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-density", density)
}

export function readKeeperDensity(): KeeperDensity {
  if (typeof window === "undefined") return DEFAULT_KEEPER_DENSITY
  try {
    return parseKeeperDensity(window.localStorage.getItem(KEEPER_DENSITY_KEY))
  } catch {
    return DEFAULT_KEEPER_DENSITY
  }
}

export function writeKeeperDensity(density: KeeperDensity): void {
  try {
    window.localStorage.setItem(KEEPER_DENSITY_KEY, density)
  } catch {
    /* private mode / quota — still apply for this session */
  }
  applyKeeperDensityAttribute(density)
  listeners.forEach((listener) => listener())
}

export function subscribeKeeperDensity(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function isReadableDensity(density: KeeperDensity): boolean {
  return density === "comfortable"
}

export function toggleReadableDensity(current: KeeperDensity): KeeperDensity {
  return current === "comfortable" ? "default" : "comfortable"
}

export function useKeeperDensity(): [KeeperDensity, (next: KeeperDensity) => void] {
  const density = React.useSyncExternalStore(
    subscribeKeeperDensity,
    readKeeperDensity,
    () => DEFAULT_KEEPER_DENSITY,
  )

  const setDensity = React.useCallback((next: KeeperDensity) => {
    writeKeeperDensity(next)
  }, [])

  React.useEffect(() => {
    applyKeeperDensityAttribute(density)
  }, [density])

  return [density, setDensity]
}
