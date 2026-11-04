import type { ComponentPropsWithRef } from "react";
import { cx } from "../../lib/cx";

export function Card({ className, ...props }: ComponentPropsWithRef<"section">) {
  return (
    <section
      {...props}
      className={cx(
        "flex min-w-0 flex-col gap-panel-gap rounded-card border-thin border-border bg-surface p-card-inset text-foreground shadow-card",
        className,
      )}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={cx("flex flex-col gap-2", className)} />;
}

export function CardTitle({
  as: Tag = "h2",
  className,
  ...props
}: ComponentPropsWithRef<"h2"> & { as?: "h2" | "h3" | "h4" }) {
  return <Tag {...props} className={cx("text-heading-sm", className)} />;
}

export function CardDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={cx("text-body text-foreground-muted", className)} />;
}

export function CardContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={cx("min-w-0", className)} />;
}
