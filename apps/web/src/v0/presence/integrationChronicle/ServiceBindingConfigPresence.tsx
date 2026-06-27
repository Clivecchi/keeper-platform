"use client"

import * as React from "react"
import {
  getServiceBindingFieldDefs,
  githubBindingToFieldValues,
  hasServiceBindingConfig,
  parseDomainServiceBindings,
  parseGitHubServiceBinding,
  parseIntegrationServiceBinding,
  validateGitHubBindingFields,
} from "@keeper/shared"
import { apiFetch } from "../../../lib/apiFetch"
import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_GITHUB_REPOSITORY,
} from "../../../lib/githubIntegrationDefaults"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import type { IntegrationDto } from "./shared"

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[14px] bg-transparent outline-none"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

async function loadDomainGitHubBindingFallback(
  domainId: string,
): Promise<ReturnType<typeof githubBindingToFieldValues>> {
  try {
    const domainRes = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`)
    const domain = (domainRes as { domain?: Record<string, unknown> })?.domain
    const settings = domain?.settings
    const bindings = parseDomainServiceBindings(settings)
    return githubBindingToFieldValues(bindings.github ?? null, {
      repository: DEFAULT_GITHUB_REPOSITORY,
      defaultBranch: DEFAULT_GITHUB_BRANCH,
    })
  } catch {
    return githubBindingToFieldValues(null, {
      repository: DEFAULT_GITHUB_REPOSITORY,
      defaultBranch: DEFAULT_GITHUB_BRANCH,
    })
  }
}

function resolveInitialBindingFields(
  serviceSlug: string,
  integration: IntegrationDto | null,
  domainFallback: Record<string, string>,
): Record<string, string> {
  if (serviceSlug === "github") {
    const fromIntegration = parseIntegrationServiceBinding(
      serviceSlug,
      integration?.metadata ?? null,
    )
    if (fromIntegration) {
      return githubBindingToFieldValues(fromIntegration)
    }
    return domainFallback
  }
  return {}
}

export function ServiceBindingConfigPresence({
  serviceSlug,
  domainId,
  displayLabel,
  integration,
  onBack,
  onRefresh,
}: {
  serviceSlug: string
  domainId: string
  displayLabel: string
  integration: IntegrationDto | null
  onBack: () => void
  onRefresh?: () => void
}) {
  const fieldDefs = getServiceBindingFieldDefs(serviceSlug)
  const [domainFallback, setDomainFallback] = React.useState<Record<string, string>>(() =>
    githubBindingToFieldValues(null, {
      repository: DEFAULT_GITHUB_REPOSITORY,
      defaultBranch: DEFAULT_GITHUB_BRANCH,
    }),
  )

  React.useEffect(() => {
    if (serviceSlug !== "github") return
    void loadDomainGitHubBindingFallback(domainId).then(setDomainFallback)
  }, [domainId, serviceSlug])

  const initialFields = React.useMemo(
    () => resolveInitialBindingFields(serviceSlug, integration, domainFallback),
    [serviceSlug, integration, domainFallback],
  )

  const baselineRef = React.useRef(initialFields)
  const [fieldValues, setFieldValues] = React.useState(initialFields)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    baselineRef.current = initialFields
    setFieldValues(initialFields)
  }, [serviceSlug, integration?.metadata, initialFields])

  const chronicleConfig = useChronicleConfig({
    entityKind: "service",
    entityId: serviceSlug,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      if (serviceSlug === "github") {
        const nextBinding = parseGitHubServiceBinding(current)
        const prevBinding = parseGitHubServiceBinding(baseline)
        if (
          nextBinding &&
          prevBinding &&
          nextBinding.repository === prevBinding.repository &&
          nextBinding.defaultBranch === prevBinding.defaultBranch
        ) {
          return null
        }
        if (!nextBinding) return null
        return { binding: nextBinding }
      }
      return null
    },
    validate: () => {
      if (serviceSlug === "github") {
        const errors = validateGitHubBindingFields(fieldValuesRef.current)
        const first = Object.values(errors)[0]
        return first ?? null
      }
      return null
    },
    patchKeys: () => Object.keys(fieldValuesRef.current),
    onSaved: () => {
      baselineRef.current = { ...fieldValuesRef.current }
    },
    onRefresh,
  })

  const handleFieldChange = (key: string, value: string) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: value }))
    if (chronicleConfig.fieldErrors[key]) {
      chronicleConfig.setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  if (!hasServiceBindingConfig(serviceSlug) || fieldDefs.length === 0) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        No binding settings for {displayLabel}.
      </p>
    )
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: displayLabel,
        status: "Service binding",
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <p
        className="text-[13px] leading-relaxed mb-5"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Cloud and Chronicle use these settings as the default repository context for this domain.
      </p>

      {fieldDefs.map((field) => (
        <div className="mb-4" key={field.key}>
          <p className="keeper-presence-field-label mb-1.5">{field.label}</p>
          <input
            type="text"
            value={fieldValues[field.key] ?? ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
          {chronicleConfig.fieldErrors[field.key] ? (
            <p
              className="text-[13px] mt-2 leading-relaxed"
              style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
            >
              {chronicleConfig.fieldErrors[field.key]}
            </p>
          ) : null}
        </div>
      ))}
    </ChronicleConfigShell>
  )
}
