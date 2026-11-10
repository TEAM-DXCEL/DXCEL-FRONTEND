type Reader<T> = (value: unknown, at: string) => T;
type Shape = Record<string, Reader<unknown>>;

function invalid(at: string, expected: string): never {
  throw new Error(`${at}: ${expected}`);
}

function record(value: unknown, at: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid(at, "객체가 필요합니다.");
  }
  return value as Record<string, unknown>;
}

function object<S extends Shape>(shape: S): Reader<{ [K in keyof S]: ReturnType<S[K]> }> {
  return (value, at) => {
    const input = record(value, at);
    return Object.fromEntries(
      Object.entries(shape).map(([key, read]) => [key, read(input[key], `${at}.${key}`)]),
    ) as { [K in keyof S]: ReturnType<S[K]> };
  };
}

function array<T>(read: Reader<T>): Reader<T[]> {
  return (value, at) => {
    if (!Array.isArray(value)) return invalid(at, "배열이 필요합니다.");
    return value.map((item, index) => read(item, `${at}[${index}]`));
  };
}

function dictionary<T>(read: Reader<T>): Reader<Record<string, T>> {
  return (value, at) =>
    Object.fromEntries(
      Object.entries(record(value, at)).map(([key, item]) => [key, read(item, `${at}.${key}`)]),
    );
}

function nullable<T>(read: Reader<T>): Reader<T | null> {
  return (value, at) => (value === null ? null : read(value, at));
}

function optional<T>(read: Reader<T>): Reader<T | undefined> {
  return (value, at) => (value === undefined ? undefined : read(value, at));
}

function oneOf<const T extends readonly string[]>(...choices: T): Reader<T[number]> {
  return (value, at) =>
    typeof value === "string" && choices.includes(value)
      ? value
      : invalid(at, `${choices.join(" / ")} 중 하나가 필요합니다.`);
}

const string: Reader<string> = (value, at) =>
  typeof value === "string" && value.trim() ? value : invalid(at, "문자열이 필요합니다.");
const finite: Reader<number> = (value, at) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : invalid(at, "유한한 숫자가 필요합니다.");
const count: Reader<number> = (value, at) => {
  const number = finite(value, at);
  return Number.isSafeInteger(number) && number >= 0 ? number : invalid(at, "개수가 잘못됐습니다.");
};
const bool: Reader<boolean> = (value, at) =>
  typeof value === "boolean" ? value : invalid(at, "참·거짓 값이 필요합니다.");
const relative: Reader<string> = (value, at) => {
  const path = string(value, at);
  if (/^(?:[~/]|[a-z]+:)|[\\\u0000-\u001f]/i.test(path) || path.split("/").includes("..")) {
    return invalid(at, "저장소 상대 경로가 필요합니다.");
  }
  return path;
};
const evidence = object({
  path: relative,
  field: optional(nullable(string)),
  contains: optional(string),
  linked_metadata: optional(relative),
});
const unknownField = object({ field: string, reason: string });
const proportions = object({
  background: optional(finite),
  importance: optional(finite),
  task: optional(finite),
});
const evaluationSeed: Reader<number | number[] | string> = (value, at) =>
  Array.isArray(value)
    ? array(finite)(value, at)
    : typeof value === "string"
      ? value
      : finite(value, at);

const metricDefinition = {
  key: string,
  display_name: string,
  axis: oneOf("privacy", "utility", "fidelity"),
  unit: string,
  direction: oneOf("higher", "lower", "closer_to_target"),
  target: nullable(finite),
  reference_scope: oneOf(
    "full_output",
    "common_n",
    "rank_sample",
    "official_sample",
    "c2st_sample",
  ),
  attack: nullable(oneOf("A1", "A2", "A3", "max")),
  statistic: nullable(oneOf("auc", "tpr_at_fpr")),
  fpr: nullable(finite),
  tie_handling: nullable(string),
  score_transform: nullable(string),
};
const metricStatus = oneOf(
  "measured",
  "not_applicable",
  "failed",
  "not_computed",
  "missing_unknown",
);
const metric = object({
  ...metricDefinition,
  original_key: string,
  value: nullable(finite),
  status: metricStatus,
  missing_reason: nullable(string),
  source_ref: evidence,
  missing_evidence_ref: nullable(evidence),
  aggregation: string,
  reference_data: string,
  reference_sample_rows: nullable(count),
  synthetic_sample_rows: nullable(count),
  common_n_satisfied: nullable(bool),
  common_n_target: nullable(count),
  mia_member_query_rows: nullable(count),
  mia_nonmember_query_rows: nullable(count),
  sampling: nullable(string),
  replicate_unit: nullable(string),
  valid_replicate_count: count,
});
const generationRun = object({
  id: string,
  experiment_id: nullable(string),
  source_experiment_id: nullable(string),
  ownership_status: oneOf("confirmed", "resolved_documented_source_mismatch", "unresolved"),
  ownership_evidence_refs: array(evidence),
  artifact_id: string,
  artifact_hash_verified: bool,
  evaluation_id: string,
  source_run_id: string,
  phase: count,
  condition_id: string,
  dataset_id: string,
  source_label: string,
  repetition_index: count,
  representation: nullable(string),
  source_representation: nullable(string),
  synthetic_rows: count,
  common_n_target: nullable(count),
  status: string,
  started_kst: nullable(string),
  finished_kst: nullable(string),
  execution_code_commit: nullable(string),
  execution_frozen_sources_ref: nullable(relative),
  configuration: object({
    model: string,
    actual_hyperparameters: object({
      max_iters: nullable(count),
      max_model_size: nullable(count),
      rounds: nullable(count),
    }),
    fractions: nullable(proportions),
    protocol_sha256: nullable(string),
    train_input_sha256: nullable(string),
    rho_reserved_unspent_fraction: nullable(finite),
  }),
  dp: object({
    adjacency: nullable(string),
    epsilon_target: nullable(finite),
    epsilon_total_recorded: nullable(finite),
    epsilon_total_upper_bound: nullable(finite),
    delta_target: nullable(finite),
    delta_total: nullable(finite),
    scope: nullable(string),
    accounting_passed: nullable(bool),
    source_formal_dp_claim: nullable(bool),
    rho_budget: nullable(finite),
    rho_total: nullable(finite),
    rho_reserved_unspent: nullable(finite),
    rho_by_phase: proportions,
    evidence_ref: relative,
  }),
  source_refs: object({ evaluation_result: relative, generation_metadata: relative }),
  unknown_fields: array(unknownField),
  metrics: array(metric),
});

const readDashboard = object({
  schema_version: count,
  experiments: array(
    object({
      id: string,
      title: string,
      objective: string,
      performer: nullable(string),
      previous_experiment_ids: nullable(array(string)),
      evidence_refs: array(evidence),
      lineage: array(
        object({ experiment_id: string, relation_type: string, evidence_ref: relative }),
      ),
      changes: array(
        object({
          condition_id: string,
          parameter: string,
          before: nullable(finite),
          after: nullable(finite),
          reason: string,
          evidence_ref: relative,
        }),
      ),
      unknown_fields: array(unknownField),
    }),
  ),
  artifacts: array(
    object({
      id: string,
      hash_algorithm: string,
      hashes: string,
      generation_ids: array(string),
      source_refs: array(relative),
    }),
  ),
  evaluations: array(
    object({
      id: string,
      version: string,
      protocol: string,
      protocol_sha256: nullable(string),
      protocol_changes_sha256: nullable(string),
      protocol_ref: relative,
      source_ref: relative,
      started_utc: nullable(string),
      finished_utc: nullable(string),
      common_n: dictionary(count),
      planned_common_n_draws: count,
      evaluation_seeds: dictionary(evaluationSeed),
      split: dictionary(object({ id: string, files: dictionary(string) })),
      code_sha256: dictionary(string),
      packages: dictionary(string),
    }),
  ),
  generation_runs: array(generationRun),
  summaries: array(
    object({
      experiment_id: string,
      phase: count,
      dataset_id: string,
      label: string,
      key: string,
      source_metric_key: string,
      mean: nullable(finite),
      sample_sd: nullable(finite),
      generation_repetitions: count,
      aggregation: string,
      source_ref: evidence,
    }),
  ),
  reuse: array(
    object({
      owner_experiment_id: string,
      consumer_experiment_id: string,
      phase: count,
      conditions: array(string),
      generation_ids: array(string),
      expected_count: count,
      relation_type: string,
      evidence_ref: evidence,
    }),
  ),
});

export function parseDashboard(input: unknown) {
  const data = readDashboard(input, "dashboard");
  if (data.schema_version !== 1) return invalid("schema_version", "지원하는 버전은 1입니다.");
  return data;
}

export type DashboardSource = ReturnType<typeof parseDashboard>;
export type SourceRun = DashboardSource["generation_runs"][number];
export type SourceMetric = SourceRun["metrics"][number];
export type SourceEvaluation = DashboardSource["evaluations"][number];

const baselineMetric = object({
  ...metricDefinition,
  statistic: nullable(oneOf("auc", "tpr_at_fpr", "rmse", "mae", "r2")),
  value: nullable(finite),
  status: metricStatus,
  missing_reason: nullable(string),
  source_ref: evidence,
  aggregation: string,
  reference_data: string,
  reference_sample_rows: nullable(count),
  synthetic_sample_rows: nullable(count),
  common_n_satisfied: nullable(bool),
  common_n_target: nullable(count),
  mia_member_query_rows: optional(nullable(count)),
  mia_nonmember_query_rows: optional(nullable(count)),
  sampling: optional(nullable(string)),
  replicate_unit: optional(nullable(string)),
  valid_replicate_count: optional(count),
  evaluation_replicate_count: optional(count),
  replicate_values_missing_reason: optional(nullable(string)),
});

const baselineEntry = object({
  id: string,
  dataset_id: string,
  task: oneOf("classification", "regression"),
  model: oneOf("aim", "privpgd", "tabpe"),
  model_name: string,
  setting_name: oneOf("paper_aligned"),
  source_experiment_id: oneOf("EXP-104", "EXP-114"),
  generation_repetitions_expected: count,
  main_comparison_excluded: bool,
  exclusion_reason: nullable(string),
  evaluation_conditions: object({
    protocol_id: string,
    protocol_sha256: string,
    protocol_changes_sha256: nullable(string),
    frozen_code_sha256: dictionary(string),
    evaluation_seeds: dictionary(evaluationSeed),
    split: object({ id: string, files: dictionary(string) }),
    common_n: count,
    common_n_draws: count,
    c2st: object({ feature_policy: string }),
    official_wsd: object({ seed: count, target_included: bool }),
  }),
  runs: array(
    object({
      id: string,
      source_run_id: string,
      repetition_index: count,
      seed: count,
      synthetic_rows: count,
      generation_status: string,
      dp: object({
        epsilon_target: finite,
        delta_target: finite,
        scope: string,
        source_formal_dp_claim: bool,
        accounting: object({ adjacency: string, delta_total: finite, epsilon_total: finite }),
      }),
      metrics: array(baselineMetric),
    }),
  ),
  summaries: array(
    object({
      key: string,
      axis: metricDefinition.axis,
      reference_scope: metricDefinition.reference_scope,
      direction: metricDefinition.direction,
      unit: string,
      target: nullable(finite),
      mean: nullable(finite),
      sample_sd: nullable(finite),
      n_expected: count,
      n_valid: count,
      status: metricStatus,
      missing_reason: nullable(string),
      sample_sd_missing_reason: nullable(string),
      generation_values: array(
        object({
          generation_id: string,
          seed: count,
          status: metricStatus,
          value: nullable(finite),
        }),
      ),
    }),
  ),
});

const readBaselines = object({
  kind: oneOf("baseline_catalog"),
  schema_version: count,
  main_dashboard_sha256: string,
  baseline_count: count,
  metric_definitions: array(
    object({
      key: string,
      axis: metricDefinition.axis,
      reference_scope: metricDefinition.reference_scope,
      direction: metricDefinition.direction,
      unit: string,
      target: nullable(finite),
    }),
  ),
  baselines: array(baselineEntry),
});

export function parseBaselines(input: unknown) {
  const data = readBaselines(input, "dashboard-baselines.json");
  if (data.schema_version !== 1) return invalid("schema_version", "지원하는 버전은 1입니다.");
  return data;
}

export type BaselineSource = ReturnType<typeof parseBaselines>;
