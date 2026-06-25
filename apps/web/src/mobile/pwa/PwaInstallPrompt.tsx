"use client";

import * as React from "react";
import { usePwaInstallContext } from "./PwaProvider";

export interface PwaInstallPromptProps {
  /** When false, the banner stays hidden even if install is available. */
  open?: boolean;
  title?: string;
  description?: string;
}

function detectAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function PwaInstallPrompt({
  open = true,
  title = "Install Keeper",
  description = "Add Keeper to your home screen for quick access to your world.",
}: PwaInstallPromptProps) {
  const { canInstall, isInstalled, isIosSafari, isPromptDismissed, promptInstall, dismissPrompt } =
    usePwaInstallContext();
  const [visible, setVisible] = React.useState(false);
  const isAndroid = React.useMemo(() => detectAndroid(), []);

  React.useEffect(() => {
    if (!open || isInstalled || isPromptDismissed) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [open, isInstalled, isPromptDismissed]);

  if (!visible) return null;

  const installHint = isIosSafari
    ? "Tap Share, then Add to Home Screen."
    : isAndroid
      ? "Open Chrome menu (⋮) → Install app, or Add to Home screen."
      : description;

  const handleInstall = async () => {
    if (isIosSafari || (!canInstall && isAndroid)) {
      dismissPrompt();
      return;
    }
    await promptInstall();
    setVisible(false);
  };

  return (
    <div
      className="mobile-pwa-install-prompt fixed inset-x-3 z-[120] rounded-2xl border px-4 py-3 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
      style={{
        bottom: "calc(var(--mobile-tab-bar-height, 3.75rem) + max(0.75rem, env(safe-area-inset-bottom)) + 0.5rem)",
        backgroundColor: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
        borderColor: "hsl(var(--theme-border-soft, 0 0% 90%))",
        color: "hsl(var(--theme-ink-primary, 0 0% 9%))",
      }}
      role="region"
      aria-label="Install Keeper app"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs opacity-80">{installHint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-md px-2 py-1 text-xs opacity-70 transition-opacity hover:opacity-100"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: "hsl(var(--theme-ink-primary, 20 14% 14%))",
              color: "hsl(var(--theme-surface-page, 40 20% 97%))",
            }}
          >
            {canInstall ? "Install" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
