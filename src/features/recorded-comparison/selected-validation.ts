import type { SelectedDelta } from "./replacement";

type Group = Omit<SelectedDelta["evaluation_groups"][number], "runs">;
type Run = SelectedDelta["generation_runs"][number];
type Summary = Group["summaries"][number];

function requireData(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`교체 데이터: ${message}`);
}

export function indexRuns(group: Group, runs: Run[]) {
  requireData(
    runs.length === group.displayed_generation_n &&
      new Set(runs.map((run) => run.parent_dp_generation_id)).size === runs.length &&
      new Set(runs.map((run) => run.repetition_index)).size === runs.length &&
      runs.every(
        (run) =>
          run.dataset === group.dataset &&
          run.experiment_id === group.experiment_id &&
          run.condition === group.condition,
      ),
    `생성 반복이 일치하지 않습니다 (${group.id}).`,
  );
  return new Map(
    runs.map((run) => [run.id, new Map(run.metrics.map((metric) => [metric.key, metric]))]),
  );
}

export function checkSummary(group: Group, summary: Summary, runs: ReturnType<typeof indexRuns>) {
  const values = summary.generation_values;
  requireData(
    values.length === runs.size &&
      new Set(values.map((reading) => reading.generation_id)).size === runs.size &&
      values.every(
        ({ generation_id, value }) => runs.get(generation_id)?.get(summary.key)?.value === value,
      ) &&
      values.filter(({ value }) => value !== null && Number.isFinite(value)).length ===
        summary.n_valid &&
      summary.n_valid === group.generation_n_by_metric[summary.key] &&
      summary.n_expected === group.displayed_generation_n &&
      (summary.mean === null
        ? summary.n_valid === 0
        : summary.n_valid > 0 && Number.isFinite(summary.mean)) &&
      (summary.sample_sd === null
        ? summary.n_valid < 2
        : summary.n_valid >= 2 && Number.isFinite(summary.sample_sd)) &&
      (summary.mean !== null || summary.missing_reason),
    `요약 또는 누락 사유가 원본 반복과 다릅니다 (${group.id}/${summary.key}).`,
  );
}

export function validateSelectedGroups(source: SelectedDelta) {
  const runs = new Map(source.generation_runs.map((run) => [run.id, run]));
  const referenced = source.evaluation_groups.flatMap((group) => group.runs);
  if (
    runs.size !== source.generation_runs.length ||
    new Set(referenced).size !== runs.size ||
    referenced.length !== runs.size
  )
    throw new Error("선정 실험의 실행 참조가 중복되거나 누락됐습니다.");
  for (const group of source.evaluation_groups) {
    const members = group.runs.map((id) => {
      const run = runs.get(id);
      requireData(run, `생성 실행 누락 (${id}).`);
      return run;
    });
    const indexed = indexRuns(group, members);
    for (const summary of group.summaries) checkSummary(group, summary, indexed);
  }
}
