"use client";

import { useId, type ReactNode } from "react";
import { cx } from "../../lib/cx";

export type FieldProps = {
  label: string;
  description?: string;
  error?: string;
  fieldClassName?: string;
  controlSize?: "sm" | "md" | "lg";
};

export const controlClasses =
  "w-full min-w-0 rounded-control border-thin border-border-strong bg-surface px-control-inset text-body text-foreground placeholder:text-foreground-subtle transition-colors duration-(--duration-fast) outline-none focus:bg-control-focus aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground";
export const controlSizes = {
  sm: "min-h-control-sm py-0.5",
  md: "min-h-control-md py-1",
  lg: "min-h-control-lg py-2",
};

export function useFieldIds(
  id?: string,
  description?: string,
  error?: string,
  externalDescription?: string,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [externalDescription, description && descriptionId, error && errorId]
      .filter(Boolean)
      .join(" ") || undefined;
  return { controlId, descriptionId, errorId, describedBy };
}

export function Field({
  label,
  description,
  error,
  disabled,
  required,
  className,
  children,
  ids,
}: Omit<FieldProps, "controlSize" | "fieldClassName"> & {
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
  ids: ReturnType<typeof useFieldIds>;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-2", className)}>
      <label
        htmlFor={ids.controlId}
        className={cx("text-label", disabled ? "text-disabled-foreground" : "text-foreground")}
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {description && (
        <p id={ids.descriptionId} className="text-meta text-foreground-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={ids.errorId} className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
