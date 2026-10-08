import { registerSW } from "virtual:pwa-register";

const UPDATE_CHECK_MS = 60_000

/** Ask the browser for a new service worker so an open Stage reloads onto the latest deploy. */
function watchForDeploy(registration: ServiceWorkerRegistration): void {
  const check = () => {
    void registration.update().catch(() => {})
  }
  check()
  window.setInterval(check, UPDATE_CHECK_MS)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check()
  })
}

export function registerKeeperPwa(): void {
  if (import.meta.env.DEV) return;

  registerSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) {
        console.info("[pwa] service worker registered");
        watchForDeploy(registration)
      }
    },
    onRegisterError(error) {
      console.warn("[pwa] service worker registration failed:", error);
    },
  });
}
