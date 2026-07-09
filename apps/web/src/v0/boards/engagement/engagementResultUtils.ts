export function resolveCreatedEntityId(
  data: unknown,
  entityKey: "journey" | "path" | "moment" | "draft" | "keeper" | "dialog" | "agent",
): string | null {
  if (!data || typeof data !== "object") return null

  const record = data as Record<string, unknown>
  const nested = record[entityKey]
  if (nested && typeof nested === "object" && typeof (nested as { id?: unknown }).id === "string") {
    return (nested as { id: string }).id
  }

  const wrapped = record.data
  if (
    entityKey === "agent" &&
    wrapped &&
    typeof wrapped === "object" &&
    typeof (wrapped as { id?: unknown }).id === "string"
  ) {
    return (wrapped as { id: string }).id
  }

  if (entityKey === "journey" && typeof record.id === "string") {
    return record.id
  }

  if (entityKey === "agent" && typeof record.id === "string") {
    return record.id
  }

  return null
}
