"use client";

export interface MobileHeaderProps {
  title: string;
  subtitle?: string;
}

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
  return (
    <header
      className="shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
        backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))",
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        My World
      </p>
      <h1
        className="mt-1 text-lg font-medium"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className="mt-1 text-xs"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
