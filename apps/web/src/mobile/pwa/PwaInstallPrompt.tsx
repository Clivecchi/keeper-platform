"use client";

import * as React from "react";
import { usePwaInstallContext } from "./PwaProvider";

export interface PwaInstallPromptProps {
  /** When false, the banner stays hidden even if install is available. */
  open?: boolean;
  title?: string;
  description?: string;
}

export function PwaInstallPrompt({
  open = true,
  title = "Install Keeper",
  description = "Add Keeper to your home screen for quick access to your world.",
}: PwaInstallPromptProps) {
  const { canInstall, isInstalled, isIosSafari, promptInstall, dismissPrompt } = usePwaInstallContext();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!open || isInstalled) {
      setVisible(false);
      return;
    }
    setVisible(canInstall || isIosSafari);
  }, [open, canInstall, isInstalled, isIosSafari]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (isIosSafari) {
      dismissPrompt();
      return;
    }
    await promptInstall();
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[120] rounded-2xl border px-4 py-3 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
      style={{
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
          <p className="mt-1 text-xs opacity-80">
            {isIosSafari
              ? "Tap Share, then Add to Home Screen to install Keeper."
              : description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-md px-2 py-1 text-xs opacity-70 transition-opacity hover:opacity-100"
          >
            Not now
          </button>
          {!isIosSafari && (
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: "hsl(var(--theme-ink-primary, 20 14% 14%))",
                color: "hsl(var(--theme-surface-page, 40 20% 97%))",
              }}
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
