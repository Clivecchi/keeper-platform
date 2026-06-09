"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import type { RelatedSection } from "../presenceEnrichment"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { AgentConfigPresence } from "./AgentConfigPresence"
import { resolveAgentCoverContent } from "./schemas/agentCoverSchema"
import { focusConversationComposer } from "./openSession"
import type { AgentCoverMode } from "./coverTypes"

export interface AgentFocusPresenceProps {
  objectId: string
  record: Record<string, unknown>
  domainSlug?: string
  domainDisplayName?: string
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  hiddenFields: string[]
  visibleFields: [string, FieldDefinition][]
  relatedSections: RelatedSection[]
  saveStatus: "idle" | "saving" | "saved" | "error"
  saveMessage: string | null
  isDirty: boolean
  advancedOpen: boolean
  advancedValues: { temperature: string; max_tokens: string }
  onSaveAgent?: () => void | Promise<void>
  onDismissSaveError?: () => void
  onFieldChange: (key: string, value: string) => void
  onAdvancedOpenChange: (open: boolean) => void
  onAdvancedChange: (key: "temperature" | "max_tokens", value: string) => void
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
}

/**
 * Agent Chronicle — Cover Mode (default) and Config Mode.
 * Uses universal EntityCoverPresence slots filled by agentCoverSchema.
 */
export function AgentFocusPresence({
  objectId,
  record,
  domainSlug,
  domainDisplayName,
  fieldValues,
  fieldErrors,
  hiddenFields,
  visibleFields,
  relatedSections,
  saveStatus,
  saveMessage,
  isDirty,
  advancedOpen,
  advancedValues,
  onSaveAgent,
  onDismissSaveError,
  onFieldChange,
  onAdvancedOpenChange,
  onAdvancedChange,
  renderFieldEditor,
}: AgentFocusPresenceProps) {
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  const coverContent = React.useMemo(
    () =>
      resolveAgentCoverContent(
        record,
        fieldValues,
        {
          objectId,
          domainSlug,
          domainDisplayName,
        },
        {
          onConfigure: () => setCoverMode("config"),
          onOpenSession: () => focusConversationComposer(),
        },
      ),
    [record, fieldValues, objectId, domainSlug, domainDisplayName],
  )

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        {coverMode === "cover" ? (
          <motion.div
            key="cover"
            className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EntityCoverPresence
              content={coverContent}
              instanceKey={objectId}
            />

            {relatedSections.length > 0 && (
              <div className="mt-6">
                {relatedSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      {section.title}
                    </p>
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border px-3 py-2 mb-2"
                        style={{
                          borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                          background: "hsl(var(--theme-surface-elevated) / 0.25)",
                        }}
                      >
                        <p
                          className="text-[13px] font-medium"
                          style={{ color: "hsl(var(--theme-ink-primary))" }}
                        >
                          {item.label}
                        </p>
                        {item.sub && (
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                          >
                            {item.sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <AgentConfigPresence
            key="config"
            objectId={objectId}
            record={record}
            fieldValues={fieldValues}
            fieldErrors={fieldErrors}
            hiddenFields={hiddenFields}
            visibleFields={visibleFields}
            domainDisplayName={domainDisplayName}
            domainSlug={domainSlug}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            isDirty={isDirty}
            advancedOpen={advancedOpen}
            advancedValues={advancedValues}
            onBack={() => setCoverMode("cover")}
            onSave={() => void onSaveAgent?.()}
            onDismissSaveError={onDismissSaveError}
            onFieldChange={onFieldChange}
            onAdvancedOpenChange={onAdvancedOpenChange}
            onAdvancedChange={onAdvancedChange}
            renderFieldEditor={renderFieldEditor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
