"use client";

import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";
import { Field, controlClasses, controlSizes, useFieldIds, type FieldProps } from "./field";

export type InputProps = Omit<ComponentPropsWithRef<"input">, "children" | "type"> &
  FieldProps & {
    type?:
      | "text"
      | "search"
      | "email"
      | "password"
      | "number"
      | "url"
      | "tel"
      | "date"
      | "datetime-local"
      | "time";
  };

export function Input({
  label,
  description,
  error,
  id,
  className,
  fieldClassName,
  controlSize = "md",
  type = "text",
  "aria-describedby": externalDescription,
  "aria-invalid": invalid,
  ...props
}: InputProps) {
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
      <input
        {...props}
        id={ids.controlId}
        type={type}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : invalid}
        className={cx(controlClasses, controlSizes[controlSize], className)}
      />
    </Field>
  );
}
