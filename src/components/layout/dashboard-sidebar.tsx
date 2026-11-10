"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { activeNavigation, dashboardNavigation } from "./navigation";
import { NavigationIcon } from "./navigation-icon";
import { WorkspaceBrand } from "./workspace-brand";

export function DashboardSidebar() {
  const active = activeNavigation(usePathname());
  return (
    <aside className="sticky top-0 flex h-dvh w-sidebar-rail shrink-0 flex-col border-r-(length:--border-width-default) border-border bg-surface desktop:w-sidebar">
      <Link
        href="/overview"
        aria-label="DXCEL 개요로 이동"
        className="flex min-h-header shrink-0 items-center justify-center text-foreground outline-none focus-visible:bg-surface-hover desktop:justify-start desktop:px-6"
      >
        <WorkspaceBrand />
      </Link>
      <nav
        aria-label="주 메뉴"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-panel-gap desktop:px-3"
      >
        <ul className="flex flex-col gap-2">
          {dashboardNavigation
            .filter(
              (item) => item.href !== "/diagnostics" || process.env.NODE_ENV === "development",
            )
            .map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active?.href === item.href ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={cx(
                    "flex min-h-control-lg items-center justify-center gap-control-inset rounded-control px-control-inset text-body font-medium outline-none transition-colors duration-(--duration-fast) hover:bg-surface-hover focus-visible:bg-surface-hover desktop:justify-start",
                    active?.href === item.href
                      ? "bg-primary-subtle text-primary-text"
                      : "text-foreground-muted",
                  )}
                >
                  <NavigationIcon name={item.icon} />
                  <span className="hidden desktop:inline">{item.label}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      {process.env.NODE_ENV === "development" && (
        <div className="border-t-(length:--border-width-default) border-border p-2 desktop:p-3">
          <Link
            href="/ui-preview"
            aria-label="컴포넌트 미리보기"
            title="컴포넌트 미리보기"
            className="flex min-h-control-md items-center justify-center rounded-control text-caption text-foreground-subtle outline-none hover:bg-surface-hover focus-visible:bg-surface-hover desktop:justify-start desktop:px-control-inset"
          >
            <span className="desktop:hidden">UI</span>
            <span className="hidden desktop:inline">컴포넌트 미리보기 ↗</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
