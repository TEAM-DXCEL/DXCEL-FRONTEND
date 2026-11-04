import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";

export type BadgeProps = ComponentPropsWithRef<"span"> & {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
};

const tones = {
  neutral: "border-border bg-surface-muted text-foreground-muted",
  primary: "border-primary-border bg-primary-subtle text-primary-text",
  success: "border-success-border bg-success-subtle text-success",
  warning: "border-warning-border bg-warning-subtle text-warning",
  danger: "border-danger-border bg-danger-subtle text-danger",
  info: "border-info-border bg-info-subtle text-info",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(
        "inline-flex items-center gap-1 rounded-badge border-thin px-2 py-1 text-caption",
        tones[tone],
        className,
      )}
    />
  );
}
