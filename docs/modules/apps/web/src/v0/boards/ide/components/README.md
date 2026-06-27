# IDE Board Components

## 📌 Purpose
IDE Board-specific UI pieces mounted inside the Universal Board shell — notably the Composer Service Bar.

## 🧱 Key Files
- `IntegratedServicesBar.tsx` — Composer footer (left): **Tools** (Cloud, Rendr — invoke agents) and **Services** (Railway, Vercel, GitHub — open Chronicle integrations). Pairs with `ComposerDebugToolbar` on the right via `.dialog-composer-footer` in `KeeperDialogFrame`.

## 🔄 Data & Behavior
- Rendered inside `.dialog-composer-footer` when `def.conversation.showServiceBar` is true (IDE Board only). Debug icon (`ComposerDebugToolbar`) sits on the right of the same footer at all times in dialog mode.
- `onToolInvoke` shifts the Dialog to the Cloud or Rendr agent via `UniversalConversation`.
- `onOpen` opens the integrations panel in Chronicle (`UniversalViewPanel` → `ServicesFrame`).

## ⚠️ Notes & ToDo
- [ ] Wire live connection status for Railway, Vercel, GitHub chips.

## 📆 Update Log

### 2026-06-27 — Debug always visible
- `ComposerDebugToolbar` no longer gated on agent working state; footer shows in all dialog modes.

### 2026-06-27 — Composer footer layout
- Left-aligned Tools/Services only; top border moved to `.dialog-composer-footer` wrapper. Debug control lives in `ComposerDebugToolbar` (right).

### 2026-06-17 — Dialog column alignment
- Inner row uses `.dialog-column` so Tools/Services align with composer and message stream (replaces `max-w-3xl`).

### 2026-05-23 — Gate 2: Tools in Composer
- Split bar into Tools (Cloud, Rendr — pill chips, invokable) and Services (Railway, Vercel, GitHub — status dots, navigational).
- Removed Cloud from Services row; Cloud is Tools-only per Gate 2 spec.
