import { useSearchParams } from "react-router-dom"
import { CoverFrame } from "../v0/components/cover-frame"
import { MomentFrame } from "../v0/components/moment-frame"
import { StyleOverrideProvider } from "../v0/styles/StyleOverrideProvider"
import type { StyleId } from "../v0/styles/styles"

export default function V0Page() {
  const [searchParams] = useSearchParams()
  const frame = (searchParams.get("frame") || "cover").toLowerCase()
  const styleId = (searchParams.get("style") || "neutral") as StyleId

  return (
    <StyleOverrideProvider initialStyleId={styleId}>
      {frame === "moment" ? (
        <MomentFrame styleId={styleId} />
      ) : (
        <CoverFrame styleId={styleId} />
      )}
    </StyleOverrideProvider>
  )
}

