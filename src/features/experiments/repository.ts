import { experimentCode, experimentStatus } from "./list-query";
import { sampleExperiments } from "./sample-data";
import type { ExperimentListQuery, ExperimentListResult } from "./types";

export async function listExperiments(
  query: ExperimentListQuery,
  signal: AbortSignal,
): Promise<ExperimentListResult> {
  signal.throwIfAborted();
  const search = query.search.trim().toLocaleLowerCase("ko-KR");
  const matches = sampleExperiments.filter((item) => {
    const text = [
      experimentCode(item.experiment.number),
      item.experiment.title,
      item.experiment.owner?.name,
      item.revision.changes,
      item.revision.changeReason,
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return (
      (query.status === "all" || experimentStatus(item) === query.status) && text.includes(search)
    );
  });
  matches.sort((a, b) => {
    if (query.sort === "number_asc") return a.experiment.number - b.experiment.number;
    if (query.sort === "number_desc") return b.experiment.number - a.experiment.number;
    return (
      b.experiment.updatedAt.localeCompare(a.experiment.updatedAt) ||
      b.experiment.number - a.experiment.number
    );
  });
  return { items: matches, total: matches.length, source: "sample" };
}
