import "server-only";

import { cache } from "react";
import { adaptSelectedDelta } from "./replacement";
import {
  localReplacementDirectory,
  readLocalReplacement,
  readLocalSelectedDelta,
} from "./replacement-local";
import { createResearchClient } from "./supabase-archive";

export const readComparisonRelease = cache(async () => {
  if (localReplacementDirectory()) {
    const [baseline, delta] = await Promise.all([
      readLocalReplacement("dashboard-baselines.json"),
      readLocalSelectedDelta(),
    ]);
    return { source: "local", baseline, delta } as const;
  }

  const client = await createResearchClient();
  if (!client) return null;

  const { data, error } = await client
    .rpc("read_dashboard_comparison_release", {}, { get: true })
    .abortSignal(AbortSignal.timeout(15_000));
  if (error?.code === "PGRST202") return null;
  if (error) throw new Error("Supabase에서 새 비교 데이터를 읽을 수 없습니다.");
  if (data === null) return null;
  if (typeof data !== "object" || !("baseline_catalog" in data) || !("selected_delta" in data)) {
    throw new Error("Supabase 비교 데이터 형식이 올바르지 않습니다.");
  }
  return {
    source: "supabase",
    baseline: data.baseline_catalog as unknown,
    delta: adaptSelectedDelta(data.selected_delta),
  } as const;
});
