import type { ReactNode } from "react";
import { ThemeScope } from "@/components/ui/theme-scope";

export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading-lg">{title}</h1>
        {description && (
          <p className="max-w-reading text-body text-foreground-muted">{description}</p>
        )}
      </header>
      <ThemeScope theme="light" className="min-w-0">
        {children}
      </ThemeScope>
    </div>
  );
}
