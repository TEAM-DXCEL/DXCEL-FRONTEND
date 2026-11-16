import "server-only";

import { mean, sampleSd } from "@/lib/demo-research";
import type { RecordedDataset } from "./loader";
import type { RecordedMetricDefinition } from "./model";
import { readComparisonRelease } from "./comparison-release";
import { buildReplacementBaseline } from "./replacement";
import { readResearchArchive } from "./supabase-archive";
import {
  parseBaselines,
  type BaselineSource,
  type DashboardSource,
  type SourceEvaluation,
  type SourceMetric,
  type SourceRun,
} from "./schema";

type Entry = BaselineSource["baselines"][number];
type Run = Entry["runs"][number];
type Metric = Run["metrics"][number];

function requireBaseline(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function metricIdentity(metric: BaselineSource["metric_definitions"][number]) {
  const { key, axis, reference_scope, direction, unit, target } = metric;
  return JSON.stringify([key, axis, reference_scope, direction, unit, target]);
}

function definition(metric: Metric): RecordedMetricDefinition {
  const {
    key,
    display_name,
    axis,
    unit,
    direction,
    target,
    reference_scope,
    attack,
    statistic,
    fpr,
    tie_handling,
    score_transform,
  } = metric;
  return {
    key,
    display_name,
    axis,
    unit,
    direction,
    target,
    reference_scope,
    attack,
    statistic,
    fpr,
    tie_handling,
    score_transform,
  };
}

function includesEntries<T>(reference: Record<string, T>, current: Record<string, T>) {
  const entries = Object.entries(reference);
  return (
    entries.length > 0 &&
    entries.every(([key, value]) => JSON.stringify(value) === JSON.stringify(current[key]))
  );
}

function sameProtocol(entry: Entry, evaluation: SourceEvaluation) {
  const baseline = entry.evaluation_conditions;
  const split = evaluation.split[entry.dataset_id];
  return Boolean(
    split &&
    includesEntries(baseline.split.files, split.files) &&
    Object.keys(baseline.split.files).length === Object.keys(split.files).length &&
    baseline.protocol_sha256 === evaluation.protocol_sha256 &&
    baseline.protocol_changes_sha256 &&
    baseline.protocol_changes_sha256 === evaluation.protocol_changes_sha256 &&
    includesEntries(baseline.frozen_code_sha256, evaluation.code_sha256) &&
    includesEntries(baseline.evaluation_seeds, evaluation.evaluation_seeds),
  );
}

function sameMeasurement(
  entry: Entry,
  run: Run,
  reference: Metric,
  currentRun: SourceRun,
  current: SourceMetric,
  evaluation: SourceEvaluation,
) {
  const { dp } = currentRun;
  const baseline = entry.evaluation_conditions;
  return (
    run.generation_status === "passed" &&
    currentRun.status === "passed" &&
    currentRun.ownership_status !== "unresolved" &&
    dp.accounting_passed &&
    dp.source_formal_dp_claim === true &&
    run.dp.source_formal_dp_claim &&
    dp.scope === "fixed_generation_output_only_not_design_selection_or_joint_release" &&
    run.dp.scope ===
      "per_output_fixed_generation; joint disclosure and design selection excluded" &&
    dp.adjacency === run.dp.accounting.adjacency &&
    dp.epsilon_target === run.dp.epsilon_target &&
    dp.delta_target === run.dp.delta_target &&
    dp.delta_total === run.dp.accounting.delta_total &&
    dp.epsilon_total_recorded === run.dp.accounting.epsilon_total &&
    dp.epsilon_total_upper_bound !== null &&
    Math.abs(dp.epsilon_total_upper_bound - run.dp.accounting.epsilon_total) <= 1e-12 &&
    metricIdentity(reference) === metricIdentity(current) &&
    reference.attack === current.attack &&
    reference.statistic === current.statistic &&
    reference.fpr === current.fpr &&
    reference.tie_handling === current.tie_handling &&
    reference.score_transform === current.score_transform &&
    reference.aggregation === current.aggregation &&
    reference.reference_data === current.reference_data &&
    reference.reference_sample_rows !== null &&
    reference.reference_sample_rows === current.reference_sample_rows &&
    reference.synthetic_sample_rows !== null &&
    reference.synthetic_sample_rows === current.synthetic_sample_rows &&
    (reference.mia_member_query_rows ?? null) === current.mia_member_query_rows &&
    (reference.mia_nonmember_query_rows ?? null) === current.mia_nonmember_query_rows &&
    (reference.sampling ?? null) === current.sampling &&
    (reference.replicate_unit ?? null) === current.replicate_unit &&
    (reference.valid_replicate_count ?? reference.evaluation_replicate_count) ===
      current.valid_replicate_count &&
    (reference.reference_scope !== "common_n" ||
      (reference.common_n_satisfied === true &&
        current.common_n_satisfied === true &&
        Boolean(reference.sampling) &&
        reference.common_n_target === baseline.common_n &&
        current.common_n_target === baseline.common_n &&
        evaluation.common_n[entry.dataset_id] === baseline.common_n &&
        evaluation.planned_common_n_draws === baseline.common_n_draws)) &&
    (reference.reference_scope !== "official_sample" ||
      (baseline.official_wsd.target_included &&
        baseline.official_wsd.seed === evaluation.evaluation_seeds.official_wsd)) &&
    (reference.reference_scope !== "c2st_sample" ||
      baseline.c2st.feature_policy === "frozen EXP103 variant columns (may include target)")
  );
}

type ExperimentContext = { source: DashboardSource; data: RecordedDataset; sha256: string };

function closeTo(left: number | null, right: number | null) {
  return left === null || right === null ? left === right : Math.abs(left - right) <= 1e-12;
}

function buildBaselineCatalog(source: BaselineSource, context?: ExperimentContext) {
  const definitions = new Map(source.metric_definitions.map((metric) => [metric.key, metric]));
  const metrics = new Map<string, RecordedMetricDefinition>();
  const datasets = new Set(source.baselines.map((entry) => entry.dataset_id));
  const combinations = new Set(
    source.baselines.map((entry) => JSON.stringify([entry.dataset_id, entry.model])),
  );
  const runIds = new Set<string>();
  requireBaseline(
    source.baseline_count === source.baselines.length &&
      datasets.size === 7 &&
      combinations.size === datasets.size * 3 &&
      combinations.size === source.baselines.length &&
      new Set(source.baselines.map(({ id }) => id)).size === source.baselines.length &&
      definitions.size === source.metric_definitions.length,
    "Baseline 조합 또는 지표 정의의 수가 일치하지 않습니다.",
  );
  const canCompare = context?.sha256 === source.main_dashboard_sha256;
  const experimentRuns = new Map(context?.source.generation_runs.map((run) => [run.id, run]));
  const evaluations = new Map(
    context?.source.evaluations.map((evaluation) => [evaluation.id, evaluation]),
  );

  const baselines = source.baselines.map((entry) => {
    const {
      id,
      dataset_id,
      model,
      model_name,
      setting_name,
      source_experiment_id,
      task,
      main_comparison_excluded,
      exclusion_reason,
      evaluation_conditions,
    } = entry;
    requireBaseline(
      entry.generation_repetitions_expected === 3 &&
        entry.runs.length === entry.generation_repetitions_expected &&
        new Set(entry.runs.map(({ repetition_index }) => repetition_index)).size ===
          entry.runs.length &&
        new Set(entry.runs.map(({ seed }) => seed)).size === entry.runs.length &&
        main_comparison_excluded === Boolean(exclusion_reason),
      "Baseline 생성 반복 또는 제외 사유가 일치하지 않습니다.",
    );
    const runs = entry.runs.map((run) => {
      const byMetric = new Map(run.metrics.map((metric) => [metric.key, metric]));
      requireBaseline(
        !runIds.has(run.id) &&
          byMetric.size === run.metrics.length &&
          byMetric.size === entry.summaries.length,
        "Baseline 실행 ID 또는 실행별 지표가 중복됐거나 누락됐습니다.",
      );
      runIds.add(run.id);
      return { run, byMetric };
    });
    const candidates =
      canCompare && !main_comparison_excluded
        ? (context?.data.conditions.filter((condition) => condition.dataset === dataset_id) ?? [])
        : [];

    const sourcePaths = new Map<string, number>();
    const stats = entry.summaries.map((summary) => {
      const expected = definitions.get(summary.key);
      requireBaseline(
        expected &&
          metricIdentity(expected) === metricIdentity(summary) &&
          summary.n_expected === runs.length &&
          summary.generation_values.length === runs.length &&
          new Set(summary.generation_values.map(({ generation_id }) => generation_id)).size ===
            runs.length,
        "Baseline 요약 지표 정의 또는 생성 반복 수가 일치하지 않습니다.",
      );
      const points = runs.map(({ run, byMetric }) => {
        const metric = byMetric.get(summary.key);
        const value = summary.generation_values.find(
          ({ generation_id }) => generation_id === run.id,
        );
        requireBaseline(
          metric &&
            metricIdentity(metric) === metricIdentity(summary) &&
            value?.seed === run.seed &&
            value.value === metric.value &&
            value.status === metric.status &&
            (metric.status === "measured") === (metric.value !== null),
          "Baseline 원본 지표와 요약에 기록된 생성 반복이 일치하지 않습니다.",
        );
        if (!metrics.has(metric.key)) metrics.set(metric.key, definition(metric));
        const path = metric.source_ref.path;
        const pathIndex = sourcePaths.get(path) ?? sourcePaths.size;
        sourcePaths.set(path, pathIndex);
        return {
          run,
          metric,
          point: {
            seed: run.seed,
            value: metric.value,
            status: metric.status,
            missingReason: metric.missing_reason,
            evaluationCount:
              metric.evaluation_replicate_count ?? metric.valid_replicate_count ?? null,
            evaluationMissingReason: metric.replicate_values_missing_reason ?? null,
            sourcePath: pathIndex,
            sourceField: metric.source_ref.field ?? null,
          },
        };
      });
      const measured = points.filter(({ metric }) => metric.value !== null);
      const values = measured.map(({ metric }) => metric.value!);
      requireBaseline(
        values.length === summary.n_valid &&
          (summary.status === "measured") === values.length > 0 &&
          closeTo(summary.mean, values.length ? mean(values) : null) &&
          closeTo(summary.sample_sd, values.length > 1 ? sampleSd(values) : null),
        "Baseline 평균 또는 표본 표준편차가 원본 생성 반복과 일치하지 않습니다.",
      );

      const comparisonKeys = new Set<string>();
      for (const condition of candidates) {
        const key = condition.metrics[summary.key]?.comparisonKey;
        if (!key || !measured.length || comparisonKeys.has(key)) continue;
        const compatible = condition.runIds.every((runId) => {
          const currentRun = experimentRuns.get(runId)!;
          const metric = currentRun.metrics.find(({ key }) => key === summary.key);
          if (!metric || metric.value === null) return true;
          const evaluation = evaluations.get(currentRun.evaluation_id)!;
          return (
            sameProtocol(entry, evaluation) &&
            measured.every(({ run, metric: reference }) =>
              sameMeasurement(entry, run, reference, currentRun, metric, evaluation),
            )
          );
        });
        if (compatible) comparisonKeys.add(key);
      }

      return [
        summary.key,
        {
          mean: summary.mean,
          sampleSd: summary.sample_sd,
          n: summary.n_valid,
          expected: summary.n_expected,
          missingReason: summary.missing_reason,
          status: summary.status,
          sdMissingReason: summary.sample_sd_missing_reason,
          comparisonKeys: [...comparisonKeys],
          points: points.map(({ point }) => point),
        },
      ] as const;
    });
    requireBaseline(
      new Set(stats.map(([key]) => key)).size === stats.length,
      "Baseline 지표 요약이 중복됐습니다.",
    );

    return {
      id,
      dataset: dataset_id,
      model,
      modelName: model_name,
      setting: setting_name,
      sourceExperiment: source_experiment_id,
      task,
      excluded: main_comparison_excluded,
      exclusionReason: exclusion_reason,
      protocol: evaluation_conditions.protocol_id,
      split: evaluation_conditions.split.id,
      commonN: evaluation_conditions.common_n,
      outputRows: [...new Set(entry.runs.map(({ synthetic_rows }) => synthetic_rows))],
      runs: Object.fromEntries(
        entry.runs.map((run) => [
          run.seed,
          {
            label: run.source_run_id,
            epsilon: run.dp.accounting.epsilon_total,
            delta: run.dp.accounting.delta_total,
          },
        ]),
      ),
      sourcePaths: [...sourcePaths.keys()],
      metrics: Object.fromEntries(stats),
    };
  });

  requireBaseline(runIds.size === 63, "Baseline 생성 반복이 63개가 아닙니다.");
  return {
    baselines,
    metrics: [...metrics.values()],
    runCount: runIds.size,
    dashboardMismatch: Boolean(context && !canCompare),
  };
}

type LegacyCatalog = ReturnType<typeof buildBaselineCatalog>;
export type RecordedBaseline = Omit<
  LegacyCatalog["baselines"][number],
  "setting" | "sourceExperiment" | "runs"
> & {
  setting: string;
  sourceExperiment: string;
  runs: Record<number, { label: string; epsilon: number | null; delta: number | null }>;
  displayedGenerationN?: number;
  comparisonLimits?: string[];
  nativeDiagnostics?: {
    label: string;
    mean: number | null;
    sampleSd: number | null;
    n: number;
    missingReason: string | null;
  }[];
};
export type BaselineCatalog = Omit<LegacyCatalog, "baselines"> & { baselines: RecordedBaseline[] };
export type BaselineStat = RecordedBaseline["metrics"][string];

export async function loadBaselineCatalog(context?: ExperimentContext) {
  if (process.env.NODE_ENV === "production" && !process.env.DXCEL_TEAM_PASSWORD) {
    return { status: "disabled" } as const;
  }
  try {
    const release = await readComparisonRelease();
    if (release) {
      return {
        status: "ready",
        data: buildReplacementBaseline(release.baseline, release.delta),
      } as const;
    }
    const archive = await readResearchArchive("dashboard-baselines.json.gz");
    if (archive === null) return { status: "missing" } as const;
    const catalog: BaselineCatalog = buildBaselineCatalog(
      parseBaselines(JSON.parse(archive.toString("utf8"))),
      context,
    );
    return {
      status: "ready",
      data: catalog,
    } as const;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return { status: "missing" } as const;
    return {
      status: "invalid",
      message: error instanceof Error ? error.message : "Baseline 기록을 읽을 수 없습니다.",
    } as const;
  }
}
