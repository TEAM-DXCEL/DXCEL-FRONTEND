import type { SelectedDelta } from "./replacement";
import { validateSelectedGroups } from "./selected-validation";

function requireAddition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`추가 데이터: ${message}`);
}

export function appendSelectedDelta(current: SelectedDelta, input: unknown) {
  requireAddition(typeof input === "object" && input !== null, "JSON 객체가 필요합니다.");
  const addition = input as SelectedDelta;
  requireAddition(
    addition.schema_version === 2 &&
      addition.kind === "selected_experiments_delta" &&
      addition.baseline_groups.length === 0 &&
      addition.excluded_existing_conditions.length === 0 &&
      addition.experiments.length === 1 &&
      addition.experiments[0]?.id === "EXP-165" &&
      addition.experiments[0]?.type === "selected_experiment",
    "EXP-165 추가 전용 delta와 빈 제외 목록이 필요합니다.",
  );
  const identity = (metric: SelectedDelta["metric_definitions"][number]) =>
    JSON.stringify([
      metric.key,
      metric.axis,
      metric.reference_scope,
      metric.unit,
      metric.direction,
      metric.target,
      metric.attack ?? null,
      metric.statistic ?? null,
      metric.fpr ?? null,
      metric.tie_handling ?? null,
      metric.score_transform ?? null,
    ]);
  const definitions = new Map(
    current.metric_definitions.map((metric) => [metric.key, identity(metric)]),
  );
  requireAddition(
    addition.metric_definitions.length === definitions.size &&
      addition.metric_definitions.every(
        (metric) => definitions.get(metric.key) === identity(metric),
      ),
    "기존 canonical 지표 정의와 일치하지 않습니다.",
  );

  const currentGroupIds = new Set(current.evaluation_groups.map(({ id }) => id));
  const currentRunIds = new Set(current.generation_runs.map(({ id }) => id));
  const groups = new Map(addition.evaluation_groups.map((group) => [group.id, group]));
  requireAddition(
    !current.experiments.some(({ id }) => id === "EXP-165") &&
      addition.evaluation_groups.every(({ id }) => !currentGroupIds.has(id)) &&
      addition.generation_runs.every(({ id }) => !currentRunIds.has(id)),
    "기존 실험·그룹·실행 ID와 충돌합니다. 덮어쓰지 않았습니다.",
  );
  requireAddition(
    groups.size === 14 &&
      addition.evaluation_groups.length === 14 &&
      addition.generation_runs.length === 70 &&
      new Set(addition.evaluation_groups.map(({ dataset, condition }) => `${dataset}/${condition}`))
        .size === 14 &&
      new Set(addition.evaluation_groups.map(({ dataset }) => dataset)).size === 7,
    "7개 데이터셋의 14그룹·70출력이 필요합니다.",
  );
  for (const group of groups.values()) {
    const primary = group.condition === "PT_UNIF";
    requireAddition(
      group.experiment_id === "EXP-165" &&
        (primary || group.condition === "PT_MID") &&
        group.decoder_id === (primary ? "UNIF" : "MID") &&
        group.derived_condition_id === (primary ? "PTRES_UNIF" : "PTRES_MID") &&
        group.generation_condition_id === "PT_UNIF" &&
        group.primary_condition === primary &&
        group.include_in_overview === primary &&
        group.reference_only === !primary &&
        !group.official_baseline &&
        group.category === (primary ? "selected_experiment" : "reference") &&
        group.displayed_generation_n === 5,
      `주·보조 조건 분류가 다릅니다 (${group.id}).`,
    );
  }
  validateSelectedGroups(addition);
  const byId = new Map(addition.generation_runs.map((run) => [run.id, run]));
  const primaryRuns = addition.generation_runs.filter(
    ({ counts_as_new_dp_generation }) => counts_as_new_dp_generation,
  );
  requireAddition(
    primaryRuns.length === 35 &&
      new Set(
        addition.generation_runs.map(({ parent_dp_generation_id }) => parent_dp_generation_id),
      ).size === 35 &&
      new Set(primaryRuns.map(({ parent_dp_generation_id }) => parent_dp_generation_id)).size ===
        35,
    "독립 DP 부모 35개와 복원 출력 70개의 구분이 다릅니다.",
  );
  for (const run of byId.values()) {
    const primary = run.condition === "PT_UNIF";
    const parent = run.parent_generation_id ? byId.get(run.parent_generation_id) : undefined;
    requireAddition(
      run.source_run_id === null &&
        Boolean(run.source_run_id_missing_reason) &&
        run.counts_as_new_dp_generation === primary &&
        run.post_processing_only === !primary &&
        (primary
          ? run.parent_generation_id === null
          : parent?.condition === "PT_UNIF" &&
            parent.dataset === run.dataset &&
            parent.repetition_index === run.repetition_index &&
            parent.parent_dp_generation_id === run.parent_dp_generation_id),
      `원본 ID 또는 DP 부모 연결 오류 (${run.id}).`,
    );
  }
  const baselineIds = new Set(
    current.official_baseline_comparison_pairs.map(({ baseline_id }) => baseline_id),
  );
  const pairs = addition.official_baseline_comparison_pairs;
  requireAddition(
    pairs.length === 42 &&
      new Set(
        pairs.map(({ evaluation_group, baseline_id }) => `${evaluation_group}/${baseline_id}`),
      ).size === 42,
    "Baseline 비교 연결이 42개가 아닙니다.",
  );
  for (const pair of pairs) {
    const group = groups.get(pair.evaluation_group);
    const confirmed = pair.dataset === "adult" || pair.dataset === "default_credit";
    requireAddition(
      group?.dataset === pair.dataset &&
        baselineIds.has(pair.baseline_id) &&
        pair.baseline_id.split(":")[1] === pair.dataset &&
        pair.directly_comparable === confirmed &&
        pair.eligible_for_automatic_comparison ===
          (confirmed && group.primary_condition === true) &&
        (confirmed ? pair.status === "조건 확인·제한 있음" : pair.status === "비교 조건 확인 필요"),
      `비교 연결 또는 확인 상태 오류 (${pair.evaluation_group}/${pair.baseline_id}).`,
    );
  }
  return {
    ...current,
    experiments: [...current.experiments, ...addition.experiments],
    evaluation_groups: [...current.evaluation_groups, ...addition.evaluation_groups],
    generation_runs: [...current.generation_runs, ...addition.generation_runs],
    official_baseline_comparison_pairs: [...current.official_baseline_comparison_pairs, ...pairs],
  };
}
