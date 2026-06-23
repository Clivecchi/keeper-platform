"use client";

import type { MobileTabId } from "../types";

const TABS: Array<{ id: MobileTabId; label: string }> = [
  { id: "world", label: "World" },
  { id: "keep", label: "Keep" },
  { id: "journeys", label: "Journeys" },
  { id: "kip", label: "Kip" },
];

export interface MobileTabBarProps {
  activeTab: MobileTabId;
  onTabChange: (tab: MobileTabId) => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="shrink-0 border-t px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        backgroundColor: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
      }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4 gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="rounded-xl px-1 py-2.5 text-[11px] font-medium transition-colors"
              style={{
                color: isActive
                  ? "hsl(var(--theme-ink-primary, 20 14% 14%))"
                  : "hsl(var(--theme-ink-secondary, 0 0% 45%))",
                backgroundColor: isActive
                  ? "hsl(var(--theme-surface-panel, 0 0% 96%))"
                  : "transparent",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
