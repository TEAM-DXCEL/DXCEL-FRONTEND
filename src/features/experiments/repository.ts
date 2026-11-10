import { experimentCode } from "./list-query";
import { sampleExperiments } from "./sample-data";
import type { ExperimentListQuery, ExperimentListResult, ExperimentListRow } from "./types";

const sampleRows: readonly ExperimentListRow[] = sampleExperiments.map((item) => {
  const { experiment, revision } = item;
  return {
    id: experiment.id,
    code: experimentCode(experiment.number),
    number: experiment.number,
    title: experiment.title,
    owner: experiment.owner?.name ?? null,
    updatedAt: experiment.updatedAt,
    status: item.latestRun?.status ?? "not_started",
    runCount: item.runCount,
    reusedCount: null,
    version: revision.version,
    changes: revision.changes,
    searchNote: revision.changeReason,
    details: [
      [
        "이전 실험",
        item.previousExperimentNumber === null
          ? "없음 · 시작 실험"
          : experimentCode(item.previousExperimentNumber),
      ],
      ["변경 이유", revision.changeReason],
      ["가설", revision.hypothesis],
      ["평가 계획", revision.evaluationPlan],
      ["대표 결과", experiment.representativeGroupId ? "확정된 실행 묶음 있음" : "미선정"],
    ],
  };
});

export async function listExperiments(
  query: ExperimentListQuery,
  signal: AbortSignal,
  rows: readonly ExperimentListRow[] = sampleRows,
): Promise<ExperimentListResult> {
  signal.throwIfAborted();
  const search = query.search.trim().toLocaleLowerCase("ko-KR");
  const matches = rows.filter((item) => {
    const text = [item.code, item.title, item.owner, item.changes, item.searchNote]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return (query.status === "all" || item.status === query.status) && text.includes(search);
  });
  matches.sort((a, b) => {
    if (query.sort === "number_asc") return a.number - b.number;
    if (query.sort === "number_desc") return b.number - a.number;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || b.number - a.number;
  });
  return { items: matches, total: matches.length };
}
