"use client";

import * as React from "react";
import { registerKeeperPwa } from "./registerPwa";
import { usePwaInstall } from "./usePwaInstall";
import type { PwaInstallState } from "./types";

const PwaInstallContext = React.createContext<PwaInstallState | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const installState = usePwaInstall();

  React.useEffect(() => {
    registerKeeperPwa();
  }, []);

  return (
    <PwaInstallContext.Provider value={installState}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstallContext(): PwaInstallState {
  const context = React.useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstallContext must be used within PwaProvider");
  }
  return context;
}
