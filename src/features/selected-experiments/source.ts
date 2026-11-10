import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import { createResearchClient } from "@/features/recorded-comparison/supabase-archive";
import type { RecordedMetricDefinition } from "@/features/recorded-comparison/model";
import type { RecordedStat } from "@/features/recorded-comparison/loader";

import type { ExperimentListRow } from "@/features/experiments/types";

type Evidence = { path: string; field?: string };
type Observation = Record<string, string | number | boolean | null>;
type SelectedExport = {
  schema_version: number;
  kind: string;
  experiment_order: string[];
  experiments: {
    id: string;
    type: string;
    flow: { purpose: string; direct_previous_experiment: string | null };
    performer?: string | null;
  }[];
  metric_definitions: RecordedMetricDefinition[];
  evaluation_groups: {
    id: string;
    experiment_id: string;
    dataset: string;
    condition: string;
    runs: string[];
    comparison_conditions: Record<string, unknown>;
    summaries: {
      key: string;
      mean: number | null;
      sample_sd: number | null;
      n_valid: number;
      missing_reason: string | null;
    }[];
  }[];
  generation_runs: {
    id: string;
    experiment_id: string;
    dataset: string;
    condition: string;
    source_run_id: string;
    repetition_index: number;
    generation_status: string;
    metrics: {
      key: string;
      state: RecordedStat["statuses"][number];
      value: number | null;
      reason: string | null;
    }[];
  }[];
  comparison_pairs: { lhs: string; rhs: string; status: string }[];
  official_baseline_comparison_pairs: {
    evaluation_group: string;
    baseline_id: string;
    status: string;
  }[];
  diagnostics: {
    experiment_id: string;
    limitation: string;
    additional_limits: string[];
    tables: { name: string; records: { observation: Observation; source: Evidence }[] }[];
  }[];
};

export const loadSelectedExport = cache(async () => {
  if (process.env.NODE_ENV !== "development") return null;
  try {
    const raw = await readFile(join(process.cwd(), ".local", "selected_experiments.json"), "utf8");
    const data = JSON.parse(raw) as SelectedExport;
    if (data.schema_version !== 1 || data.kind !== "selected_research_import_review_only") {
      throw new Error("지원하지 않는 선정 실험 파일입니다.");
    }
    return data;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
});

type ArchivedExperiment = Pick<
  SelectedExport,
  | "metric_definitions"
  | "evaluation_groups"
  | "generation_runs"
  | "comparison_pairs"
  | "official_baseline_comparison_pairs"
> & { experiment: SelectedExport["experiments"][number] };

const loadSelectedEvaluations = cache(async () => {
  const client = await createResearchClient();
  if (!client) return null;

  const { data, error } = await client.rpc("read_selected_evaluations");
  if (error) throw new Error("선정 실험 결과를 불러올 수 없습니다.");
  const archive = data as ArchivedExperiment[];
  if (!archive.length) return null;

  return {
    experiments: archive.map(({ experiment }) => experiment),
    metric_definitions: [
      ...new Map(
        archive.flatMap(({ metric_definitions }) =>
          metric_definitions.map((metric) => [metric.key, metric] as const),
        ),
      ).values(),
    ],
    evaluation_groups: archive.flatMap((entry) => entry.evaluation_groups),
    generation_runs: archive.flatMap((entry) => entry.generation_runs),
    comparison_pairs: archive.flatMap((entry) => entry.comparison_pairs),
    official_baseline_comparison_pairs: archive.flatMap(
      (entry) => entry.official_baseline_comparison_pairs,
    ),
  };
});

export async function loadSelectedPerformance() {
  const data = await loadSelectedEvaluations();
  if (!data) return null;
  const selectedIds = new Set(
    data.experiments.filter(({ type }) => type === "evaluation").map(({ id }) => id),
  );
  const runsById = new Map(data.generation_runs.map((run) => [run.id, run]));
  const metricKeys = new Set(data.metric_definitions.map(({ key }) => key));
  const groups = data.evaluation_groups
    .filter(({ experiment_id }) => selectedIds.has(experiment_id))
    .map((group) => {
      const runs = group.runs.map((id) => {
        const run = runsById.get(id);
        if (
          !run ||
          run.experiment_id !== group.experiment_id ||
          run.dataset !== group.dataset ||
          run.condition !== group.condition
        ) {
          throw new Error("선정 실험과 생성 실행의 연결을 확인할 수 없습니다.");
        }
        return run;
      });
      const metrics = Object.fromEntries(
        group.summaries.map((summary) => {
          const entries = runs.map((run) => run.metrics.find(({ key }) => key === summary.key));
          if (!metricKeys.has(summary.key) || entries.some((entry) => !entry)) {
            throw new Error("선정 실험의 지표와 실행을 연결할 수 없습니다.");
          }
          return [
            summary.key,
            {
              mean: summary.mean,
              sampleSd: summary.sample_sd,
              n: summary.n_valid,
              statuses: [...new Set(entries.flatMap((entry) => (entry ? [entry.state] : [])))],
              comparisonKey: null,
              summarySource: null,
              summaryKey: null,
            } satisfies RecordedStat,
          ];
        }),
      );
      return {
        condition: {
          id: group.id,
          experimentId: group.experiment_id,
          phase: null,
          dataset: group.dataset,
          condition: group.condition,
          label: group.condition,
          outputRows: [],
          runIds: group.runs,
          metrics,
        },
        comparisonConditions: group.comparison_conditions,
        summaries: Object.fromEntries(
          group.summaries.map(({ key, missing_reason }) => [key, missing_reason]),
        ),
      };
    });
  const runIds = groups.flatMap(({ condition }) => condition.runIds);
  if (new Set(runIds).size !== runIds.length) throw new Error("중복된 생성 실행이 있습니다.");
  return {
    experimentCount: selectedIds.size,
    groups,
    metrics: data.metric_definitions.map((metric): RecordedMetricDefinition => ({
      key: metric.key,
      display_name: metric.display_name,
      axis: metric.axis,
      unit: metric.unit,
      direction: metric.direction,
      target: metric.target,
      reference_scope: metric.reference_scope,
      attack: metric.attack ?? null,
      statistic: metric.statistic ?? null,
      fpr: metric.fpr ?? null,
      tie_handling: metric.tie_handling ?? null,
      score_transform: metric.score_transform ?? null,
    })),
    runs: Object.fromEntries(
      runIds.map((id) => {
        const run = runsById.get(id)!;
        return [
          id,
          {
            source_run_id: run.source_run_id,
            repetition_index: run.repetition_index,
            metrics: run.metrics.map(({ key, value, state, reason }) => ({
              key,
              value,
              state,
              reason,
            })),
          },
        ];
      }),
    ),
    comparisons: data.comparison_pairs,
    baselineComparisons: data.official_baseline_comparison_pairs,
  };
}

export type SelectedPerformance = NonNullable<Awaited<ReturnType<typeof loadSelectedPerformance>>>;

export async function loadSelectedExperimentRows(): Promise<ExperimentListRow[]> {
  const data = await loadSelectedEvaluations();
  if (!data) return [];

  const runsById = new Map(data.generation_runs.map((run) => [run.id, run]));
  return data.experiments
    .filter(({ type }) => type === "evaluation")
    .map(({ id, flow, performer }) => {
      const groups = data.evaluation_groups.filter((group) => group.experiment_id === id);
      const runIds = new Set(groups.flatMap((group) => group.runs));
      const allPassed =
        runIds.size > 0 &&
        [...runIds].every((runId) => {
          const run = runsById.get(runId);
          return run?.experiment_id === id && run.generation_status === "passed";
        });
      return {
        id,
        code: id,
        number: Number(id.replace(/^EXP-/, "")),
        title: flow.purpose,
        owner: performer ?? null,
        updatedAt: null,
        status: allPassed ? "succeeded" : "unknown",
        runCount: runIds.size,
        reusedCount: null,
        version: null,
        changes: null,
        searchNote: groups.map(({ dataset, condition }) => `${dataset} ${condition}`).join(" "),
        details: [
          ["출처", "선정 실험 · Supabase"],
          ["이전 실험", flow.direct_previous_experiment],
          ["평가 그룹", `${groups.length}개`],
        ],
      };
    });
}
