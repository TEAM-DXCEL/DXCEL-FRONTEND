"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentPropsWithRef, ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import { Field, controlClasses, controlSizes, useFieldIds, type FieldProps } from "./field";
import { useThemeScope } from "./theme-scope";

export const selectOptionClasses =
  "flex min-h-control-md items-center justify-between gap-control-gap rounded-control px-control-inset py-1 text-body outline-none select-none";
export const selectPanelClasses =
  "z-(--z-popover) overflow-hidden rounded-card border-thin border-border bg-surface text-foreground shadow-dropdown outline-none";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type TriggerProps = ComponentPropsWithRef<typeof SelectPrimitive.Trigger>;
export type SelectProps = Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "children"> &
  FieldProps &
  Pick<
    TriggerProps,
    | "id"
    | "className"
    | "ref"
    | "aria-describedby"
    | "aria-invalid"
    | "aria-label"
    | "aria-labelledby"
    | "onBlur"
    | "onFocus"
    | "onKeyDown"
    | "autoFocus"
  > & {
    options: readonly SelectOption[];
    placeholder?: string;
  };

export function Select({
  label,
  description,
  error,
  id,
  className,
  fieldClassName,
  controlSize = "md",
  options,
  placeholder = "선택하세요",
  ref,
  onBlur,
  onFocus,
  onKeyDown,
  autoFocus,
  "aria-describedby": externalDescription,
  "aria-invalid": invalid,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  ...props
}: SelectProps) {
  const ids = useFieldIds(id, description, error, externalDescription);
  const theme = useThemeScope();
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
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          id={ids.controlId}
          ref={ref}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : invalid}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          className={cx(
            controlClasses,
            controlSizes[controlSize],
            "flex items-center justify-between gap-control-gap text-left data-[placeholder]:text-foreground-subtle data-[state=open]:bg-control-focus",
            className,
          )}
        >
          <span className="min-w-0 truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            <svg
              className="size-icon-sm shrink-0 text-foreground-subtle"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            data-theme={theme}
            position="popper"
            align="start"
            aria-label={ariaLabel ?? label}
            aria-labelledby={labelledBy}
            className={cx(
              selectPanelClasses,
              "my-select-sheet-gap w-(--radix-select-trigger-width)",
            )}
          >
            <SelectPrimitive.Viewport className="max-h-[min(var(--spacing-select-list-max),max(0px,calc(var(--radix-select-content-available-height)-var(--spacing-select-sheet-gap)*2-var(--border-width-default)*2)))] space-y-select-item-gap p-select-inset">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  textValue={option.label}
                  className={cx(
                    selectOptionClasses,
                    "cursor-default [&>:first-child]:min-w-0 [&>:first-child]:wrap-anywhere data-[state=checked]:bg-select-selected data-[state=checked]:text-select-selected-foreground data-[highlighted]:bg-control-focus data-[disabled]:pointer-events-none data-[disabled]:text-disabled-foreground",
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="shrink-0">
                    <svg
                      className="size-icon-sm shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </Field>
  );
}
