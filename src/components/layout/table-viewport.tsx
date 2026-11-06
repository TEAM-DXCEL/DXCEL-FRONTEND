import type { ReactNode, Ref } from "react";

export function TableViewport({
  label,
  children,
  ref,
}: {
  label: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="isolate max-h-table-region-max w-full overflow-auto rounded-card border-thin border-border outline-none focus-visible:bg-surface-muted"
    >
      {children}
    </div>
  );
}
