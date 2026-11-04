import type { ReactNode } from "react";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

export function DashboardShell({
  children,
  userArea,
}: {
  children: ReactNode;
  userArea?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only outline-none focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-tooltip) focus:rounded-control focus:bg-primary focus:p-control-inset focus:text-primary-foreground"
      >
        본문으로 이동
      </a>
      <DashboardSidebar />
      <div className="min-w-0 flex-1">
        <DashboardHeader userArea={userArea} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-page scroll-mt-header px-page-gutter py-page-block outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
