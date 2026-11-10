import type { RecordedDataset } from "@/features/recorded-comparison/loader";
import { datasetLabels } from "@/features/recorded-comparison/model";
import type { SupabaseComparisonRun } from "@/features/recorded-comparison/supabase-run";
import type { ExperimentListRow, ExperimentStatus } from "./types";

const generationStatus: Record<string, ExperimentStatus> = {
  passed: "succeeded",
  failed: "failed",
  queued: "queued",
  running: "running",
  cancelled: "cancelled",
};

export function recordedExperimentRows(data: RecordedDataset): ExperimentListRow[] {
  const runs = Object.values(data.runs);
  return data.experiments.map((experiment) => {
    const owned = runs.filter(
      (run) => run.experiment_id === experiment.id && run.ownership_status !== "unresolved",
    );
    const dated = owned
      .flatMap((run) => {
        const time = Date.parse(run.started_kst ?? "");
        return Number.isFinite(time) ? [{ run, time }] : [];
      })
      .toSorted((a, b) => b.time - a.time);
    const latest = dated.length === owned.length ? dated[0] : undefined;
    const latestStatuses = new Set(
      dated.filter(({ time }) => time === latest?.time).map(({ run }) => run.status),
    );

    return {
      id: experiment.id,
      code: experiment.id,
      number: Number(experiment.id.replace(/^EXP-/, "")),
      title: experiment.title,
      owner: experiment.performer,
      updatedAt: null,
      status:
        latest && latestStatuses.size === 1
          ? (generationStatus[latest.run.status] ?? "unknown")
          : "unknown",
      runCount: experiment.generatedCount,
      reusedCount: experiment.reusedCount,
      version: null,
      changes: null,
      searchNote: experiment.objective,
      details: [
        ["이전 실험", experiment.previous_experiment_ids?.join(", ") || null],
        ["실험 목적", experiment.objective],
      ],
    };
  });
}

export function includeSupabaseExperiment(
  rows: ExperimentListRow[],
  run: SupabaseComparisonRun,
): ExperimentListRow[] {
  const { condition, repetition, attempt, metrics } = run;
  const { experimentId, dataset } = condition;
  const label = datasetLabels[dataset] ?? dataset;
  const evaluation = [
    "Supabase 등록 평가",
    `${label} · ${condition.condition} · 반복 ${repetition} / 시도 ${attempt} · 지표 ${metrics.length}개`,
  ] as const;
  if (rows.some(({ code }) => code === experimentId)) {
    return rows.map((row) =>
      row.code === experimentId ? { ...row, details: [...row.details, evaluation] } : row,
    );
  }
  return [
    ...rows,
    {
      id: experimentId,
      code: experimentId,
      number: Number(experimentId.replace(/^EXP-/, "")),
      title: `${label} · ${condition.condition}`,
      owner: null,
      updatedAt: null,
      status: "unknown",
      runCount: 1,
      reusedCount: null,
      version: null,
      changes: null,
      searchNote: `${dataset} ${label} ${condition.condition}`,
      details: [evaluation],
    },
  ];
}
