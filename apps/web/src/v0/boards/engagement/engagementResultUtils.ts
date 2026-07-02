export function resolveCreatedEntityId(
  data: unknown,
  entityKey: "journey" | "path" | "moment" | "draft",
): string | null {
  if (!data || typeof data !== "object") return null

  const nested = (data as Record<string, { id?: unknown } | undefined>)[entityKey]
  if (nested && typeof nested.id === "string") return nested.id

  if (entityKey === "journey" && typeof (data as { id?: unknown }).id === "string") {
    return (data as { id: string }).id
  }

  return null
}
