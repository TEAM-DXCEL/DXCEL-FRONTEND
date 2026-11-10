import "server-only";

import { createResearchClient } from "./supabase-archive";
import type { RecordedCondition, RecordedStat } from "./loader";
import type { RecordedMetricDefinition } from "./model";

export type SupabaseComparisonRun = {
  condition: Omit<RecordedCondition, "phase" | "experimentId"> & {
    phase: null;
    experimentId: string;
  };
  metrics: { definition: RecordedMetricDefinition; stat: RecordedStat; reason: string | null }[];
  repetition: number;
  attempt: number;
  commonN: number;
};

type Definition = {
  displayName: string;
  unit: string;
  direction: RecordedMetricDefinition["direction"];
  target: number | null;
  scope: RecordedMetricDefinition["reference_scope"];
  attack?: RecordedMetricDefinition["attack"];
  statistic?: RecordedMetricDefinition["statistic"];
  fpr?: number | null;
  tieHandling?: string;
};

type ComparisonRunResponse = {
  id: string;
  experimentNumber: number;
  dataset: string;
  arm: string;
  repetition: number;
  attempt: number;
  commonN: number;
  metrics: {
    key: string;
    definition: Definition;
    state: "measured" | "missing" | "error" | null;
    value: number | null;
    reason: string | null;
  }[];
};

export async function loadSupabaseComparisonRun() {
  const id = process.env.DXCEL_COMPARISON_RUN_ID;
  const supabase = createResearchClient();
  if (!supabase || !id) return null;

  const { data: response, error } = await supabase
    .rpc("read_comparison_run", { p_run_id: id })
    .abortSignal(AbortSignal.timeout(8_000));
  const data = response as ComparisonRunResponse | null;
  if (error || !data || !Array.isArray(data.metrics) || !data.metrics.length) {
    throw new Error("Supabase에서 지정된 실행 또는 지표를 읽을 수 없습니다.");
  }
  const metrics = data.metrics.map(({ key, definition: metric, state, value, reason }) => {
    const status =
      state === "measured"
        ? "measured"
        : state === "error"
          ? "failed"
          : reason === "not_applicable" || reason === "not_computed"
            ? reason
            : "missing_unknown";
    const definition: RecordedMetricDefinition = {
      key,
      display_name: metric.displayName,
      axis: metric.attack ? "privacy" : /^(xgb|rf)_/.test(key) ? "utility" : "fidelity",
      unit: metric.unit,
      direction: metric.direction,
      target: metric.target,
      reference_scope: metric.scope,
      attack: metric.attack ?? null,
      statistic: metric.statistic ?? null,
      fpr: metric.fpr ?? null,
      tie_handling: metric.tieHandling ?? null,
      score_transform: null,
    };
    const stat: RecordedStat = {
      mean: value,
      sampleSd: null,
      n: value === null ? 0 : 1,
      statuses: [status],
      comparisonKey: null,
      summarySource: null,
      summaryKey: null,
    };
    return { definition, stat, reason };
  });

  return {
    condition: {
      id: data.id,
      experimentId: `EXP-${data.experimentNumber}`,
      phase: null,
      dataset: data.dataset,
      condition: data.arm,
      label: "Supabase",
      outputRows: [],
      runIds: [data.id],
      metrics: Object.fromEntries(metrics.map(({ definition, stat }) => [definition.key, stat])),
    },
    metrics,
    repetition: data.repetition,
    attempt: data.attempt,
    commonN: data.commonN,
  } satisfies SupabaseComparisonRun;
}
