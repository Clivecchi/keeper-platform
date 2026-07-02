"use client";

import type { MobileTabId } from "../types";

const DOMAIN_TABS: MobileTabId[] = ["realm", "world", "moment", "journeys", "kip"];
const IN_REALM_TABS: MobileTabId[] = ["world", "moment", "journeys", "kip"];

const DEFAULT_TAB_LABELS: Record<MobileTabId, string> = {
  realm: "Realm",
  world: "World",
  moment: "Moment",
  journeys: "Journeys",
  kip: "Kip",
};

export interface MobileTabBarProps {
  activeTab: MobileTabId;
  onTabChange: (tab: MobileTabId) => void;
  tabLabels?: Partial<Record<MobileTabId, string>>;
  /** When true (in-realm Domain Screen), hide the cross-realm picker tab. */
  inRealmBoard?: boolean;
}

export function MobileTabBar({
  activeTab,
  onTabChange,
  tabLabels,
  inRealmBoard = false,
}: MobileTabBarProps) {
  const tabIds = inRealmBoard ? IN_REALM_TABS : DOMAIN_TABS;
  const tabs = tabIds.map((id) => ({
    id,
    label: tabLabels?.[id] ?? DEFAULT_TAB_LABELS[id],
  }));

  return (
    <nav
      className="shrink-0 border-t px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        backgroundColor: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
      }}
      aria-label="Mobile navigation"
    >
      <div
        className={`grid gap-0.5 ${inRealmBoard ? "grid-cols-4" : "grid-cols-5"}`}
      >
        {tabs.map((tab) => {
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
