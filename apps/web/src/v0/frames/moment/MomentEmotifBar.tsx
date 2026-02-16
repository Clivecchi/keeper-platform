"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "../../../context/AuthContext"
import {
  getDomainEmotifs,
  getMomentEmotifs,
  addMomentEmotif,
  removeMomentEmotif,
  type EmotifItem,
  type MomentEmotifReaction,
} from "../../../lib/emotifApi"

interface MomentEmotifBarProps {
  momentId: string
  domainId?: string | null
}

export function MomentEmotifBar({ momentId, domainId }: MomentEmotifBarProps) {
  const { isAuthenticated } = useAuth()
  type EmotifWithType = EmotifItem & { emotifType: "platform" | "domain" }
  const [availableEmotifs, setAvailableEmotifs] = useState<EmotifWithType[]>([])
  const [reactions, setReactions] = useState<MomentEmotifReaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [emotifsRes, reactionsList] = await Promise.all([
        domainId ? getDomainEmotifs(domainId) : Promise.resolve(null),
        getMomentEmotifs(momentId),
      ])
      const platform: EmotifWithType[] = (emotifsRes?.platform ?? []).map((e) => ({
        ...e,
        emotifType: "platform" as const,
      }))
      const domain: EmotifWithType[] = (emotifsRes?.domain ?? []).map((e) => ({
        ...e,
        emotifType: "domain" as const,
      }))
      setAvailableEmotifs([...platform, ...domain])
      setReactions(reactionsList)
    } catch {
      setAvailableEmotifs([])
      setReactions([])
    } finally {
      setIsLoading(false)
    }
  }, [momentId, domainId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async (emotif: EmotifWithType) => {
    if (!isAuthenticated) return
    const emotifType = emotif.emotifType
    const hasReacted = reactions.some(
      (r) => r.emotifId === emotif.id && r.emotifType === emotifType
    )
    setAddingId(emotif.id)
    try {
      if (hasReacted) {
        await removeMomentEmotif(momentId, emotif.id)
      } else {
        await addMomentEmotif(momentId, { emotifId: emotif.id, emotifType })
      }
      await loadData()
    } catch {
      // ignore
    } finally {
      setAddingId(null)
    }
  }

  if (isLoading || availableEmotifs.length === 0) return null

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1"
      style={{ color: "var(--theme-ink-tertiary)" }}
    >
      {availableEmotifs.slice(0, 5).map((emotif) => {
        const emotifType = emotif.emotifType
        const count = reactions.filter(
          (r) => r.emotifId === emotif.id && r.emotifType === emotifType
        ).length
        const isActive = reactions.some(
          (r) => r.emotifId === emotif.id && r.emotifType === emotifType
        )
        return (
          <button
            key={emotif.id}
            type="button"
            onClick={() => handleToggle(emotif)}
            disabled={!isAuthenticated || addingId === emotif.id}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: isActive ? "var(--theme-ink-secondary)" : "var(--theme-border-soft)",
              backgroundColor: isActive
                ? "hsl(var(--theme-surface-paper) / 0.9)"
                : "transparent",
            }}
            title={emotif.label}
            aria-label={`${emotif.label}${count > 0 ? ` (${count})` : ""}`}
          >
            <span aria-hidden>{emotif.symbol === "keeper_mark" ? "✦" : emotif.symbol}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
