# 🧬 Prisma Model Reference README

---

## 🌟 Purpose

This document tracks and explains all current `schema.prisma` models and fields in the Keeper platform. It acts as a cross-reference hub between Prisma definitions and functional module usage (e.g., KAM, MediaFrame, StudioModules).

This README will evolve alongside development and act as a foundational link between:

* Prisma schema structure
* Real usage across folders
* Cursor’s AI modeling and inference logic

---

## 🗂️ Model Overview and Usage

| Model                | Purpose Summary                               | Usage Status | Linked Folder(s)               | Notes                                    |
| -------------------- | --------------------------------------------- | ------------ | ------------------------------ | ---------------------------------------- |
| `User`               | Core system account object                    | ✅ Confirmed  | `/kam`                         | Used in sign-in logic and token storage  |
| `UserSettings`       | Theme + system preferences                    | ✅ Confirmed  | `/kam/settings`                | Stores themeMode, respects system theme  |
| `Theme`              | Stores full visual theming config             | ✅ Confirmed  | `/kam/settings`, `/mediaframe` | Used in user onboarding, keeper creation |
| `Keeper`             | Canonical container for paths, journeys, etc. | ✅ Confirmed  | `/studio`, `/moment`           | Linked to `Theme`, tracks revisions      |
| `Journey`            | Structured storytelling layer                 | ✅ Confirmed  | `/journey`                     | Linked to Keeper and Theme               |
| `Path`               | Sub-layer of Journey                          | ✅ Confirmed  | `/journey`                     | Each Moment links to a Path or Journey   |
| `Moment`             | Core storytelling/content node                | ✅ Confirmed  | `/moment`                      | Connects Path/Journey/Theme              |
| `EngagementTemplate` | Reusable interaction formats                  | ✅ Confirmed  | `/interaction-content`         | Connects to styles, config, fields       |
| `FrameConfig`        | Theme-aware frame layout presets              | ✅ Confirmed  | `/frame`                       | Holds layout-level visuals               |
| `FrameContent`       | Specific audio/image/video content            | ✅ Confirmed  | `/frame`                       | Tracks current/playlist association      |
| `FrameInstance`      | Frame instance binding entity to config       | ✅ Confirmed  | `/frame`                       | Links entity to frame config and content|

---

## 🧱 Architectural Guidance for Prisma

* 📌 **Model Names**: Always PascalCase (e.g., `UserSettings`, `FrameConfig`)
* 🏷 **Field Names**: snake\_case in database (`created_at`), camelCase in Prisma (`createdAt`)
* ✅ **Prefer `@db.Uuid` over `String` for foreign keys** unless explicitly using cuid()
* 📌 **Always include**: `createdAt`, `updatedAt` for versionable records
* 🔄 **One source of truth**: Prisma models should reflect *actual usage* not just future plans

---

## 📘 Schema Validation Targets

We will begin by validating the following models:

* [ ] Engagement: usage across comments or reactions?
* [ ] KeeperMapping: does this support Kip memory only?
* [ ] SharedContent: is this used in any current modules?

---

## ⚠️ Work In Progress

* [ ] Full Phase 1 audit of `schema.prisma`
* [ ] Reference tagging within existing folders
* [ ] Cursor prompt training to link model ↔ folder
* [ ] Theme ID consistency: used in `UserSettings`, `Keeper`, etc.

---

## ✍️ Authorship

Created collaboratively by Keeper platform architecture and Kip. Maintained as a living, versioned document in tandem with `schema.prisma` updates.

All changes to Prisma models should be reflected in this README or flagged for clarification.
