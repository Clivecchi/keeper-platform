import { useSearchParams } from "react-router-dom"
import { CoverFrame } from "../v0/components/cover-frame"
import { MomentFrame } from "../v0/components/moment-frame"
import { KeptMomentsFrame } from "../v0/components/kept-moments-frame"
import { StyleOverrideProvider } from "../v0/styles/StyleOverrideProvider"
import type { StyleId } from "../v0/styles/styles"

export default function V0Page() {
  const [searchParams] = useSearchParams()
  const frame = (searchParams.get("frame") || "cover").toLowerCase()
  const styleId = (searchParams.get("style") || "neutral") as StyleId
  const themeSlug = searchParams.get("theme")
  const draftId = searchParams.get("draftId")
  const domainSlug = searchParams.get("domain") || searchParams.get("domainSlug") || "default"

  console.log('V0Page render:', { frame, styleId, themeSlug, draftId, domainSlug })

  // If theme parameter is provided, don't load any initial style overrides
  // Theme takes precedence over style overrides
  const initialStyleId = themeSlug ? undefined : styleId

  console.log('Rendering component:', frame === "moment" ? "MomentFrame" : "CoverFrame")

  return (
    <StyleOverrideProvider initialStyleId={initialStyleId}>
      {frame === "moment" ? (
        <MomentFrame styleId={styleId} themeSlug={themeSlug} draftId={draftId} domainSlug={domainSlug} />
      ) : frame === "moments" ? (
        <KeptMomentsFrame styleId={styleId} themeSlug={themeSlug} domainSlug={domainSlug} />
      ) : (
        <CoverFrame styleId={styleId} themeSlug={themeSlug} />
      )}
    </StyleOverrideProvider>
  )
}

