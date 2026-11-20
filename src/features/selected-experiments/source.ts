import "server-only";

import { cache } from "react";
import { readComparisonRelease } from "@/features/recorded-comparison/comparison-release";
import { createResearchClient } from "@/features/recorded-comparison/supabase-archive";
import type { RecordedMetricDefinition } from "@/features/recorded-comparison/model";
import {
  type adaptSelectedDelta,
  replacementPairLimits,
  isDirectReplacementPair,
  replacementStatus,
} from "@/features/recorded-comparison/replacement";
import {
  localReplacementDirectory,
  readLocalOriginal,
} from "@/features/recorded-comparison/replacement-local";
import type { RecordedStat } from "@/features/recorded-comparison/loader";

import type { ExperimentListRow } from "@/features/experiments/types";
import { localAdditionDirectory } from "@/features/recorded-comparison/addition-local";

type SelectedEvaluations = {
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
    display_name?: string;
    displayed_generation_n?: number;
    reference_only?: boolean;
    primary_condition?: boolean;
    include_in_overview?: boolean;
    decoder_id?: string | null;
    generation_condition_id?: string;
    derived_condition_id?: string;
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
    source_run_id: string | null;
    source_run_id_missing_reason?: string | null;
    parent_dp_generation_id?: string;
    parent_generation_id?: string | null;
    counts_as_new_dp_generation?: boolean;
    post_processing_only?: boolean;
    repetition_index: number;
    generation_status: string;
    metrics: {
      key: string;
      state: RecordedStat["statuses"][number];
      value: number | null;
      reason: string | null;
      evaluationCount?: number | null;
      evaluationMissingReason?: string | null;
    }[];
  }[];
  comparison_pairs: { lhs: string; rhs: string; status: string }[];
  official_baseline_comparison_pairs: {
    evaluation_group: string;
    baseline_id: string;
    status: string;
    comparable?: boolean;
    limits?: string[];
  }[];
  excludedGroupIds?: Set<string>;
};

type ArchivedExperiment = Pick<
  SelectedEvaluations,
  | "metric_definitions"
  | "evaluation_groups"
  | "generation_runs"
  | "comparison_pairs"
  | "official_baseline_comparison_pairs"
> & { experiment: SelectedEvaluations["experiments"][number] };

function independentParentCount(runs: SelectedEvaluations["generation_runs"]) {
  if (!runs.length || !runs.every((run) => run.counts_as_new_dp_generation !== undefined))
    return undefined;
  return new Set(runs.map((run) => run.parent_dp_generation_id)).size;
}

function mergeSelectedDelta(
  legacy: SelectedEvaluations,
  delta: ReturnType<typeof adaptSelectedDelta>,
): SelectedEvaluations {
  const excludedGroupIds = new Set([
    ...(legacy.excludedGroupIds ?? []),
    ...legacy.evaluation_groups
      .filter((group) =>
        delta.excluded_existing_conditions.some(
          (rule) =>
            rule.experiment_id === group.experiment_id && rule.condition_id === group.condition,
        ),
      )
      .map(({ id }) => id),
  ]);
  const declared = new Set([
    ...(legacy.excludedGroupIds ?? []),
    ...delta.excluded_existing_conditions.flatMap(({ source_group_ids }) => source_group_ids),
  ]);
  if (
    declared.size !== excludedGroupIds.size ||
    [...declared].some((id) => !excludedGroupIds.has(id))
  ) {
    throw new Error("선정 비교 제외 조건과 기존 그룹 ID가 일치하지 않습니다.");
  }
  const evaluation_groups = [...legacy.evaluation_groups, ...delta.evaluation_groups];
  const generation_runs = [
    ...legacy.generation_runs,
    ...delta.generation_runs.map((run) => ({
      ...run,
      metrics: run.metrics.map((metric) => ({
        key: metric.key,
        value: metric.value,
        state: replacementStatus(metric.status),
        reason: metric.missing_reason,
        evaluationCount: metric.valid_evaluation_replicates,
        evaluationMissingReason: metric.evaluation_replicate_values_missing_reason,
      })),
    })),
  ];
  if (
    new Set(evaluation_groups.map(({ id }) => id)).size !== evaluation_groups.length ||
    new Set(generation_runs.map(({ id }) => id)).size !== generation_runs.length ||
    delta.experiments.some(({ id }) => legacy.experiments.some((entry) => entry.id === id))
  ) {
    throw new Error("추가 실험이 기존 실험 또는 실행 ID와 중복됩니다.");
  }
  return {
    experiments: [
      ...legacy.experiments,
      ...delta.experiments.map(({ id, type, display_name }) => ({
        id,
        type: type === "selected_experiment" ? "evaluation" : type,
        flow: { purpose: display_name, direct_previous_experiment: null },
      })),
    ],
    metric_definitions: [
      ...new Map(
        [...legacy.metric_definitions, ...delta.metric_definitions].map(
          (metric) => [metric.key, metric] as const,
        ),
      ).values(),
    ],
    evaluation_groups,
    generation_runs,
    comparison_pairs: legacy.comparison_pairs,
    official_baseline_comparison_pairs: delta.official_baseline_comparison_pairs.map((pair) => ({
      evaluation_group: pair.evaluation_group,
      baseline_id: pair.baseline_id,
      status: pair.status,
      comparable: isDirectReplacementPair(pair),
      limits: replacementPairLimits(pair),
    })),
    excludedGroupIds,
  };
}

const loadSelectedEvaluations = cache(async (): Promise<SelectedEvaluations | null> => {
  if (localReplacementDirectory()) {
    const [original, release] = await Promise.all([
      readLocalOriginal("selected_experiments.json"),
      readComparisonRelease(),
    ]);
    const legacy = JSON.parse(original.toString("utf8")) as SelectedEvaluations & {
      schema_version: number;
    };
    if (legacy.schema_version !== 1 || !release)
      throw new Error("기존 선정 실험과 교체 데이터의 버전을 확인할 수 없습니다.");
    return mergeSelectedDelta(legacy, release.delta);
  }
  const client = await createResearchClient();
  if (!client) return null;

  const [{ data, error }, release] = await Promise.all([
    client.rpc("read_selected_evaluations", {}, { get: true }),
    readComparisonRelease(),
  ]);
  if (error) throw new Error("선정 실험 결과를 불러올 수 없습니다.");
  const archive = data as ArchivedExperiment[];
  if (!archive.length && !release) return null;

  const legacy: SelectedEvaluations = {
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
  return release ? mergeSelectedDelta(legacy, release.delta) : legacy;
});

export async function loadSelectedPerformance() {
  const data = await loadSelectedEvaluations();
  if (!data) return null;
  const selectedIds = new Set(
    data.experiments
      .filter(({ type }) => type === "evaluation" || type === "reference")
      .map(({ id }) => id),
  );
  const runsById = new Map(data.generation_runs.map((run) => [run.id, run]));
  const metricKeys = new Set(data.metric_definitions.map(({ key }) => key));
  const groups = data.evaluation_groups
    .filter(
      ({ id, experiment_id }) => selectedIds.has(experiment_id) && !data.excludedGroupIds?.has(id),
    )
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
              comparisonKey:
                group.display_name && !group.reference_only && group.primary_condition !== false
                  ? group.id
                  : null,
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
          label: group.display_name ?? group.condition,
          displayedGenerationN: group.displayed_generation_n,
          referenceOnly: group.reference_only,
          primaryCondition: group.primary_condition,
          includeInOverview: group.include_in_overview,
          independentParentCount: independentParentCount(runs),
          comparisonEvidence: data.official_baseline_comparison_pairs
            .filter((pair) => pair.evaluation_group === group.id)
            .map(({ baseline_id, status, comparable, limits }) => ({
              baselineId: baseline_id,
              status,
              comparable,
              limits,
            })),
          outputRows: [],
          runIds: group.runs,
          metrics,
        },
        comparisonConditions: group.display_name
          ? {
              조건: group.condition,
              생성_arm: group.generation_condition_id,
              decoder: group.decoder_id,
              표_별칭: group.derived_condition_id,
              주_조건: group.primary_condition,
              Overview_포함: group.include_in_overview,
              ...group.comparison_conditions,
            }
          : group.comparison_conditions,
        summaries: Object.fromEntries(
          group.summaries.map(({ key, missing_reason }) => [key, missing_reason]),
        ),
      };
    });
  const runIds = groups.flatMap(({ condition }) => condition.runIds);
  if (new Set(runIds).size !== runIds.length) throw new Error("중복된 생성 실행이 있습니다.");
  return {
    groups,
    generationCounts: data.experiments.flatMap(({ id }) => {
      const runs = data.generation_runs.filter((run) => run.experiment_id === id);
      const independentParents = independentParentCount(runs);
      if (independentParents === undefined) return [];
      return [
        {
          experimentId: id,
          independentParents,
          outputs: runs.length,
        },
      ];
    }),
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
            source_run_id_missing_reason: run.source_run_id_missing_reason,
            parent_dp_generation_id: run.parent_dp_generation_id,
            parent_generation_id: run.parent_generation_id,
            counts_as_new_dp_generation: run.counts_as_new_dp_generation,
            post_processing_only: run.post_processing_only,
            repetition_index: run.repetition_index,
            metrics: run.metrics.map(
              ({ key, value, state, reason, evaluationCount, evaluationMissingReason }) => ({
                key,
                value,
                state,
                reason,
                evaluationCount,
                evaluationMissingReason,
              }),
            ),
          },
        ];
      }),
    ),
    comparisons: data.comparison_pairs.filter(
      ({ lhs, rhs }) => !data.excludedGroupIds?.has(lhs) && !data.excludedGroupIds?.has(rhs),
    ),
  };
}

export type SelectedPerformance = NonNullable<Awaited<ReturnType<typeof loadSelectedPerformance>>>;

export async function loadSelectedExperimentRows(): Promise<ExperimentListRow[]> {
  const data = await loadSelectedEvaluations();
  if (!data) return [];

  const runsById = new Map(data.generation_runs.map((run) => [run.id, run]));
  return data.experiments
    .filter(({ type }) => type === "evaluation" || type === "reference")
    .map(({ id, flow, performer }) => {
      const groups = data.evaluation_groups.filter((group) => group.experiment_id === id);
      const runIds = new Set(groups.flatMap((group) => group.runs));
      const outputRuns = [...runIds].map((id) => runsById.get(id)!);
      const independentParents = independentParentCount(outputRuns);
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
        runCount: independentParents ?? runIds.size,
        reusedCount: null,
        version: null,
        changes: null,
        searchNote: groups.map(({ dataset, condition }) => `${dataset} ${condition}`).join(" "),
        details: [
          [
            "출처",
            localReplacementDirectory() || localAdditionDirectory()
              ? "운영 기록과 로컬 추가 데이터"
              : "선정 실험 · Supabase",
          ],
          ["이전 실험", flow.direct_previous_experiment],
          ["평가 그룹", `${groups.length}개`],
          ...(independentParents !== undefined
            ? [
                ["독립 DP 부모", `${independentParents}개`] as const,
                ["복원 출력·평가", `${outputRuns.length}개`] as const,
              ]
            : []),
        ],
      };
    });
}
