import {
  DEFAULT_KEY_CHRONICLE_BLOCKS,
  getIntegrationChronicleDeclaration,
  resolveKeyChronicleDefaults,
} from "@keeper/shared"

/** Client-side chronicle block list — DB value first, then shared declaration defaults. */
export function resolveIntegrationChronicleBlocks(
  serviceSlug: string,
  dbBlocks: string[] | null | undefined,
): string[] {
  if (dbBlocks?.length) return dbBlocks
  const declaration = getIntegrationChronicleDeclaration(serviceSlug)
  return declaration?.chronicle_blocks ? [...declaration.chronicle_blocks] : []
}

/** Client-side chronicle action slugs — DB value first, then shared declaration defaults. */
export function resolveIntegrationChronicleActions(
  serviceSlug: string,
  dbActions: string[] | null | undefined,
): string[] {
  if (dbActions?.length) return dbActions
  const declaration = getIntegrationChronicleDeclaration(serviceSlug)
  return declaration?.chronicle_actions ? [...declaration.chronicle_actions] : []
}

/** Client-side key chronicle blocks — DB value first, then shared key defaults. */
export function resolveKeyChronicleBlocks(
  provider: string,
  dbBlocks: string[] | null | undefined,
): string[] {
  if (dbBlocks?.length) return dbBlocks
  const defaults = resolveKeyChronicleDefaults(provider)
  return defaults.chronicle_blocks.length
    ? [...defaults.chronicle_blocks]
    : [...DEFAULT_KEY_CHRONICLE_BLOCKS]
}
