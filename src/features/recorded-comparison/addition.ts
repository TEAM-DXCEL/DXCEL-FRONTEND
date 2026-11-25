import { isDeepStrictEqual } from "node:util";
import type { SelectedDelta } from "./replacement";
import { validateSelectedGroups } from "./selected-validation";

function requireAddition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`추가 데이터: ${message}`);
}

export function appendSelectedDelta(current: SelectedDelta, input: unknown) {
  requireAddition(typeof input === "object" && input !== null, "JSON 객체가 필요합니다.");
  const addition = input as SelectedDelta;
  const experimentId = addition.experiments?.[0]?.id;
  const exp175 = experimentId === "EXP-175";
  const groupCount = exp175 ? 28 : 14;
  const parentCount = exp175 ? 70 : 35;
  requireAddition(
    !(
      addition.existing_evaluation_updates?.length ||
      addition.existing_group_summary_updates?.length
    ),
    "기존 평가·요약 patch 적용은 지원하지 않습니다. 빈 배열이 필요합니다.",
  );
  requireAddition(
    addition.schema_version === 2 &&
      addition.kind === "selected_experiments_delta" &&
      addition.baseline_groups.length === 0 &&
      addition.excluded_existing_conditions.length === 0 &&
      addition.experiments.length === 1 &&
      (experimentId === "EXP-165" || exp175) &&
      addition.experiments[0]?.type === "selected_experiment",
    "EXP-165 또는 EXP-175 추가 delta와 빈 제외 목록이 필요합니다.",
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
      new Set(addition.metric_definitions.map(({ key }) => key)).size === definitions.size &&
      addition.metric_definitions.every(
        (metric) => definitions.get(metric.key) === identity(metric),
      ),
    "기존 canonical 지표 정의와 일치하지 않습니다.",
  );

  const groups = new Map(addition.evaluation_groups.map((group) => [group.id, group]));
  const currentGroupIds = new Set(current.evaluation_groups.map(({ id }) => id));
  const currentRunIds = new Set(current.generation_runs.map(({ id }) => id));
  const alreadyImported = current.experiments.some(({ id }) => id === experimentId);
  requireAddition(
    alreadyImported ||
      (addition.evaluation_groups.every(({ id }) => !currentGroupIds.has(id)) &&
        addition.generation_runs.every(({ id }) => !currentRunIds.has(id))),
    "기존 그룹·실행 ID와 충돌합니다.",
  );
  requireAddition(
    groups.size === groupCount &&
      addition.evaluation_groups.length === groupCount &&
      addition.generation_runs.length === groupCount * 5 &&
      new Set(
        addition.evaluation_groups.map(
          ({ dataset, condition, arm_id, decoder_id }) =>
            `${dataset}/${condition}/${arm_id}/${decoder_id}`,
        ),
      ).size === groupCount &&
      new Set(addition.evaluation_groups.map(({ dataset }) => dataset)).size === 7,
    `7개 데이터셋의 ${groupCount}그룹·${groupCount * 5}출력이 필요합니다.`,
  );
  for (const group of groups.values()) {
    const uniform = exp175 ? group.arm_id === "PT_UNIF" : group.condition === "PT_UNIF";
    const primary = uniform && (!exp175 || group.condition_id === "F_RAG");
    const condition = exp175 ? group.condition_id : "PT_UNIF";
    const arm = exp175 ? group.arm_id : group.condition;
    requireAddition(
      group.experiment_id === experimentId &&
        (arm === "PT_UNIF" || arm === "PT_MID") &&
        (!exp175 ||
          ((condition === "F_RAG" || condition === "F_NOLATE") &&
            group.condition === `${condition}/${arm}` &&
            group.id === `${experimentId}:${group.dataset}:${condition}:${arm}`)) &&
        group.decoder_id === (uniform ? "UNIF" : "MID") &&
        group.derived_condition_id ===
          (exp175
            ? `${condition}_${uniform ? "UNIF" : "MID"}`
            : uniform
              ? "PTRES_UNIF"
              : "PTRES_MID") &&
        group.generation_condition_id === condition &&
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
    primaryRuns.length === parentCount &&
      new Set(
        addition.generation_runs.map(({ parent_dp_generation_id }) => parent_dp_generation_id),
      ).size === parentCount &&
      new Set(primaryRuns.map(({ parent_dp_generation_id }) => parent_dp_generation_id)).size ===
        parentCount,
    "AIM 부모와 복원 출력의 구분이 다릅니다.",
  );
  for (const run of byId.values()) {
    const primary = exp175 ? run.arm_id === "PT_UNIF" : run.condition === "PT_UNIF";
    const parent = run.parent_generation_id ? byId.get(run.parent_generation_id) : undefined;
    requireAddition(
      run.source_run_id === null &&
        Boolean(run.source_run_id_missing_reason) &&
        run.counts_as_new_dp_generation === primary &&
        run.post_processing_only === !primary &&
        (primary
          ? run.parent_generation_id === null
          : parent !== undefined &&
            (exp175
              ? parent?.arm_id === "PT_UNIF" && parent.condition_id === run.condition_id
              : parent?.condition === "PT_UNIF") &&
            parent.dataset === run.dataset &&
            parent.repetition_index === run.repetition_index &&
            parent.parent_dp_generation_id === run.parent_dp_generation_id),
      `원본 ID 또는 DP 부모 연결 오류 (${run.id}).`,
    );
  }
  if (exp175) {
    requireAddition(
      new Set(addition.generation_runs.map((run) => run.preprocessing_release_id)).size === 35 &&
        addition.generation_runs.every((run) => {
          const group = [...groups.values()].find((entry) => entry.runs.includes(run.id));
          return (
            group !== undefined &&
            group.condition_id === run.condition_id &&
            group.arm_id === run.arm_id &&
            group.decoder_id === run.decoder_id &&
            Boolean(run.preprocessing_release_id) &&
            run.preprocessing_source_experiment_id === "EXP-170" &&
            run.independent_across_conditions === false &&
            Boolean(run.independence_limit)
          );
        }),
      "EXP-170 표현 생성물 35개 재사용 또는 조건·arm·decoder 연결이 다릅니다.",
    );
  }
  const baselineIds = new Set(
    current.official_baseline_comparison_pairs.map(({ baseline_id }) => baseline_id),
  );
  const pairs = addition.official_baseline_comparison_pairs;
  requireAddition(
    pairs.length === groupCount * 3 &&
      new Set(
        pairs.map(({ evaluation_group, baseline_id }) => `${evaluation_group}/${baseline_id}`),
      ).size ===
        groupCount * 3,
    "Baseline 비교 연결 수가 다릅니다.",
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
    if (exp175)
      requireAddition(
        pair.metric_compatibility?.length === addition.metric_definitions.length &&
          new Set(pair.metric_compatibility.map(({ key }) => key)).size ===
            addition.metric_definitions.length &&
          pair.metric_compatibility.every((entry) =>
            addition.metric_definitions.some(
              (metric) =>
                metric.key === entry.key && metric.reference_scope === entry.reference_scope,
            ),
          ),
        `지표별 비교 근거 누락 (${pair.evaluation_group}/${pair.baseline_id}).`,
      );
  }
  if (alreadyImported) {
    const sameRecords = <T>(previous: T[], incoming: T[], key: (record: T) => string) => {
      const index = new Map(previous.map((record) => [key(record), record]));
      return (
        previous.length === incoming.length &&
        index.size === previous.length &&
        incoming.every((record) => isDeepStrictEqual(index.get(key(record)), record))
      );
    };
    requireAddition(
      sameRecords(
        current.experiments.filter(({ id }) => id === experimentId),
        addition.experiments,
        ({ id }) => id,
      ) &&
        sameRecords(
          current.evaluation_groups.filter(({ experiment_id }) => experiment_id === experimentId),
          addition.evaluation_groups,
          ({ id }) => id,
        ) &&
        sameRecords(
          current.generation_runs.filter(({ experiment_id }) => experiment_id === experimentId),
          addition.generation_runs,
          ({ id }) => id,
        ) &&
        sameRecords(
          current.official_baseline_comparison_pairs.filter(({ evaluation_group }) =>
            groups.has(evaluation_group),
          ),
          pairs,
          ({ evaluation_group, baseline_id }) => `${evaluation_group}/${baseline_id}`,
        ),
      "재입력한 실험의 기존 기록과 내용이 다릅니다.",
    );
    return current;
  }
  return {
    ...current,
    experiments: [...current.experiments, ...addition.experiments],
    evaluation_groups: [...current.evaluation_groups, ...addition.evaluation_groups],
    generation_runs: [...current.generation_runs, ...addition.generation_runs],
    official_baseline_comparison_pairs: [...current.official_baseline_comparison_pairs, ...pairs],
  };
}
