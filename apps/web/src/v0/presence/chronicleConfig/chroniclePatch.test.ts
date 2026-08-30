// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  buildAgentChroniclePatchBody,
  handleChronicleSave,
  parseChroniclePatchFieldErrors,
  resolveChronicleFramePatchEndpoint,
  resolveChroniclePatchEndpoint,
} from "./chroniclePatch"

describe("resolveChroniclePatchEndpoint", () => {
  it("routes library and domain to existing targeted PATCH paths", () => {
    expect(resolveChroniclePatchEndpoint("library", "lib-1", "dom-1")).toBe(
      "/api/library-items/lib-1",
    )
    expect(resolveChroniclePatchEndpoint("domain", "dom-1", "dom-1")).toBe(
      "/api/domains/dom-1",
    )
  })

  it("does not invent a domainId-based frame route (frame PATCH is slug-scoped)", () => {
    expect(resolveChroniclePatchEndpoint("frame", "cover", "dom-uuid")).toBe("")
    expect(resolveChronicleFramePatchEndpoint("ke3p")).toBe("/api/domains/ke3p/frame")
  })

  it("does not invent a boardDef persistence route (code-defined)", () => {
    expect(resolveChroniclePatchEndpoint("boardDef", "domain", "dom-uuid")).toBe("")
  })
})

describe("buildAgentChroniclePatchBody", () => {
  it("keeps a short name and omits blank optional fields", () => {
    const body = buildAgentChroniclePatchBody(
      {
        name: "liv",
        purpose: "",
        tagline: "   ",
        model_provider: "",
        visibility: "",
        lensSystemPrompt: "short",
        memory_enabled: "true",
      },
      "dom-1",
    )
    expect(body).toEqual({
      domainId: "dom-1",
      name: "liv",
      memory_enabled: true,
    })
  })
})

describe("parseChroniclePatchFieldErrors", () => {
  it("maps Zod purpose failure onto purpose, not name", () => {
    const errors = parseChroniclePatchFieldErrors(
      {
        status: 400,
        data: {
          error: "Validation error",
          details: [
            {
              path: ["purpose"],
              message: "String must contain at least 1 character(s)",
            },
          ],
        },
      },
      ["name", "purpose", "tagline"],
    )
    expect(errors.purpose).toBe("Purpose cannot be empty.")
    expect(errors.name).toBeUndefined()
  })
})

describe("handleChronicleSave", () => {
  it("returns an explicit error for boardDef instead of a silent empty PATCH", async () => {
    const result = await handleChronicleSave(
      "boardDef",
      "domain",
      { displayName: "Domain Board" },
      { domainId: "dom-1", domainSlug: "ke3p" },
    )
    expect(result.status).toBe("error")
    expect(result.message).toMatch(/code-defined/i)
  })

  it("requires a domain slug before PATCHing frame_json", async () => {
    const result = await handleChronicleSave(
      "frame",
      "cover",
      { theme: { colors: { primary: "#2d6a7f" } } },
      { domainId: "dom-1" },
    )
    expect(result.status).toBe("error")
    expect(result.message).toMatch(/slug/i)
  })
})
