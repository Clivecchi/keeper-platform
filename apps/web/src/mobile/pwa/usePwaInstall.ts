import * as React from "react";
import type { BeforeInstallPromptEvent, PwaInstallState } from "./types";
import { PWA_DISMISS_STORAGE_KEY } from "./types";

const DISMISS_DAYS = 14;

function readDismissedUntil(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PWA_DISMISS_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeDismissedUntil(untilMs: number) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PWA_DISMISS_STORAGE_KEY, String(untilMs));
  } catch {
    /* ignore */
  }
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function usePwaInstall(): PwaInstallState {
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(() => detectStandalone());
  const [isIosSafari] = React.useState(() => detectIosSafari());
  const [isPromptDismissed, setIsPromptDismissed] = React.useState(
    () => readDismissedUntil() > Date.now(),
  );

  React.useEffect(() => {
    const dismissedUntil = readDismissedUntil();
    if (dismissedUntil > Date.now()) {
      setCanInstall(false);
      setIsPromptDismissed(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      if (readDismissedUntil() <= Date.now()) {
        setCanInstall(true);
      }
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return "unavailable";

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }

    return choice.outcome;
  }, []);

  const dismissPrompt = React.useCallback(() => {
    setCanInstall(false);
    setIsPromptDismissed(true);
    writeDismissedUntil(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000);
  }, []);

  return {
    canInstall,
    isInstalled,
    isIosSafari,
    isPromptDismissed,
    promptInstall,
    dismissPrompt,
  };
}
