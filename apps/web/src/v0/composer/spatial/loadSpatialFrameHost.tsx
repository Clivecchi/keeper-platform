/**
 * Optional spatial host for a Frame.
 * Ordinary DOM Frames never call this, so they do not load Three.
 */

import type { ComponentType } from "react"

export type SpatialFrameHostProps = {
  children?: never
}

export async function loadSpatialFrameHost(): Promise<ComponentType<SpatialFrameHostProps>> {
  const [{ Canvas }, three, drei] = await Promise.all([
    import("@react-three/fiber"),
    import("three"),
    import("@react-three/drei"),
  ])
  void three
  void drei

  function SpatialFrameHost() {
    return (
      <Canvas>
        <ambientLight intensity={0.6} />
      </Canvas>
    )
  }

  return SpatialFrameHost
}
