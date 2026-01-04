import { useSearchParams } from "react-router-dom"
import { CoverFrame } from "../v0/components/cover-frame"
import { MomentFrame } from "../v0/components/moment-frame"
import type { StyleId } from "../v0/styles/styles"

export default function V0Page() {
  const [searchParams] = useSearchParams()
  const frame = (searchParams.get("frame") || "cover").toLowerCase()
  const styleId = (searchParams.get("style") || "neutral") as StyleId

  if (frame === "moment") {
    return <MomentFrame styleId={styleId} />
  }

  return <CoverFrame styleId={styleId} />
}

