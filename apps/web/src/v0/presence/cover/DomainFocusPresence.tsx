"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import type { RelatedSection } from "../presenceEnrichment"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DomainConfigPresence } from "./DomainConfigPresence"
import { domainCoverSchema } from "./schemas/domainCoverSchema"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import type { AgentCoverMode } from "./coverTypes"

export interface DomainFocusPresenceProps {
  objectId: string
  record: Record<string, unknown>
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  visibleFields: [string, FieldDefinition][]
  ideBuildContextFields?: [string, FieldDefinition][]
  relatedSections: RelatedSection[]
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onSave: () => void | Promise<void>
  onFieldChange: (key: string, value: string) => void
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
}

export function DomainFocusPresence({
  objectId,
  record,
  fieldValues,
  fieldErrors,
  visibleFields,
  ideBuildContextFields,
  relatedSections,
  saveStatus,
  saveMessage,
  isDirty,
  onSave,
  onFieldChange,
  renderFieldEditor,
}: DomainFocusPresenceProps) {
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  const coverContent = React.useMemo(
    () =>
      domainCoverSchema.resolve(
        record,
        fieldValues,
        { objectId },
        { onConfigure: () => setCoverMode("config"), onOpenSession: () => {} },
      ),
    [record, fieldValues, objectId],
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
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />

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
          <DomainConfigPresence
            key="config"
            fieldValues={fieldValues}
            fieldErrors={fieldErrors}
            visibleFields={visibleFields}
            ideBuildContextFields={ideBuildContextFields}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            isDirty={isDirty}
            onBack={() => setCoverMode("cover")}
            onSave={() => void onSave()}
            onFieldChange={onFieldChange}
            renderFieldEditor={renderFieldEditor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
