import { mean, sampleSd } from "@/lib/demo-research";
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
  const measured = values.flatMap(({ value }) => (value === null ? [] : [value]));
  const matches = (stored: number | null, computed: number | null) =>
    stored === null || computed === null
      ? stored === computed
      : Math.abs(stored - computed) <= Math.max(1e-14, Math.abs(computed) * 1e-12);
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
      (summary.mean !== null || summary.missing_reason) &&
      matches(summary.mean, measured.length ? mean(measured) : null) &&
      matches(summary.sample_sd, measured.length > 1 ? sampleSd(measured) : null),
    `요약 또는 누락 사유가 원본 반복과 다릅니다 (${group.id}/${summary.key}).`,
  );
}

export function validateSelectedGroups(source: SelectedDelta) {
  const definitions = new Set(source.metric_definitions.map(({ key }) => key));
  const runs = new Map(source.generation_runs.map((run) => [run.id, run]));
  const referenced = source.evaluation_groups.flatMap((group) => group.runs);
  if (
    runs.size !== source.generation_runs.length ||
    new Set(referenced).size !== runs.size ||
    referenced.length !== runs.size
  )
    throw new Error("선정 실험의 실행 참조가 중복되거나 누락됐습니다.");
  for (const group of source.evaluation_groups) {
    requireData(
      group.summaries.length === definitions.size &&
        new Set(group.summaries.map(({ key }) => key)).size === definitions.size &&
        group.summaries.every(({ key }) => definitions.has(key)),
      `지표 요약 키가 중복되거나 누락됐습니다 (${group.id}).`,
    );
    const members = group.runs.map((id) => {
      const run = runs.get(id);
      requireData(run, `생성 실행 누락 (${id}).`);
      requireData(
        run.metrics.length === definitions.size &&
          new Set(run.metrics.map(({ key }) => key)).size === definitions.size &&
          run.metrics.every(
            (metric) =>
              definitions.has(metric.key) &&
              (metric.status === "measured"
                ? metric.value !== null && Number.isFinite(metric.value)
                : metric.value === null && Boolean(metric.missing_reason)),
          ),
        `지표 키 또는 값·측정 상태가 다릅니다 (${id}).`,
      );
      return run;
    });
    const indexed = indexRuns(group, members);
    for (const summary of group.summaries) checkSummary(group, summary, indexed);
  }
}
