import { useSearchParams } from "react-router-dom"
import { CoverFrame } from "../v0/components/cover-frame"
import { MomentFrame } from "../v0/components/moment-frame"

export default function V0Page() {
  const [searchParams] = useSearchParams()
  const frame = (searchParams.get("frame") || "cover").toLowerCase()

  if (frame === "moment") {
    return <MomentFrame />
  }

  return <CoverFrame />
}

