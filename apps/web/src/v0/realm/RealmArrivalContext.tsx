"use client"

import * as React from "react"
import type { RealmChronicleView } from "./RealmHomeChronicle"

export interface RealmArrivalContextValue {
  chronicleView: RealmChronicleView
  setChronicleView: (view: RealmChronicleView) => void
}

const RealmArrivalCtx = React.createContext<RealmArrivalContextValue | null>(null)

export function RealmArrivalProvider({ children }: { children: React.ReactNode }) {
  const [chronicleView, setChronicleView] = React.useState<RealmChronicleView>("playbill")
  const value = React.useMemo(
    () => ({ chronicleView, setChronicleView }),
    [chronicleView],
  )
  return <RealmArrivalCtx.Provider value={value}>{children}</RealmArrivalCtx.Provider>
}

export function useRealmArrivalOptional() {
  return React.useContext(RealmArrivalCtx)
}
