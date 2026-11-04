"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { activeNavigation } from "./navigation";

export function DashboardHeader({ userArea }: { userArea?: ReactNode }) {
  const page = activeNavigation(usePathname());
  return (
    <header className="sticky top-0 z-(--z-sticky) flex min-h-header items-center justify-between gap-panel-gap border-b-(length:--border-width-default) border-border bg-background px-page-gutter">
      <div className="flex min-w-0 items-center gap-control-inset text-meta">
        <span className="shrink-0 text-foreground-subtle">DXCEL</span>
        <span aria-hidden="true" className="text-foreground-subtle">
          /
        </span>
        <span className="truncate text-foreground">{page?.label ?? "워크스페이스"}</span>
      </div>
      <div className="flex shrink-0 items-center gap-control-gap">
        {userArea ?? <span className="text-caption text-foreground-subtle">팀 워크스페이스</span>}
      </div>
    </header>
  );
}
