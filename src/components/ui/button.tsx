"use client";

import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  loading?: boolean;
  loadingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  controlSize?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "border-transparent bg-primary text-primary-foreground enabled:hover:bg-primary-hover enabled:active:bg-primary-active",
  secondary: "border-border-strong bg-surface text-foreground enabled:hover:bg-surface-hover",
  ghost: "border-transparent bg-transparent text-foreground enabled:hover:bg-surface-hover",
  danger:
    "border-transparent bg-danger text-danger-foreground enabled:hover:bg-danger-hover enabled:active:bg-danger-active",
};

export function Button({
  children,
  loading = false,
  loadingLabel = "처리 중…",
  disabled,
  type = "button",
  variant = "primary",
  controlSize = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-control-gap rounded-control border-thin px-control-inset py-1 text-label transition-colors duration-(--duration-fast) focus-visible:focus-outline disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground",
        { sm: "min-h-control-sm", md: "min-h-control-md", lg: "min-h-control-lg" }[controlSize],
        variants[variant],
        className,
      )}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
