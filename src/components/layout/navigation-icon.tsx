import type { NavigationIcon as NavigationIconName } from "./navigation";

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  return (
    <svg
      className="size-icon-md shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "overview" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === "experiments" && (
        <>
          <path d="M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10" />
        </>
      )}
      {name === "compare" && (
        <>
          <path d="M4 20V10M12 20V4M20 20v-7M2 20h20" />
        </>
      )}
      {name === "baseline" && (
        <>
          <path d="M5 21V3m0 1h14l-3 5 3 5H5" />
        </>
      )}
    </svg>
  );
}
