import { apiFetch } from "../../../lib/apiFetch"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export type CreateLibraryItemParams = {
  domainId: string
  userId: string
  sourceType: "upload" | "url"
  sourceRef: string
  displayLabel?: string | null
  activeKeeperId?: string | null
  activeAgentId?: string | null
}

export async function uploadLibraryFile(params: {
  domainId: string
  userId: string
  file: File
}): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.includes(",") ? result.split(",")[1] : result
      resolve(base64Data || "")
    }
    reader.onerror = reject
    reader.readAsDataURL(params.file)
  })

  const safeName = params.file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80)
  const key = [
    "uploads",
    params.userId,
    "library",
    "domain",
    params.domainId,
    `${Date.now()}-${safeName}`,
  ].join("/")

  const res = (await apiFetch("/api/uploads/direct", {
    method: "POST",
    body: JSON.stringify({
      key,
      file: base64,
      contentType: params.file.type || "application/octet-stream",
    }),
  })) as { success?: boolean; data?: { url?: string }; error?: string }

  if (!res?.success || !res?.data?.url) {
    throw new Error(res?.error || "Upload failed")
  }

  return res.data.url
}

export async function createLibraryItem(
  params: CreateLibraryItemParams,
): Promise<{ id: string }> {
  const row = (await apiFetch("/api/library-items", {
    method: "POST",
    body: JSON.stringify({
      domain_id: params.domainId,
      source_type: params.sourceType,
      source_ref: params.sourceRef,
      display_label: params.displayLabel?.trim() || undefined,
      activeKeeperId: params.activeKeeperId ?? null,
      activeAgentId: params.activeAgentId ?? null,
    }),
  })) as { id?: string; error?: string }

  if (!row?.id) {
    throw new Error(row?.error || "Failed to create library item")
  }

  return { id: row.id }
}

export function isLibraryImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type)
}

export async function commitComposerAttachmentsToLibrary(params: {
  domainId: string
  userId: string
  attachments: ReadonlyArray<{ url: string; name: string; libraryItemId?: string }>
  activeKeeperId?: string | null
  activeAgentId?: string | null
}): Promise<Array<{ url: string; name: string; libraryItemId: string }>> {
  const results: Array<{ url: string; name: string; libraryItemId: string }> = []
  for (const attachment of params.attachments) {
    if (attachment.libraryItemId) {
      results.push({
        url: attachment.url,
        name: attachment.name,
        libraryItemId: attachment.libraryItemId,
      })
      continue
    }
    const row = await createLibraryItem({
      domainId: params.domainId,
      userId: params.userId,
      sourceType: "upload",
      sourceRef: attachment.url,
      displayLabel: attachment.name,
      activeKeeperId: params.activeKeeperId,
      activeAgentId: params.activeAgentId,
    })
    results.push({
      url: attachment.url,
      name: attachment.name,
      libraryItemId: row.id,
    })
  }
  return results
}

/** Composer clip and Library nav + — same upload → LibraryItem path. */
export async function addLibraryUploadFromFile(params: {
  domainId: string
  userId: string
  file: File
  displayLabel?: string | null
  activeKeeperId?: string | null
  activeAgentId?: string | null
}): Promise<{ id: string; url: string }> {
  const url = await uploadLibraryFile({
    domainId: params.domainId,
    userId: params.userId,
    file: params.file,
  })
  const row = await createLibraryItem({
    domainId: params.domainId,
    userId: params.userId,
    sourceType: "upload",
    sourceRef: url,
    displayLabel: params.displayLabel ?? params.file.name,
    activeKeeperId: params.activeKeeperId,
    activeAgentId: params.activeAgentId,
  })
  return { id: row.id, url }
}
