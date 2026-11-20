"use client";

import { useEffect, useRef } from "react";

export function useDismissibleDetails() {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && !event.composedPath().includes(details)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key === "Escape" && !event.defaultPrevented && details?.open) {
        event.preventDefault();
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return ref;
}
