import { Navigate, useSearchParams } from "react-router-dom"

export default function V0Page() {
  const [searchParams] = useSearchParams()
  const frame = (searchParams.get("frame") || "cover").toLowerCase()
  const theme = searchParams.get("theme")
  const style = searchParams.get("style")
  const draftId = searchParams.get("draftId")
  const domainSlug = searchParams.get("domain") || searchParams.get("domainSlug") || "default"
  const nextParams = new URLSearchParams()
  nextParams.set("frame", frame)
  if (theme) nextParams.set("theme", theme)
  if (style) nextParams.set("style", style)
  if (draftId) nextParams.set("draftId", draftId)

  return <Navigate to={`/d/${domainSlug}/board?${nextParams.toString()}`} replace />
}

