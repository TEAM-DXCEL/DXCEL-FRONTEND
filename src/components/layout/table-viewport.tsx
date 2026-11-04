import type { ReactNode } from "react";

export function TableViewport({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="isolate max-h-table-region-max w-full overflow-auto rounded-card border-thin border-border outline-none focus-visible:bg-surface-muted"
    >
      {children}
    </div>
  );
}
