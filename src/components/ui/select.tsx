"use client";

import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";
import { Field, controlClasses, controlSizes, useFieldIds, type FieldProps } from "./field";

export type SelectProps = ComponentPropsWithRef<"select"> & FieldProps;

export function Select({
  label,
  description,
  error,
  id,
  className,
  fieldClassName,
  controlSize = "md",
  "aria-describedby": externalDescription,
  "aria-invalid": invalid,
  ...props
}: SelectProps) {
  const ids = useFieldIds(id, description, error, externalDescription);
  return (
    <Field
      label={label}
      description={description}
      error={error}
      disabled={props.disabled}
      required={props.required}
      ids={ids}
      className={fieldClassName}
    >
      <select
        {...props}
        id={ids.controlId}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : invalid}
        className={cx(controlClasses, controlSizes[controlSize], className)}
      />
    </Field>
  );
}
