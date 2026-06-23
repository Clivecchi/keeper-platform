import { registerSW } from "virtual:pwa-register";

export function registerKeeperPwa(): void {
  if (import.meta.env.DEV) return;

  registerSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) {
        console.info("[pwa] service worker registered");
      }
    },
    onRegisterError(error) {
      console.warn("[pwa] service worker registration failed:", error);
    },
  });
}
