# IDE Board Components

## 📌 Purpose
IDE Board-specific UI pieces mounted inside the Universal Board shell — notably the Composer Service Bar.

## 🧱 Key Files
- `IntegratedServicesBar.tsx` — Composer footer: **Tools** (Cloud, Rendr — invoke agents) and **Services** (Railway, Vercel, GitHub — open Chronicle integrations).

## 🔄 Data & Behavior
- Rendered by `KeeperDialogFrame` when `def.conversation.showServiceBar` is true (IDE Board only).
- `onToolInvoke` shifts the Dialog to the Cloud or Rendr agent via `UniversalConversation`.
- `onOpen` opens the integrations panel in Chronicle (`UniversalViewPanel` → `ServicesFrame`).

## ⚠️ Notes & ToDo
- [ ] Wire live connection status for Railway, Vercel, GitHub chips.

## 📆 Update Log

### 2026-06-17 — Dialog column alignment
- Inner row uses `.dialog-column` so Tools/Services align with composer and message stream (replaces `max-w-3xl`).

### 2026-05-23 — Gate 2: Tools in Composer
- Split bar into Tools (Cloud, Rendr — pill chips, invokable) and Services (Railway, Vercel, GitHub — status dots, navigational).
- Removed Cloud from Services row; Cloud is Tools-only per Gate 2 spec.
