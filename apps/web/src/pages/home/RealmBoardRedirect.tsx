"use client"

import * as React from "react"
import { Navigate, useParams, useSearchParams } from "react-router-dom"
import { buildHomePath } from "../../v0/shell/shellMode"

/**
 * Legacy: `/d/:slug?board=realm` → user Home at `/home`.
 * Preserves non-board query params when present.
 */
export function RealmBoardRedirect() {
  const [searchParams] = useSearchParams()
  const next = React.useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.delete("board")
    params.delete("boardDef")
    params.delete("definition")
    return buildHomePath(params)
  }, [searchParams])
  return <Navigate to={next} replace />
}

/** Used when only slug is needed for guard routes. */
export function useRealmBoardRedirectOnMount(): boolean {
  const [searchParams] = useSearchParams()
  return searchParams.get("board")?.toLowerCase() === "realm"
}

export function RealmBoardRedirectFromParams() {
  const { slug: _slug } = useParams<{ slug: string }>()
  return <RealmBoardRedirect />
}
