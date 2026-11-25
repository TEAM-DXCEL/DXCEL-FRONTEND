import { appendSelectedDelta } from "./addition";
import { checkSummary, indexRuns, validateSelectedGroups } from "./selected-validation";
import type { BaselineCatalog, BaselineStat } from "./baseline-loader";
import type { RecordedMetricDefinition } from "./model";
import type { SourceMetric } from "./schema";

type MetricStatus = SourceMetric["status"] | "not_stored";

type Measurement = {
  key: string;
  value: number | null;
  status: MetricStatus;
  missing_reason: string | null;
  source_ref: { path: string; field: string | null } | null;
  valid_evaluation_replicates?: number | null;
  evaluation_replicate_values_missing_reason?: string | null;
};

type Summary = {
  key: string;
  mean: number | null;
  sample_sd: number | null;
  n_valid: number;
  n_expected: number;
  missing_reason: string | null;
  status?: MetricStatus;
  sample_sd_missing_reason?: string | null;
  generation_values: { generation_id: string; value: number | null }[];
};

type Run = {
  id: string;
  experiment_id: string;
  dataset: string;
  condition: string;
  condition_id?: string;
  arm_id?: string;
  decoder_id?: string | null;
  preprocessing_release_id?: string;
  preprocessing_source_experiment_id?: string;
  independent_across_conditions?: boolean;
  independence_limit?: string;
  repetition_index: number;
  source_run_id: string | null;
  source_run_id_missing_reason?: string | null;
  source_evaluation_run_id?: string | null;
  source_evaluation_run_id_missing_reason?: string | null;
  evaluation_attempt?: number | null;
  evaluation_attempt_missing_reason?: string | null;
  parent_generation_id?: string | null;
  counts_as_new_dp_generation?: boolean;
  post_processing_only?: boolean;
  parent_dp_generation_id: string;
  generation_status: string;
  synthetic_rows: number;
  evaluation_result_ref: string;
  dp: { epsilon_upper_bound?: number | null; delta?: number | null };
  metrics: Measurement[];
};

type ReplacementPair = {
  evaluation_group: string;
  baseline_id: string;
  dataset: string;
  status: string;
  directly_comparable: boolean;
  eligible_for_automatic_comparison?: boolean;
  conditions_checked: Record<string, boolean>;
  metric_scope_must_match: boolean;
  comparison_limits: string[];
  missing_reasons: string[];
  runtime_package_versions_missing_reason: string | null;
  metric_compatibility?: {
    key: string;
    reference_scope: RecordedMetricDefinition["reference_scope"];
    same_metric_definition: boolean;
    both_have_valid_values: boolean;
    directly_comparable: boolean;
    status: string;
    missing_reason: string | null;
  }[];
};

type Group = {
  id: string;
  experiment_id: string;
  dataset: string;
  condition: string;
  condition_id?: string;
  arm_id?: string;
  category: "official_baseline" | "selected_experiment" | "reference";
  display_name: string;
  setting_name: string;
  generation_condition_id: string;
  derived_condition_id: string;
  displayed_generation_n: number;
  generation_n_by_metric: Record<string, number>;
  decoder_id: string | null;
  reference_only: boolean;
  primary_condition?: boolean;
  include_in_overview?: boolean;
  official_baseline: boolean;
  summaries: Summary[];
  comparison_conditions: {
    split_id: string;
    evaluation_protocol: string;
    common_n: number;
  } & Record<string, unknown>;
};

type BaselineGroup = Group & {
  model: "aim" | "privpgd" | "tabpe";
  task: "classification" | "regression";
  main_comparison_excluded: boolean;
  exclusion_reason: string | null;
  runs: Run[];
  comparison_pairs: ReplacementPair[];
  native_utility_diagnostic_summaries?: Summary[];
};

type Bundle = {
  schema_version: 2;
  kind: string;
  metric_definitions: RecordedMetricDefinition[];
};

export type SelectedDelta = Bundle & {
  baseline_catalog_ref: string;
  baseline_catalog_sha256?: string;
  existing_evaluation_updates?: unknown[];
  existing_group_summary_updates?: unknown[];
  baseline_groups: unknown[];
  experiments: { id: string; type: string; display_name: string }[];
  evaluation_groups: (Group & { runs: string[] })[];
  generation_runs: Run[];
  official_baseline_comparison_pairs: ReplacementPair[];
  excluded_existing_conditions: {
    experiment_id: string;
    condition_id: string;
    source_group_ids: string[];
    action: string;
    source_deleted: boolean;
  }[];
};

function requireData(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`교체 데이터: ${message}`);
}

function parseBundle<T extends Bundle>(input: unknown, kind: T["kind"]) {
  requireData(typeof input === "object" && input !== null, "JSON 객체가 필요합니다.");
  const bundle = input as T;
  requireData(bundle.schema_version === 2 && bundle.kind === kind, "스키마 또는 유형이 다릅니다.");
  requireData(Array.isArray(bundle.metric_definitions), "지표 정의가 없습니다.");
  requireData(
    new Set(bundle.metric_definitions.map(({ key }) => key)).size ===
      bundle.metric_definitions.length,
    "지표 정의가 중복됩니다.",
  );
  return bundle;
}

export function replacementStatus(status: MetricStatus): SourceMetric["status"] {
  return status === "not_stored" ? "not_computed" : status;
}

export function isDirectReplacementPair(pair: ReplacementPair) {
  return (
    pair.directly_comparable === true &&
    pair.eligible_for_automatic_comparison !== false &&
    pair.status !== "비교 조건 확인 필요" &&
    pair.metric_scope_must_match === true &&
    [
      "same_dataset",
      "same_raw_split",
      "same_protocol",
      "same_common_n",
      "same_evaluation_seeds",
      "same_epsilon_delta_adjacency",
      "shared_evaluator_code_hashes_equal",
    ].every((key) => pair.conditions_checked[key] === true) &&
    pair.missing_reasons.length === 0
  );
}

export function isCompatibleReplacementMetric(
  pair: ReplacementPair,
  metric: RecordedMetricDefinition,
) {
  if (!isDirectReplacementPair(pair)) return false;
  // Earlier releases have pair-level evidence only. EXP-175 requires metric-level evidence.
  if (!pair.metric_compatibility) return !pair.evaluation_group.startsWith("EXP-175:");
  return pair.metric_compatibility.some(
    (entry) =>
      entry.key === metric.key &&
      entry.reference_scope === metric.reference_scope &&
      entry.same_metric_definition &&
      entry.both_have_valid_values &&
      entry.directly_comparable &&
      entry.status !== "비교 조건 확인 필요" &&
      entry.missing_reason === null,
  );
}

export function replacementPairLimits({
  comparison_limits,
  missing_reasons,
  runtime_package_versions_missing_reason,
}: ReplacementPair) {
  return runtime_package_versions_missing_reason
    ? [...comparison_limits, ...missing_reasons, runtime_package_versions_missing_reason]
    : [...comparison_limits, ...missing_reasons];
}

function adaptBaseSelectedDelta(input: unknown) {
  const source = parseBundle<SelectedDelta>(input, "selected_experiments_delta");
  requireData(
    source.baseline_catalog_ref === "dashboard-baselines.json" &&
      source.baseline_groups.length === 0,
    "공식 Baseline 카탈로그 연결이 다릅니다.",
  );
  const expectedConditions: Record<string, readonly [string, string | null]> = {
    "EXP-149": ["PT_UNIF", null],
    "EXP-124": ["BASE", null],
    "EXP-147": ["COVLATE", null],
    "EXP-153": ["AUTOLATE", null],
    "EXP-161": ["AMIX", "UNIF_REP"],
  };
  requireData(
    source.experiments.length === Object.keys(expectedConditions).length &&
      new Set(source.experiments.map(({ id }) => id)).size === source.experiments.length &&
      source.experiments.every(
        ({ id, type, display_name }) =>
          Object.hasOwn(expectedConditions, id) &&
          type === (id === "EXP-149" ? "reference" : "selected_experiment") &&
          display_name.trim().length > 0,
      ),
    "선정 실험의 ID, 분류 또는 표시명이 다릅니다.",
  );
  const groups = new Map(source.evaluation_groups.map((group) => [group.id, group]));
  const runs = new Map(source.generation_runs.map((run) => [run.id, run]));
  requireData(
    groups.size === source.evaluation_groups.length &&
      runs.size === source.generation_runs.length &&
      source.evaluation_groups.flatMap((group) => group.runs).length === runs.size,
    "선정 그룹이나 실행 ID가 중복됐습니다.",
  );
  for (const group of groups.values()) {
    const expected = expectedConditions[group.experiment_id];
    const isReference = group.experiment_id === "EXP-149";
    requireData(
      !group.official_baseline &&
        group.reference_only === isReference &&
        group.category === (isReference ? "reference" : "selected_experiment") &&
        expected?.[0] === group.condition &&
        expected[1] === group.decoder_id &&
        group.displayed_generation_n === 5 &&
        (group.experiment_id !== "EXP-161" ||
          (group.generation_condition_id === "AUTOLATE" &&
            group.derived_condition_id === "AMIX_UNIF")),
      `선정 실험 분류 또는 조건 오류 (${group.id}).`,
    );
  }
  validateSelectedGroups(source);
  const expectedExclusions = new Set([
    "EXP-131/AIM_QBIN",
    "EXP-132/AIM_ATOM_QBIN",
    "EXP-133/AIM_QBIN_COVERAGE",
    "EXP-136/AIM_QBIN_COVERAGE_SIGMA_DEFER",
    "EXP-136/AIM_QBIN_COVERAGE_SELECTION_DEFER",
    "EXP-139/AIM_ATOM_QBIN_COVERAGE_DEFER",
  ]);
  requireData(
    source.excluded_existing_conditions.length === expectedExclusions.size &&
      source.excluded_existing_conditions.every(
        (rule) =>
          rule.action === "exclude_from_selected_comparison_only" &&
          rule.source_deleted === false &&
          expectedExclusions.delete(`${rule.experiment_id}/${rule.condition_id}`),
      ),
    "지정한 여섯 조건만 선정 비교에서 제외할 수 있습니다.",
  );
  return source;
}

export function adaptSelectedDelta(input: unknown) {
  const source = parseBundle<SelectedDelta>(input, "selected_experiments_delta");
  const additions = new Set(["EXP-165", "EXP-175"]);
  const groupOwners = new Map(
    source.evaluation_groups.map(({ id, experiment_id }) => [id, experiment_id]),
  );
  const declared = new Set(source.experiments.map(({ id }) => id));
  requireData(
    declared.size === source.experiments.length &&
      source.evaluation_groups.every(({ experiment_id }) => declared.has(experiment_id)) &&
      source.generation_runs.every(({ experiment_id }) => declared.has(experiment_id)) &&
      source.official_baseline_comparison_pairs.every(({ evaluation_group }) =>
        groupOwners.has(evaluation_group),
      ),
    "실험 선언과 그룹·실행·비교 연결의 소속이 일치하지 않습니다.",
  );
  let result = adaptBaseSelectedDelta({
    ...source,
    experiments: source.experiments.filter(({ id }) => !additions.has(id)),
    evaluation_groups: source.evaluation_groups.filter(
      ({ experiment_id }) => !additions.has(experiment_id),
    ),
    generation_runs: source.generation_runs.filter(
      ({ experiment_id }) => !additions.has(experiment_id),
    ),
    official_baseline_comparison_pairs: source.official_baseline_comparison_pairs.filter(
      ({ evaluation_group }) => !additions.has(groupOwners.get(evaluation_group) ?? ""),
    ),
  });
  for (const id of additions) {
    if (!source.experiments.some((experiment) => experiment.id === id)) continue;
    result = appendSelectedDelta(result, {
      ...source,
      experiments: source.experiments.filter((experiment) => experiment.id === id),
      evaluation_groups: source.evaluation_groups.filter(
        ({ experiment_id }) => experiment_id === id,
      ),
      generation_runs: source.generation_runs.filter(({ experiment_id }) => experiment_id === id),
      official_baseline_comparison_pairs: source.official_baseline_comparison_pairs.filter(
        ({ evaluation_group }) => groupOwners.get(evaluation_group) === id,
      ),
      excluded_existing_conditions: [],
    });
  }
  return result;
}

export function buildReplacementBaseline(input: unknown, delta: SelectedDelta): BaselineCatalog {
  const bundle = parseBundle<
    Bundle & {
      baselines: BaselineGroup[];
      native_diagnostic_metric_definitions: { key: string; display_name: string }[];
    }
  >(input, "baseline_catalog");
  const expectedModels = {
    tabpe: ["EXP-162", "P20_CODEBOOK", null, 5],
    privpgd: ["EXP-159", "PRIVPGD", "UNIF", 3],
    aim: ["EXP-154", "AIM_EW", "UNIF", 3],
  } as const;
  const metricIdentity = (metric: RecordedMetricDefinition) =>
    JSON.stringify([
      metric.key,
      metric.axis,
      metric.unit,
      metric.direction,
      metric.target,
      metric.reference_scope,
      metric.attack ?? null,
      metric.statistic ?? null,
      metric.fpr ?? null,
      metric.tie_handling ?? null,
    ]);
  const selectedDefinitions = new Map(
    delta.metric_definitions.map((metric) => [metric.key, metricIdentity(metric)]),
  );
  requireData(
    bundle.metric_definitions.length === selectedDefinitions.size &&
      bundle.metric_definitions.every(
        (metric) => selectedDefinitions.get(metric.key) === metricIdentity(metric),
      ),
    "Baseline과 선정 실험의 지표 정의가 다릅니다.",
  );
  const groupIds = new Map(bundle.baselines.map((entry) => [entry.id, entry.dataset]));
  requireData(groupIds.size === bundle.baselines.length, "Baseline 그룹이 중복됩니다.");
  const selectedDatasets = new Map(delta.evaluation_groups.map(({ id, dataset }) => [id, dataset]));
  for (const pair of delta.official_baseline_comparison_pairs) {
    requireData(
      groupIds.get(pair.baseline_id) === pair.dataset &&
        selectedDatasets.get(pair.evaluation_group) === pair.dataset,
      "비교 근거가 다른 데이터셋 또는 카탈로그를 참조합니다.",
    );
  }
  const baselines = bundle.baselines.map((group) => {
    const expected = expectedModels[group.model];
    requireData(
      expected?.[0] === group.experiment_id &&
        expected[1] === group.condition &&
        expected[2] === group.decoder_id &&
        expected[3] === group.displayed_generation_n &&
        group.official_baseline &&
        group.category === "official_baseline" &&
        !group.main_comparison_excluded &&
        !group.exclusion_reason,
      `공식 Baseline 분류 오류 (${group.id}).`,
    );
    const indexed = indexRuns(group, group.runs);
    const sourcePaths: string[] = [];
    const stats = group.summaries.map((summary) => {
      checkSummary(group, summary, indexed);
      const metric = bundle.metric_definitions.find(({ key }) => key === summary.key)!;
      const comparisonKeys = delta.official_baseline_comparison_pairs
        .filter(
          (pair) => pair.baseline_id === group.id && isCompatibleReplacementMetric(pair, metric),
        )
        .map(({ evaluation_group }) => evaluation_group);
      return [
        summary.key,
        {
          mean: summary.mean,
          sampleSd: summary.sample_sd,
          n: summary.n_valid,
          expected: summary.n_expected,
          status: replacementStatus(summary.status ?? "missing_unknown"),
          missingReason: summary.missing_reason,
          sdMissingReason: summary.sample_sd_missing_reason ?? null,
          comparisonKeys,
          points: group.runs.map((run) => {
            const record = indexed.get(run.id)!.get(summary.key)!;
            const path = record.source_ref?.path ?? run.evaluation_result_ref;
            if (!sourcePaths.includes(path)) sourcePaths.push(path);
            return {
              seed: run.repetition_index,
              value: record.value,
              status: replacementStatus(record.status),
              missingReason: record.missing_reason,
              evaluationCount: record.valid_evaluation_replicates ?? null,
              evaluationMissingReason: record.evaluation_replicate_values_missing_reason ?? null,
              sourcePath: sourcePaths.indexOf(path),
              sourceField: record.source_ref?.field ?? null,
            };
          }),
        } satisfies BaselineStat,
      ] as const;
    });
    return {
      id: group.id,
      dataset: group.dataset,
      model: group.model,
      modelName: group.display_name,
      setting: group.setting_name,
      sourceExperiment: group.experiment_id,
      task: group.task,
      excluded: false,
      exclusionReason: null,
      protocol: group.comparison_conditions.evaluation_protocol,
      split: group.comparison_conditions.split_id,
      commonN: group.comparison_conditions.common_n,
      outputRows: [...new Set(group.runs.map((run) => run.synthetic_rows))],
      runs: Object.fromEntries(
        group.runs.map((run) => [
          run.repetition_index,
          {
            label: run.source_run_id ?? run.id,
            epsilon: run.dp.epsilon_upper_bound ?? null,
            delta: run.dp.delta ?? null,
          },
        ]),
      ),
      sourcePaths,
      metrics: Object.fromEntries(stats),
      displayedGenerationN: group.displayed_generation_n,
      comparisonLimits: [...new Set(group.comparison_pairs.flatMap(replacementPairLimits))],
      nativeDiagnostics: group.native_utility_diagnostic_summaries?.map((summary) => ({
        label:
          bundle.native_diagnostic_metric_definitions.find(({ key }) => key === summary.key)
            ?.display_name ?? summary.key,
        mean: summary.mean,
        sampleSd: summary.sample_sd,
        n: summary.n_valid,
        missingReason: summary.missing_reason,
      })),
    };
  });
  requireData(
    new Set(baselines.map(({ dataset, model }) => `${dataset}:${model}`)).size === 21 &&
      baselines.length === 21,
    "공식 Baseline 조합이 21개가 아닙니다.",
  );
  return {
    baselines,
    metrics: bundle.metric_definitions.map((metric) => ({
      ...metric,
      attack: metric.attack ?? null,
      statistic: metric.statistic ?? null,
      fpr: metric.fpr ?? null,
      tie_handling: metric.tie_handling ?? null,
      score_transform: metric.score_transform ?? null,
    })),
    runCount: bundle.baselines.reduce((count, group) => count + group.runs.length, 0),
    dashboardMismatch: false,
  };
}
