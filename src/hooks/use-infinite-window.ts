"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function useInfiniteWindow(total: number, chunk = 24) {
  const [limit, setLimit] = useState(chunk);
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstAddedRow = useRef<number | null>(null);
  const hasMore = limit < total;
  const loadMore = useCallback(
    () => setLimit((current) => Math.min(current + chunk, total)),
    [chunk, total],
  );
  function loadMoreWithFocus() {
    if (!hasMore) return;
    firstAddedRow.current = limit;
    loadMore();
  }

  useLayoutEffect(() => {
    const index = firstAddedRow.current;
    if (index === null) return;
    firstAddedRow.current = null;

    const root = rootRef.current;
    const row = root?.querySelectorAll("tbody > tr").item(index);
    const control = row?.querySelector<HTMLElement>(
      "input:not(:disabled), button:not(:disabled), summary",
    );
    (control ?? root)?.focus();
  }, [limit]);

  useEffect(() => {
    const root = rootRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !target.contains(document.activeElement) &&
          entries.some((entry) => entry.isIntersecting)
        ) {
          loadMore();
        }
      },
      { root, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, limit, loadMore]);
  return { rootRef, sentinelRef, limit: Math.min(limit, total), hasMore, loadMoreWithFocus };
}
