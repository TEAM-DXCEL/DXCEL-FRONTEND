export const dashboardNavigation = [
  { href: "/overview", label: "Overview", icon: "overview" },
  { href: "/experiments", label: "실험", icon: "experiments" },
  { href: "/compare", label: "비교", icon: "compare" },
  { href: "/diagnostics", label: "진단", icon: "experiments" },
  { href: "/baselines", label: "Baseline", icon: "baseline" },
] as const;

export type NavigationIcon = (typeof dashboardNavigation)[number]["icon"];

export function activeNavigation(pathname: string) {
  const path = pathname === "/" ? "/overview" : pathname;
  return dashboardNavigation.find(({ href }) => path === href || path.startsWith(`${href}/`));
}
