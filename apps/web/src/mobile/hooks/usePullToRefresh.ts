import * as React from "react";

export interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  thresholdPx?: number;
}

export function usePullToRefresh({
  onRefresh,
  disabled = false,
  thresholdPx = 72,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = React.useCallback(
    (event: React.TouchEvent) => {
      if (disabled || isRefreshing || startYRef.current === null) return;
      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const delta = Math.max(0, currentY - startYRef.current);
      setPullDistance(Math.min(delta, thresholdPx * 1.5));
    },
    [disabled, isRefreshing, thresholdPx],
  );

  const handleTouchEnd = React.useCallback(async () => {
    if (disabled || isRefreshing) return;
    const shouldRefresh = pullDistance >= thresholdPx;
    startYRef.current = null;
    setPullDistance(0);
    if (!shouldRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance, thresholdPx]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: () => {
        void handleTouchEnd();
      },
    },
  };
}
