/**
 * Frame JSON Schemas — Together AI JSON Mode
 *
 * One JSON Schema object per frame that has JSON governance.
 * Passed as `response_format.schema` to Together AI to guarantee
 * schema-compliant output — no guessing, no invalid keys, always publishable.
 *
 * Schemas are manually derived from the TypeScript interfaces in:
 *   apps/web/src/v0/data/domain-frame.types.ts
 *
 * JSON Schema draft-07 compatible (Together AI guided decoding format).
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

// ─── cover ────────────────────────────────────────────────────────────────────
// Source: DomainFrameCover → DomainFrameCoverCard

export const coverFrameSchema = {
  type: "object",
  properties: {
    slide_type: { type: "string" },
    card: {
      type: "object",
      properties: {
        type: { type: "string" },
        available_to: {
          type: "array",
          items: { type: "string", enum: ["guest", "keeper", "admin"] },
        },
      },
      required: ["type", "available_to"],
      additionalProperties: false,
    },
  },
  required: ["slide_type", "card"],
  additionalProperties: false,
} as const;

// ─── commons ──────────────────────────────────────────────────────────────────
// Source: CommonsFrameJson → CommonsFrameLabels + CommonsFrameMessaging

export const commonsFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        close_aria_label: { type: "string" },
        settings_aria_label: { type: "string" },
        settings_open_domain: { type: "string" },
        settings_theme_label: { type: "string" },
        breadcrumb_journey: { type: "string" },
        banner_aria_label: { type: "string" },
        sidebar_label: { type: "string" },
        workspace_label: { type: "string" },
        admin_cover_heading: { type: "string" },
        admin_cover_description: { type: "string" },
        admin_cover_saving: { type: "string" },
        admin_cover_saved: { type: "string" },
        admin_cover_error_type: { type: "string" },
        admin_cover_error_api: { type: "string" },
      },
      required: [
        "close_aria_label", "settings_aria_label", "settings_open_domain",
        "settings_theme_label", "breadcrumb_journey", "banner_aria_label",
        "sidebar_label", "workspace_label", "admin_cover_heading",
        "admin_cover_description", "admin_cover_saving", "admin_cover_saved",
        "admin_cover_error_type", "admin_cover_error_api",
      ],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        errors: {
          type: "object",
          properties: { load_failed: { type: "string" } },
          required: ["load_failed"],
          additionalProperties: false,
        },
        feed: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            empty_title: { type: "string" },
            empty_detail: { type: "string" },
            empty_time: { type: "string" },
            capture_cta: { type: "string" },
            default_moment_title: { type: "string" },
            default_moment_detail: { type: "string" },
            loading: { type: "string" },
          },
          required: [
            "eyebrow", "title", "description", "empty_title", "empty_detail",
            "empty_time", "capture_cta", "default_moment_title",
            "default_moment_detail", "loading",
          ],
          additionalProperties: false,
        },
        create: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            form_eyebrow: { type: "string" },
            form_description: { type: "string" },
            start_journey: { type: "string" },
            capture_moment: { type: "string" },
            domain_loading: { type: "string" },
          },
          required: [
            "eyebrow", "title", "description", "form_eyebrow",
            "form_description", "start_journey", "capture_moment", "domain_loading",
          ],
          additionalProperties: false,
        },
        summary: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            stat_journeys: { type: "string" },
            stat_keepers: { type: "string" },
            stat_moments: { type: "string" },
            stat_members: { type: "string" },
            members_private: { type: "string" },
          },
          required: [
            "eyebrow", "title", "description", "stat_journeys", "stat_keepers",
            "stat_moments", "stat_members", "members_private",
          ],
          additionalProperties: false,
        },
        entity: {
          type: "object",
          properties: {
            not_found_title: { type: "string" },
            not_found_description: { type: "string" },
            back_button: { type: "string" },
            moment_title_fallback: { type: "string" },
            moment_body_fallback: { type: "string" },
            title_fallback: { type: "string" },
          },
          required: [
            "not_found_title", "not_found_description", "back_button",
            "moment_title_fallback", "moment_body_fallback", "title_fallback",
          ],
          additionalProperties: false,
        },
        sidebar: {
          type: "object",
          properties: {
            journeys_title: { type: "string" },
            journeys_description: { type: "string" },
            journeys_empty: { type: "string" },
            journeys_empty_cta: { type: "string" },
            journeys_error: { type: "string" },
            relationships_title: { type: "string" },
            relationships_description: { type: "string" },
            relationships_error: { type: "string" },
            keepers_title: { type: "string" },
            keepers_description: { type: "string" },
            keepers_empty: { type: "string" },
            keepers_empty_cta: { type: "string" },
            keepers_error: { type: "string" },
          },
          required: [
            "journeys_title", "journeys_description", "journeys_empty",
            "journeys_empty_cta", "journeys_error", "relationships_title",
            "relationships_description", "relationships_error", "keepers_title",
            "keepers_description", "keepers_empty", "keepers_empty_cta", "keepers_error",
          ],
          additionalProperties: false,
        },
        roles: {
          type: "object",
          properties: {
            default_label: { type: "string" },
            default_summary: { type: "string" },
            name_fallback: { type: "string" },
            avatar_fallback: { type: "string" },
          },
          required: ["default_label", "default_summary", "name_fallback", "avatar_fallback"],
          additionalProperties: false,
        },
        time: {
          type: "object",
          properties: {
            recently: { type: "string" },
            just_now: { type: "string" },
            minutes_ago: { type: "string" },
            hours_ago: { type: "string" },
            days_ago: { type: "string" },
          },
          required: ["recently", "just_now", "minutes_ago", "hours_ago", "days_ago"],
          additionalProperties: false,
        },
      },
      required: ["errors", "feed", "create", "summary", "entity", "sidebar", "roles", "time"],
      additionalProperties: false,
    },
  },
  required: ["labels", "messaging"],
  additionalProperties: false,
} as const;

// ─── moment ───────────────────────────────────────────────────────────────────
// Source: MomentFrameJson → MomentFrameLabels + MomentFrameMessaging

export const momentFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        frame_title: { type: "string" },
        close_aria_label: { type: "string" },
        bootstrap_error_no_domain: { type: "string" },
        bootstrap_banner_heading: { type: "string" },
        bootstrap_banner_body: { type: "string" },
        bootstrap_banner_retry: { type: "string" },
        bootstrap_banner_start_new: { type: "string" },
        status_trouble: { type: "string" },
        status_preparing: { type: "string" },
        status_saving: { type: "string" },
        status_saved: { type: "string" },
        status_retry: { type: "string" },
      },
      required: [
        "frame_title", "close_aria_label", "bootstrap_error_no_domain",
        "bootstrap_banner_heading", "bootstrap_banner_body", "bootstrap_banner_retry",
        "bootstrap_banner_start_new", "status_trouble", "status_preparing",
        "status_saving", "status_saved", "status_retry",
      ],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        writing: {
          type: "object",
          properties: {
            placeholder: { type: "string" },
            preserved: { type: "string" },
            keep_button: { type: "string" },
            keeping_button: { type: "string" },
            kept_button: { type: "string" },
            keep_aria_label: { type: "string" },
            upload_aria_label: { type: "string" },
            kept_label: { type: "string" },
          },
          required: [
            "placeholder", "preserved", "keep_button", "keeping_button",
            "kept_button", "keep_aria_label", "upload_aria_label", "kept_label",
          ],
          additionalProperties: false,
        },
        save_status: {
          type: "object",
          properties: {
            kept_forever: { type: "string" },
            saving: { type: "string" },
            save_failed: { type: "string" },
            keep_failed: { type: "string" },
          },
          required: ["kept_forever", "saving", "save_failed", "keep_failed"],
          additionalProperties: false,
        },
        claim: {
          type: "object",
          properties: {
            unauthenticated: { type: "string" },
            failed: { type: "string" },
            heading: { type: "string" },
            body: { type: "string" },
            copy_button: { type: "string" },
            email_button: { type: "string" },
            claim_button: { type: "string" },
            signin_button: { type: "string" },
            signup_button: { type: "string" },
            email_subject: { type: "string" },
          },
          required: [
            "unauthenticated", "failed", "heading", "body", "copy_button",
            "email_button", "claim_button", "signin_button", "signup_button", "email_subject",
          ],
          additionalProperties: false,
        },
        kip: {
          type: "object",
          properties: {
            panel_title: { type: "string" },
            panel_close_aria_label: { type: "string" },
            panel_placeholder: { type: "string" },
          },
          required: ["panel_title", "panel_close_aria_label", "panel_placeholder"],
          additionalProperties: false,
        },
        feedback_rail: {
          type: "object",
          properties: {
            view_in_domain: { type: "string" },
            kip_button: { type: "string" },
            kip_aria_label: { type: "string" },
          },
          required: ["view_in_domain", "kip_button", "kip_aria_label"],
          additionalProperties: false,
        },
        footer: {
          type: "object",
          properties: {
            trail_label: { type: "string" },
            no_activity: { type: "string" },
            index: { type: "string" },
            view_drafts: { type: "string" },
            view_kept: { type: "string" },
            back_to_domain: { type: "string" },
          },
          required: [
            "trail_label", "no_activity", "index",
            "view_drafts", "view_kept", "back_to_domain",
          ],
          additionalProperties: false,
        },
      },
      required: ["writing", "save_status", "claim", "kip", "feedback_rail", "footer"],
      additionalProperties: false,
    },
  },
  required: ["labels", "messaging"],
  additionalProperties: false,
} as const;

// ─── moments (kept_moments) ───────────────────────────────────────────────────
// Source: KeptMomentsFrame → KeptMomentsFrameLabels + KeptMomentsFrameMessaging

export const keptMomentsFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        frame_title: { type: "string" },
        frame_subtitle: { type: "string" },
        close_aria_label: { type: "string" },
        filter_label: { type: "string" },
        filter_all: { type: "string" },
      },
      required: ["frame_title", "frame_subtitle", "close_aria_label", "filter_label", "filter_all"],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        loading: { type: "string" },
        missing_domain: { type: "string" },
        fetch_failed: { type: "string" },
        empty: { type: "string" },
        empty_filtered: { type: "string" },
        untitled: { type: "string" },
        kept_fallback: { type: "string" },
      },
      required: [
        "loading", "missing_domain", "fetch_failed",
        "empty", "empty_filtered", "untitled", "kept_fallback",
      ],
      additionalProperties: false,
    },
  },
  required: ["labels", "messaging"],
  additionalProperties: false,
} as const;

// ─── journeys ─────────────────────────────────────────────────────────────────
// Source: JourneysFrame → JourneysFrameLabels + JourneysFrameMessaging

export const journeysFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        frame_title: { type: "string" },
        frame_subtitle: { type: "string" },
        section_heading: { type: "string" },
        new_button: { type: "string" },
        set_active_button: { type: "string" },
        moments_section_heading: { type: "string" },
        active_badge: { type: "string" },
      },
      required: [
        "frame_title", "frame_subtitle", "section_heading", "new_button",
        "set_active_button", "moments_section_heading", "active_badge",
      ],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        empty_states: {
          type: "object",
          properties: {
            no_journeys_heading: { type: "string" },
            no_journeys_body: { type: "string" },
            no_selection: { type: "string" },
            no_moments: { type: "string" },
          },
          required: ["no_journeys_heading", "no_journeys_body", "no_selection", "no_moments"],
          additionalProperties: false,
        },
        errors: {
          type: "object",
          properties: { failed_to_load: { type: "string" } },
          required: ["failed_to_load"],
          additionalProperties: false,
        },
        meta: {
          type: "object",
          properties: {
            keeper_prefix: { type: "string" },
            created_prefix: { type: "string" },
            kept_prefix: { type: "string" },
            untitled_moment: { type: "string" },
          },
          required: ["keeper_prefix", "created_prefix", "kept_prefix", "untitled_moment"],
          additionalProperties: false,
        },
      },
      required: ["empty_states", "errors", "meta"],
      additionalProperties: false,
    },
  },
  required: ["labels", "messaging"],
  additionalProperties: false,
} as const;

// ─── agent (agent_board) ──────────────────────────────────────────────────────
// Source: AgentBoardFrame → labels, messaging, structure, theme

export const agentFrameSchema = {
  type: "object",
  properties: {
    frame_title: { type: "string" },
    labels: {
      type: "object",
      properties: {
        sidebar: {
          type: "object",
          properties: {
            drafts: { type: "string" },
            journeys: { type: "string" },
            keepers: { type: "string" },
            sessions: { type: "string" },
            journeys_description: { type: "string" },
            keepers_description: { type: "string" },
          },
          required: [
            "drafts", "journeys", "keepers", "sessions",
            "journeys_description", "keepers_description",
          ],
          additionalProperties: false,
        },
        actions: {
          type: "object",
          properties: {
            open_cockpit: { type: "string" },
            new_session: { type: "string" },
            back_to_commons: { type: "string" },
            sign_in: { type: "string" },
            back_to_dialogue: { type: "string" },
            view_drafts: { type: "string" },
            agent_diagnostics: { type: "string" },
          },
          required: [
            "open_cockpit", "new_session", "back_to_commons", "sign_in",
            "back_to_dialogue", "view_drafts", "agent_diagnostics",
          ],
          additionalProperties: false,
        },
      },
      required: ["sidebar", "actions"],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        signin: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            body: { type: "string" },
          },
          required: ["title", "subtitle", "body"],
          additionalProperties: false,
        },
        empty_states: {
          type: "object",
          properties: {
            no_drafts: { type: "string" },
            no_journeys: { type: "string" },
            no_keepers: { type: "string" },
            no_sessions: { type: "string" },
            start_conversation: { type: "string" },
          },
          required: ["no_drafts", "no_journeys", "no_keepers", "no_sessions", "start_conversation"],
          additionalProperties: false,
        },
        dialogue: {
          type: "object",
          properties: {
            start_prompt: { type: "string" },
            thinking: { type: "string" },
          },
          required: ["start_prompt", "thinking"],
          additionalProperties: false,
        },
        errors: {
          type: "object",
          properties: {
            unable_to_load: { type: "string" },
            not_found: { type: "string" },
            session_expired: { type: "string" },
            send_failed: { type: "string" },
          },
          required: ["unable_to_load", "not_found", "session_expired", "send_failed"],
          additionalProperties: false,
        },
      },
      required: ["signin", "empty_states", "dialogue", "errors"],
      additionalProperties: false,
    },
    structure: {
      type: "object",
      properties: {
        model: {
          type: "object",
          properties: {
            provider: { type: "string" },
            id: { type: "string" },
          },
          required: ["provider", "id"],
          additionalProperties: false,
        },
        dialogue: {
          type: "object",
          properties: { user_bubble_color: { type: "string" } },
          required: ["user_bubble_color"],
          additionalProperties: false,
        },
      },
      required: ["model", "dialogue"],
      additionalProperties: false,
    },
    theme: {
      type: "object",
      properties: {
        source: { type: "string" },
        override_allowed: { type: "boolean" },
      },
      required: ["source", "override_allowed"],
      additionalProperties: false,
    },
  },
  required: ["frame_title", "labels", "messaging", "structure", "theme"],
  additionalProperties: false,
} as const;

// ─── diagnostics ──────────────────────────────────────────────────────────────
// Source: DiagnosticsFrameJson

export const diagnosticsFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        frameTitle: { type: "string" },
        frameSubtitle: { type: "string" },
        closeAriaLabel: { type: "string" },
        closeButton: { type: "string" },
      },
      required: ["frameTitle", "frameSubtitle", "closeAriaLabel", "closeButton"],
      additionalProperties: false,
    },
    run_diagnostics: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            runButton: { type: "string" },
            runningButton: { type: "string" },
            copyButton: { type: "string" },
            viewDetailedJson: { type: "string" },
            clearButton: { type: "string" },
          },
          required: ["heading", "runButton", "runningButton", "copyButton", "viewDetailedJson", "clearButton"],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: {
            description: { type: "string" },
            copySuccess: { type: "string" },
            footerNote: { type: "string" },
          },
          required: ["description", "copySuccess", "footerNote"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
    context: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            domainSlug: { type: "string" },
            domainId: { type: "string" },
            xDomainSlug: { type: "string" },
            notSet: { type: "string" },
          },
          required: ["heading", "domainSlug", "domainId", "xDomainSlug", "notSet"],
          additionalProperties: false,
        },
      },
      required: ["labels"],
      additionalProperties: false,
    },
    domain_home_board: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            domainSlug: { type: "string" },
            endpoint: { type: "string" },
            stability: { type: "string" },
            stabilityPass: { type: "string" },
            stabilityFail: { type: "string" },
            httpStatus1: { type: "string" },
            httpStatus2: { type: "string" },
            boardId: { type: "string" },
            boardType: { type: "string" },
            domainId: { type: "string" },
            frames: { type: "string" },
            framesDetail: { type: "string" },
          },
          required: [
            "heading", "domainSlug", "endpoint", "stability", "stabilityPass",
            "stabilityFail", "httpStatus1", "httpStatus2", "boardId", "boardType",
            "domainId", "frames", "framesDetail",
          ],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: {
            description: { type: "string" },
            authBlocked: { type: "string" },
            noFrames: { type: "string" },
            emptyState: { type: "string" },
          },
          required: ["description", "authBlocked", "noFrames", "emptyState"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
    live_progress: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: { heading: { type: "string" } },
          required: ["heading"],
          additionalProperties: false,
        },
      },
      required: ["labels"],
      additionalProperties: false,
    },
    summary: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            total: { type: "string" },
            passed: { type: "string" },
            failed: { type: "string" },
            success: { type: "string" },
          },
          required: ["heading", "total", "passed", "failed", "success"],
          additionalProperties: false,
        },
      },
      required: ["labels"],
      additionalProperties: false,
    },
    agent_diagnostics: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            authStatus: { type: "string" },
            authAuthenticated: { type: "string" },
            authGuest: { type: "string" },
            userId: { type: "string" },
            domainResolution: { type: "string" },
            consoleLogs: { type: "string" },
            networkRequests: { type: "string" },
          },
          required: [
            "heading", "authStatus", "authAuthenticated", "authGuest",
            "userId", "domainResolution", "consoleLogs", "networkRequests",
          ],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: {
            description: { type: "string" },
            noConsoleLogs: { type: "string" },
            noNetworkRequests: { type: "string" },
          },
          required: ["description", "noConsoleLogs", "noNetworkRequests"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
    board_error: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            reqId: { type: "string" },
            url: { type: "string" },
            status: { type: "string" },
            boardId: { type: "string" },
            at: { type: "string" },
          },
          required: ["heading", "reqId", "url", "status", "boardId", "at"],
          additionalProperties: false,
        },
      },
      required: ["labels"],
      additionalProperties: false,
    },
    critical_error: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: { heading: { type: "string" } },
          required: ["heading"],
          additionalProperties: false,
        },
      },
      required: ["labels"],
      additionalProperties: false,
    },
  },
  required: [
    "labels", "run_diagnostics", "context", "domain_home_board",
    "live_progress", "summary", "agent_diagnostics", "board_error", "critical_error",
  ],
  additionalProperties: false,
} as const;

// ─── admin (domain_admin) ─────────────────────────────────────────────────────
// Source: DomainAdminFrameJson

export const adminFrameSchema = {
  type: "object",
  properties: {
    labels: {
      type: "object",
      properties: {
        frameTitle: { type: "string" },
        frameSubtitle: { type: "string" },
        backToCommons: { type: "string" },
        noDomainSelected: { type: "string" },
      },
      required: ["frameTitle", "frameSubtitle", "backToCommons", "noDomainSelected"],
      additionalProperties: false,
    },
    messaging: {
      type: "object",
      properties: {
        checkingAccess: { type: "string" },
        loadingDomain: { type: "string" },
        domainNotFound: { type: "string" },
        domainNotFoundDetail: { type: "string" },
        adminRequired: { type: "string" },
        adminRequiredDetail: { type: "string" },
      },
      required: [
        "checkingAccess", "loadingDomain", "domainNotFound",
        "domainNotFoundDetail", "adminRequired", "adminRequiredDetail",
      ],
      additionalProperties: false,
    },
    domain_manager: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: { heading: { type: "string" } },
          required: ["heading"],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: { description: { type: "string" } },
          required: ["description"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
    profile: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            fullName: { type: "string" },
            email: { type: "string" },
            saveButton: { type: "string" },
            savingButton: { type: "string" },
          },
          required: ["heading", "fullName", "email", "saveButton", "savingButton"],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: {
            description: { type: "string" },
            saveSuccess: { type: "string" },
            saveError: { type: "string" },
            saveErrorRetry: { type: "string" },
          },
          required: ["description", "saveSuccess", "saveError", "saveErrorRetry"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
    policy: {
      type: "object",
      properties: {
        labels: {
          type: "object",
          properties: {
            heading: { type: "string" },
            refreshButton: { type: "string" },
            saveButton: { type: "string" },
            savingButton: { type: "string" },
          },
          required: ["heading", "refreshButton", "saveButton", "savingButton"],
          additionalProperties: false,
        },
        messaging: {
          type: "object",
          properties: {
            description: { type: "string" },
            sourceMeta: { type: "string" },
            loadError: { type: "string" },
            saveError: { type: "string" },
            loading: { type: "string" },
          },
          required: ["description", "sourceMeta", "loadError", "saveError", "loading"],
          additionalProperties: false,
        },
      },
      required: ["labels", "messaging"],
      additionalProperties: false,
    },
  },
  required: ["labels", "messaging", "domain_manager", "profile", "policy"],
  additionalProperties: false,
} as const;

// ─── kip ──────────────────────────────────────────────────────────────────────
// Source: DomainFrameKip

export const kipFrameSchema = {
  type: "object",
  properties: {
    agent_id: { type: "string" },
    model: { type: "string" },
    visibility: { type: "string", enum: ["public", "private"] },
    greeting: { type: "string" },
    image_style: { type: "string" },
    image_model: { type: "string" },
  },
  required: ["agent_id", "model", "visibility", "greeting"],
  additionalProperties: false,
} as const;

// ─── feed ─────────────────────────────────────────────────────────────────────
// Source: FeedFrameJson

export const feedFrameSchema = {
  type: "object",
  properties: {
    frame_title: { type: "string" },
    frame_subtitle: { type: "string" },
    coming_soon_heading: { type: "string" },
    coming_soon_body: { type: "string" },
    cta_back_to_commons: { type: "string" },
  },
  required: ["frame_title", "frame_subtitle", "coming_soon_heading", "coming_soon_body", "cta_back_to_commons"],
  additionalProperties: false,
} as const;

// ─── keepers ──────────────────────────────────────────────────────────────────
// Source: KeepersFrameJson

export const keepersFrameSchema = {
  type: "object",
  properties: {
    frame_title: { type: "string" },
    frame_subtitle: { type: "string" },
    coming_soon_heading: { type: "string" },
    coming_soon_body: { type: "string" },
    cta_back_to_commons: { type: "string" },
  },
  required: ["frame_title", "frame_subtitle", "coming_soon_heading", "coming_soon_body", "cta_back_to_commons"],
  additionalProperties: false,
} as const;

// ─── profile ──────────────────────────────────────────────────────────────────
// Source: ProfileFrameJson

export const profileFrameSchema = {
  type: "object",
  properties: {
    frame_title: { type: "string" },
    frame_subtitle: { type: "string" },
    coming_soon_heading: { type: "string" },
    coming_soon_body: { type: "string" },
    cta_back_to_commons: { type: "string" },
  },
  required: ["frame_title", "frame_subtitle", "coming_soon_heading", "coming_soon_body", "cta_back_to_commons"],
  additionalProperties: false,
} as const;

// ─── Schema lookup map ────────────────────────────────────────────────────────
// Keys match V0FrameKey values as sent by the frontend.
// Frames with no JSON governance are explicitly null — Together AI is skipped.

export const FRAME_SCHEMA_MAP: Record<string, object | null> = {
  cover: coverFrameSchema,
  commons: commonsFrameSchema,
  moment: momentFrameSchema,
  moments: keptMomentsFrameSchema,
  journeys: journeysFrameSchema,
  agent: agentFrameSchema,
  diagnostics: diagnosticsFrameSchema,
  admin: adminFrameSchema,
  kip: kipFrameSchema,
  feed: feedFrameSchema,
  keepers: keepersFrameSchema,
  profile: profileFrameSchema,
  // Frames with no JSON governance — Together AI call is skipped
  index: null,
  present: null,
};
