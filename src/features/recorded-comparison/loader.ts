import "server-only";

import { createHash } from "node:crypto";
import { mean, sampleSd } from "@/lib/demo-research";
import { loadBaselineCatalog } from "./baseline-loader";
import type { RecordedMetricDefinition } from "./model";
import { localReplacementDirectory, readLocalOriginal } from "./replacement-local";
import { readResearchArchive } from "./supabase-archive";
import {
  parseDashboard,
  type DashboardSource,
  type SourceEvaluation,
  type SourceMetric,
  type SourceRun,
} from "./schema";

function requireSource(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function indexById<T extends { id: string }>(records: readonly T[], name: string) {
  const index = new Map(records.map((item) => [item.id, item]));
  requireSource(index.size === records.length, `${name}에 중복 ID가 있습니다.`);
  return index;
}

function conditionId(experiment: string | null, phase: number, dataset: string, label: string) {
  return JSON.stringify([experiment, phase, dataset, label]);
}

function orderedEntries<T>(value: Record<string, T>) {
  return Object.entries(value).toSorted(([a], [b]) => a.localeCompare(b));
}

function evaluationSignature(evaluation: SourceEvaluation, dataset: string) {
  const split = evaluation.split[dataset];
  if (
    !split ||
    !Object.keys(split.files).length ||
    !evaluation.protocol_sha256 ||
    !evaluation.protocol_changes_sha256 ||
    !Object.keys(evaluation.code_sha256).length ||
    !Object.keys(evaluation.evaluation_seeds).length ||
    !Object.keys(evaluation.packages).length
  )
    return null;
  return [
    evaluation.version,
    evaluation.protocol,
    evaluation.protocol_sha256,
    evaluation.protocol_changes_sha256,
    split.id,
    orderedEntries(split.files),
    orderedEntries(evaluation.code_sha256),
    orderedEntries(evaluation.evaluation_seeds),
    orderedEntries(evaluation.packages),
  ];
}

function comparisonSignature(
  run: SourceRun,
  metric: SourceMetric,
  evaluation: SourceEvaluation,
  protocol: ReturnType<typeof evaluationSignature>,
) {
  const dp = run.dp;
  if (
    run.ownership_status === "unresolved" ||
    run.status !== "passed" ||
    !protocol ||
    !dp.accounting_passed ||
    !dp.scope ||
    !dp.adjacency ||
    dp.source_formal_dp_claim === null ||
    dp.epsilon_target === null ||
    dp.epsilon_total_recorded === null ||
    dp.epsilon_total_upper_bound === null ||
    dp.delta_target === null ||
    dp.delta_total === null ||
    metric.reference_sample_rows === null ||
    metric.synthetic_sample_rows === null ||
    (metric.reference_scope === "common_n" &&
      (metric.common_n_satisfied !== true ||
        metric.common_n_target === null ||
        metric.common_n_target !== run.common_n_target ||
        metric.common_n_target !== evaluation.common_n[run.dataset_id] ||
        metric.valid_replicate_count !== evaluation.planned_common_n_draws ||
        !metric.sampling))
  )
    return null;

  const signature = [
    run.dataset_id,
    protocol,
    metric.key,
    metric.reference_scope,
    metric.aggregation,
    metric.reference_data,
    metric.reference_sample_rows,
    metric.synthetic_sample_rows,
    metric.mia_member_query_rows,
    metric.mia_nonmember_query_rows,
    metric.sampling,
    metric.replicate_unit,
    metric.valid_replicate_count,
    metric.common_n_target,
    metric.reference_scope === "common_n" ? evaluation.planned_common_n_draws : null,
    dp.adjacency,
    dp.scope,
    dp.source_formal_dp_claim,
    dp.epsilon_target,
    dp.epsilon_total_recorded,
    Number(dp.epsilon_total_upper_bound.toPrecision(12)),
    dp.delta_target,
    dp.delta_total,
  ];
  return createHash("sha256").update(JSON.stringify(signature)).digest("hex");
}

function metricDefinition(metric: SourceMetric): RecordedMetricDefinition {
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

function metricDetail(metric: SourceMetric, evaluationResult: string) {
  const {
    status,
    source_ref,
    missing_evidence_ref,
    aggregation,
    reference_data,
    reference_sample_rows,
    synthetic_sample_rows,
    common_n_target,
    common_n_satisfied,
    mia_member_query_rows,
    mia_nonmember_query_rows,
    sampling,
    replicate_unit,
    valid_replicate_count,
  } = metric;
  return {
    status,
    sourceField: source_ref.field ?? metric.original_key,
    sourcePath: source_ref.path === evaluationResult ? null : source_ref.path,
    missingEvidence:
      status === "measured" || !missing_evidence_ref
        ? null
        : {
            path: missing_evidence_ref.path === evaluationResult ? null : missing_evidence_ref.path,
            field: missing_evidence_ref.field ?? null,
          },
    aggregation,
    reference_data,
    reference_sample_rows,
    synthetic_sample_rows,
    common_n_target,
    common_n_satisfied,
    mia_member_query_rows,
    mia_nonmember_query_rows,
    sampling,
    replicate_unit,
    valid_replicate_count,
  };
}

function buildDataset(source: DashboardSource) {
  const experiments = indexById(source.experiments, "experiments");
  const artifacts = indexById(source.artifacts, "artifacts");
  const evaluations = indexById(source.evaluations, "evaluations");
  const runs = indexById(source.generation_runs, "generation_runs");
  const metrics = new Map<string, RecordedMetricDefinition>();
  const groups = new Map<string, SourceRun[]>();

  for (const run of runs.values()) {
    requireSource(
      run.ownership_status === "unresolved" ||
        (run.experiment_id !== null && experiments.has(run.experiment_id)),
      "확인된 실험 소속을 experiments에서 찾을 수 없습니다.",
    );
    requireSource(
      evaluations.get(run.evaluation_id)?.split[run.dataset_id],
      "생성 실행의 평가 기록 또는 데이터 분할을 찾을 수 없습니다.",
    );
    requireSource(
      artifacts.get(run.artifact_id)?.generation_ids.includes(run.id),
      "생성 실행과 생성물의 연결이 일치하지 않습니다.",
    );
    requireSource(
      run.metrics.length > 0 &&
        new Set(run.metrics.map(({ key }) => key)).size === run.metrics.length,
      "생성 실행의 지표 키가 비어 있거나 중복됐습니다.",
    );

    for (const metric of run.metrics) {
      requireSource(
        (metric.status === "measured") === (metric.value !== null) &&
          (metric.direction === "closer_to_target") === (metric.target !== null),
        "지표의 값·상태 또는 목표값·방향이 일치하지 않습니다.",
      );
      const definition = metricDefinition(metric);
      const previous = metrics.get(metric.key);
      requireSource(
        !previous || JSON.stringify(previous) === JSON.stringify(definition),
        "같은 지표 키에 서로 다른 정의가 있습니다.",
      );
      metrics.set(metric.key, definition);
    }

    const owner = run.ownership_status === "unresolved" ? null : run.experiment_id;
    const groupId = conditionId(owner, run.phase, run.dataset_id, run.source_label);
    const group = groups.get(groupId) ?? [];
    group.push(run);
    groups.set(groupId, group);
  }

  for (const artifact of artifacts.values()) {
    requireSource(
      artifact.generation_ids.length > 0 &&
        artifact.generation_ids.every((id) => runs.get(id)?.artifact_id === artifact.id),
      "생성물에 연결된 실행 ID가 일치하지 않습니다.",
    );
  }

  const reused = new Map<string, Set<string>>();
  for (const relation of source.reuse) {
    requireSource(
      experiments.has(relation.consumer_experiment_id) &&
        experiments.has(relation.owner_experiment_id) &&
        relation.consumer_experiment_id !== relation.owner_experiment_id &&
        new Set(relation.generation_ids).size === relation.expected_count &&
        relation.generation_ids.length === relation.expected_count,
      "재사용 연결의 실험 또는 실행 수가 일치하지 않습니다.",
    );
    const ids = reused.get(relation.consumer_experiment_id) ?? new Set<string>();
    for (const id of relation.generation_ids) {
      const run = runs.get(id);
      requireSource(
        run &&
          run.ownership_status !== "unresolved" &&
          run.experiment_id === relation.owner_experiment_id &&
          run.phase === relation.phase &&
          relation.conditions.includes(run.condition_id) &&
          !ids.has(id),
        "재사용 실행의 소속·조건이 일치하지 않거나 중복됐습니다.",
      );
      ids.add(id);
    }
    reused.set(relation.consumer_experiment_id, ids);
  }

  const summaries = new Map<string, Map<string, DashboardSource["summaries"][number]>>();
  for (const summary of source.summaries) {
    const groupId = conditionId(
      summary.experiment_id,
      summary.phase,
      summary.dataset_id,
      summary.label,
    );
    const byMetric = summaries.get(groupId) ?? new Map();
    requireSource(
      groups.get(groupId)?.some((run) => run.metrics.some(({ key }) => key === summary.key)) &&
        !byMetric.has(summary.key),
      "요약을 실행별 지표에 연결할 수 없거나 요약이 중복됐습니다.",
    );
    byMetric.set(summary.key, summary);
    summaries.set(groupId, byMetric);
  }

  const conditions = Array.from(groups, ([id, entries]) => {
    const first = entries[0]!;
    requireSource(
      entries.every((run) => run.condition_id === first.condition_id),
      "한 요약 묶음에 여러 생성 조건이 있습니다.",
    );
    const experimentId = first.ownership_status === "unresolved" ? null : first.experiment_id;
    const stats = new Map<
      string,
      { statuses: SourceMetric["status"][]; values: number[]; signatures: Set<string | null> }
    >();

    for (const run of entries) {
      const evaluation = evaluations.get(run.evaluation_id)!;
      const protocol = evaluationSignature(evaluation, run.dataset_id);
      for (const metric of run.metrics) {
        const entry = stats.get(metric.key) ?? { statuses: [], values: [], signatures: new Set() };
        entry.statuses.push(metric.status);
        if (metric.value !== null) {
          entry.values.push(metric.value);
          entry.signatures.add(comparisonSignature(run, metric, evaluation, protocol));
        }
        stats.set(metric.key, entry);
      }
    }

    return {
      id,
      experimentId,
      phase: first.phase,
      dataset: first.dataset_id,
      condition: first.condition_id,
      label: first.source_label,
      outputRows: Array.from(new Set(entries.map((run) => run.synthetic_rows))),
      runIds: entries
        .toSorted((a, b) => a.repetition_index - b.repetition_index)
        .map((run) => run.id),
      metrics: Object.fromEntries(
        Array.from(stats, ([key, stat]) => {
          const summary = summaries.get(id)?.get(key);
          const n = stat.values.length;
          const average = n ? mean(stat.values) : null;
          const sd = n > 1 ? sampleSd(stat.values) : null;
          if (summary) {
            const consistent = (left: number | null, right: number | null) =>
              left === null || right === null ? left === right : Math.abs(left - right) <= 1e-12;
            requireSource(
              summary.generation_repetitions === n &&
                consistent(summary.mean, average) &&
                consistent(summary.sample_sd, sd),
              "원본 요약과 생성 반복 지표가 일치하지 않습니다.",
            );
          }
          return [
            key,
            {
              mean: summary ? summary.mean : average,
              sampleSd: summary ? summary.sample_sd : sd,
              n,
              statuses: Array.from(new Set(stat.statuses)),
              comparisonKey:
                stat.signatures.size === 1 ? (Array.from(stat.signatures)[0] ?? null) : null,
              summarySource: summary?.source_ref ?? null,
              summaryKey: summary?.source_metric_key ?? null,
            },
          ] as const;
        }),
      ),
    };
  }).toSorted(
    (a, b) =>
      (a.experimentId ?? "~").localeCompare(b.experimentId ?? "~") ||
      a.phase - b.phase ||
      a.dataset.localeCompare(b.dataset) ||
      a.condition.localeCompare(b.condition),
  );

  const metricDetails: ReturnType<typeof metricDetail>[] = [];
  const detailIds = new Map<string, number>();
  const projectedRuns = Object.fromEntries(
    source.generation_runs.map(({ metrics, ...run }) => [
      run.id,
      {
        ...run,
        metrics: metrics.map((metric) => {
          const detail = metricDetail(metric, run.source_refs.evaluation_result);
          const signature = JSON.stringify(detail);
          let detailId = detailIds.get(signature);
          if (detailId === undefined) {
            detailId = metricDetails.length;
            detailIds.set(signature, detailId);
            metricDetails.push(detail);
          }
          const { key, value, status, missing_reason } = metric;
          return { key, value, status, missing_reason, detailId };
        }),
      },
    ]),
  );

  return {
    experiments: source.experiments.map((experiment) => ({
      ...experiment,
      generatedCount: source.generation_runs.filter(
        (run) => run.ownership_status !== "unresolved" && run.experiment_id === experiment.id,
      ).length,
      reusedCount: reused.get(experiment.id)?.size ?? 0,
    })),
    conditions,
    metrics: Array.from(metrics.values()),
    evaluations: Object.fromEntries(
      source.evaluations.map(
        ({
          id,
          version,
          protocol,
          protocol_ref,
          source_ref,
          split,
          common_n,
          planned_common_n_draws,
          protocol_sha256,
          started_utc,
          finished_utc,
        }) => [
          id,
          {
            version,
            protocol,
            protocol_ref,
            source_ref,
            split,
            common_n,
            planned_common_n_draws,
            protocol_sha256,
            started_utc,
            finished_utc,
          },
        ],
      ),
    ),
    artifacts: Object.fromEntries(
      source.artifacts.map(({ id, hash_algorithm, hashes, source_refs }) => [
        id,
        { hash_algorithm, hashes, source_refs },
      ]),
    ),
    runs: projectedRuns,
    metricDetails,
    reuse: source.reuse,
    metricCount: source.generation_runs.reduce((sum, run) => sum + run.metrics.length, 0),
    notApplicableCount: source.generation_runs.reduce(
      (sum, run) => sum + run.metrics.filter((metric) => metric.status === "not_applicable").length,
      0,
    ),
    summaryCount: source.summaries.length,
  };
}

export type RecordedDataset = ReturnType<typeof buildDataset>;
export type RecordedCondition = RecordedDataset["conditions"][number];
export type RecordedRun = RecordedDataset["runs"][string];
export type RecordedStat = RecordedCondition["metrics"][string];

export async function loadRecordedDashboard() {
  if (process.env.NODE_ENV === "production" && !process.env.DXCEL_TEAM_PASSWORD) {
    return { status: "disabled" } as const;
  }
  try {
    const archive = localReplacementDirectory()
      ? await readLocalOriginal("dashboard.json")
      : await readResearchArchive("dashboard.json.gz");
    if (archive === null) return { status: "missing" } as const;
    const json = archive.toString("utf8");
    const input: unknown = JSON.parse(json);
    const source = parseDashboard(input);
    const data = buildDataset(source);
    const catalog = await loadBaselineCatalog({
      source,
      data,
      sha256: createHash("sha256").update(archive).digest("hex"),
    });
    return { status: "ready", data, catalog } as const;
  } catch (error) {
    return {
      status: "invalid",
      message:
        error instanceof SyntaxError
          ? "연구 기록의 JSON 형식이 올바르지 않습니다."
          : error instanceof Error
            ? error.message
            : "연구 기록을 읽을 수 없습니다.",
    } as const;
  }
}
