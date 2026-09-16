import { createLibraryItem } from "../integrationChronicle/libraryNavCreate"

export type ChronicleCoverLibraryAttach = {
  domainId: string
  userId?: string
  displayLabel: string
  activeKeeperId?: string | null
  activeAgentId?: string | null
}

/**
 * Chronicle cover/avatar upload → Library shelf.
 * Object persist stays in the caller. Library failure must not block the object save.
 */
export async function attachChronicleUploadToLibrary(
  params: ChronicleCoverLibraryAttach & { imageUrl: string },
): Promise<string | undefined> {
  if (!params.userId || !params.imageUrl.trim() || !params.domainId.trim()) {
    return undefined
  }

  try {
    const row = await createLibraryItem({
      domainId: params.domainId,
      userId: params.userId,
      sourceType: "upload",
      sourceRef: params.imageUrl,
      displayLabel: params.displayLabel,
      activeKeeperId: params.activeKeeperId,
      activeAgentId: params.activeAgentId,
    })
    return row.id
  } catch (error) {
    console.warn("[attachChronicleUploadToLibrary] library item skipped:", error)
    return undefined
  }
}
