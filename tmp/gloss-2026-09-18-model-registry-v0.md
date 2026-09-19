Cursor · Model Registry V0 (2026-09-18)

Gloss-only. Not a build lock. Inspection only — no code was written.

We hit a real production banner on Ceox (“Anthropic does not accept claude-sonnet-4-6”) and then a correction: a later plain turn on the same stored model succeeded. Chuck also cannot select Claude Sonnet 5 in Cockpit or Chronicle Config.

Code truth, short:

- An Agent still owns a model. `kip_agents.model` + `model_provider` + `model_settings.model` are three copies. Runtime prefers `kip_agents.model`. Cockpit “Change model” writes provider + settings and may not update the identity field. Chronicle Config writes `model`. Domain `frame_json.kip.model` is a fourth display copy and is not used for execution.
- There is no Model Registry. There is a stale static catalog (`modelCatalog.ts`) plus a capability map (`modelCapabilities.ts`). `claude-sonnet-5` is nowhere in the repo. Anthropic has no live catalog fetcher wired into GET /api/kip/models (Together and TypeSafe do). That is why Sonnet 5 cannot be selected.
- Provider adapters already exist in `ModelProviderService` (OpenAI, Anthropic, Together, ElevenLabs, TypeSafe). Retry is same-model only. INVALID_MODEL is not retryable. The classifier treats any error containing both “model” and “not” as a bad model ID — so a heavier TypeSafe-test turn with an attachment can be mislabeled even when 4.6 still chats.
- TypeSafe/Jev is correctly a Kip action (`typesafe.evaluate`) and incorrectly also a Cockpit chat-provider option. It must not become the chat model, and it must not become authorization. KAM stays the authority boundary.
- Activity logs store `kip_agent_logs.model` (the agent identity string), not the offering actually used, not the provider, not whether fallback fired.

Recommended V0 — smallest step that restores movement and opens the Registry seam, without TypeSafe routing:

Agent identity stays. Existing model fields become preference, not identity.
  → intelligence policy / default profile (V0 = “chat + vision, same class as preference”)
  → in-code Model Registry (models vs provider offerings; add Sonnet 5 as an offering)
  → resolve one offering
  → existing ModelProviderService adapter
  → on INVALID_MODEL / unavailable: one declared sibling fallback, user-visible, logged
  → persist actual provider + model + offering on the turn

Do not: hard-code Sonnet 5 onto Ceox; remove model fields; build TypeSafe routing; add Prisma tables yet; treat TypeSafe as a chat provider.

The hypothesis under test: Agents have identity. Models provide intelligence. Keeper resolves the intelligence appropriate to the performance.
