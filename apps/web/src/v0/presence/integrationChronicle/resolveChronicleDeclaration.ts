import {
  DEFAULT_KEY_CHRONICLE_BLOCKS,
  DEFAULT_CAPABILITY_CHRONICLE_BLOCKS,
  DEFAULT_LIBRARY_CHRONICLE_BLOCKS,
  DEFAULT_KEEPER_CHRONICLE_BLOCKS,
  getIntegrationChronicleDeclaration,
  resolveKeyChronicleDefaults,
  resolveCapabilityChronicleDefaults,
  resolveLibraryChronicleDefaults,
  type CapabilityKind,
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

/** Client-side capability chronicle blocks — DB value first, then shared defaults. */
export function resolveCapabilityChronicleBlocks(
  kind: CapabilityKind,
  dbBlocks: string[] | null | undefined,
): string[] {
  if (dbBlocks?.length) return dbBlocks
  const defaults = resolveCapabilityChronicleDefaults(kind)
  return defaults.chronicle_blocks.length
    ? [...defaults.chronicle_blocks]
    : [...DEFAULT_CAPABILITY_CHRONICLE_BLOCKS]
}

/** Client-side library chronicle blocks — DB value first, then shared defaults. */
export function resolveLibraryChronicleBlocks(
  dbBlocks: string[] | null | undefined,
): string[] {
  if (dbBlocks?.length) return dbBlocks
  const defaults = resolveLibraryChronicleDefaults()
  return defaults.chronicle_blocks.length
    ? [...defaults.chronicle_blocks]
    : [...DEFAULT_LIBRARY_CHRONICLE_BLOCKS]
}

/** Client-side keeper chronicle blocks — DB value first, then shared defaults. */
export function resolveKeeperChronicleBlocks(
  dbBlocks: string[] | null | undefined,
): string[] {
  if (dbBlocks?.length) return dbBlocks
  return [...DEFAULT_KEEPER_CHRONICLE_BLOCKS]
}
