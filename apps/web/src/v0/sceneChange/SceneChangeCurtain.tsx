"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, useReducedMotion } from "framer-motion"
import { peekDomainFrame } from "../data/loadDomainFrame"
import {
  getCachedDomainBySlug,
  prefetchDomainShell,
} from "../boards/domain/domainShellCache"
import { resolvePlaybillAgent } from "../lib/playbillData"
import { readFrameLeadAgentSlug } from "../lib/frameLeadAgentIdentity"

export const SCENE_WARM_SKIP_MS = 280
export const SCENE_MIN_HOLD_MS = 480

export interface SceneChangeCurtainProps {
  domainSlug: string
  onComplete: () => void
}

function resolveBilling(domainSlug: string): { domainName: string; agentName: string } {
  const cached = getCachedDomainBySlug(domainSlug)
  const frame = peekDomainFrame(domainSlug)
  const domainName = cached?.name?.trim() || domainSlug
  const leadSlug = frame ? readFrameLeadAgentSlug(frame) : null
  return { domainName, agentName: leadSlug ? "…" : "Agent" }
}

export function SceneChangeCurtain({ domainSlug, onComplete }: SceneChangeCurtainProps) {
  const reducedMotion = useReducedMotion()
  const [billing, setBilling] = React.useState(() => resolveBilling(domainSlug))
  const mountedAt = React.useRef(Date.now())
  const completedRef = React.useRef(false)

  React.useEffect(() => {
    prefetchDomainShell(domainSlug)
    setBilling(resolveBilling(domainSlug))

    const frame = peekDomainFrame(domainSlug)
    const leadSlug = frame ? readFrameLeadAgentSlug(frame) : null
    if (leadSlug?.trim()) {
      void resolvePlaybillAgent(leadSlug).then((agent) => {
        if (agent?.displayName) {
          setBilling((prev) => ({ ...prev, agentName: agent.displayName }))
        }
      })
    }

    const finish = () => {
      if (completedRef.current) return
      completedRef.current = true
      onComplete()
    }

    const elapsed = Date.now() - mountedAt.current
    const remaining = Math.max(0, SCENE_MIN_HOLD_MS - elapsed)
    const timer = window.setTimeout(finish, remaining)
    return () => window.clearTimeout(timer)
  }, [domainSlug, onComplete])

  const cached = getCachedDomainBySlug(domainSlug)
  const coverUrl =
    cached?.theme?.coverImage && typeof cached.theme.coverImage === "string"
      ? cached.theme.coverImage
      : null

  const content = (
    <motion.div
      className="scene-change-curtain fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: coverUrl
          ? `linear-gradient(to bottom, hsl(var(--theme-surface-page) / 0.55), hsl(var(--theme-surface-page) / 0.92)), url(${coverUrl}) center/cover no-repeat`
          : "hsl(var(--theme-surface-page))",
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-label={`Entering ${billing.domainName}`}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {billing.domainName} presents
      </p>
      <p
        className="mt-3 font-serif text-2xl font-semibold"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {billing.agentName}
      </p>
    </motion.div>
  )

  if (typeof document === "undefined") return content
  return createPortal(content, document.body)
}

export function shouldSkipSceneCurtain(startedAt: number): boolean {
  return Date.now() - startedAt < SCENE_WARM_SKIP_MS
}
