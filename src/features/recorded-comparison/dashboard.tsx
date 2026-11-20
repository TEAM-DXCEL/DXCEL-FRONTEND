"use client";

import { useState } from "react";
import { useDismissibleDetails } from "@/hooks/use-dismissible-details";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThemeScope } from "@/components/ui/theme-scope";
import styles from "@/features/comparison/comparison.module.css";
import { BaselineMetricDetail } from "./baseline-catalog";
import type { loadBaselineCatalog, RecordedBaseline } from "./baseline-loader";
import {
  ConditionChart,
  conditionName,
  phaseLabel,
  type ComparisonCondition,
} from "./condition-chart";
import type { RecordedDataset, RecordedStat } from "./loader";
import {
  baselineComparisonNote,
  baselineDifference,
  baselineName,
  datasetLabels,
  directionLabel,
  formatChange,
  rawValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
  type RecordedMetricDefinition,
} from "./model";
import type { SupabaseComparisonRun } from "./supabase-run";
import { ConditionDetail } from "./run-detail";
import { RecordedMultiAxisView } from "./multi-axis-view";

const all = "all";
const initialFilters = {
  experiment: all,
  phase: all,
  dataset: all,
  condition: all,
  scope: all,
};
type Filters = typeof initialFilters;

function options(values: string[]) {
  return [
    { value: all, label: "전체" },
    ...Array.from(new Set(values)).map((value) => ({ value, label: value })),
  ];
}

type ConditionRow = { condition: ComparisonCondition; stat: RecordedStat };

function ConditionTable({
  experiment,
  rows,
  metric,
  baseline,
  onInspect,
}: {
  experiment: string;
  rows: ConditionRow[];
  metric: RecordedMetricDefinition;
  baseline: RecordedBaseline | undefined;
  onInspect: (condition: ComparisonCondition) => void;
}) {
  const groups = new Map<string, ConditionRow[]>();
  for (const row of rows) {
    const group = `${phaseLabel(row.condition.phase)} · ${row.condition.dataset}`;
    const entries = groups.get(group) ?? [];
    entries.push(row);
    groups.set(group, entries);
  }

  return (
    <div
      className={styles.archiveScroll}
      tabIndex={0}
      role="region"
      aria-label={`${experiment} 조건 비교표`}
    >
      <table className={styles.archiveTable}>
        <thead>
          <tr>
            <th scope="col">조건</th>
            <th scope="col">생성량 · 유효 반복</th>
            <th scope="col">평균 ± 표본 표준편차</th>
            {baseline && <th scope="col">Baseline 대비</th>}
            <th scope="col">평가 상태</th>
            <th scope="col">실험 정보</th>
          </tr>
        </thead>
        {Array.from(groups, ([group, entries]) => (
          <tbody key={group}>
            <tr className="bg-surface-muted">
              <th scope="rowgroup" colSpan={baseline ? 6 : 5}>
                {group}
              </th>
            </tr>
            {entries.map(({ condition, stat }) => {
              const label = conditionName(condition);
              const referenceStat = baseline?.metrics[metric.key];
              const delta = baselineDifference(metric, stat, referenceStat);
              return (
                <tr key={condition.id}>
                  <th scope="row">
                    <strong>{condition.condition}</strong>
                    <small>{condition.label}</small>
                  </th>
                  <td>
                    {condition.outputRows.length
                      ? `${condition.outputRows.map((n) => n.toLocaleString("ko-KR")).join(" / ")}행`
                      : "생성량 미확인"}{" "}
                    · {stat.n}/{condition.runIds.length}회
                  </td>
                  <td>
                    {rawValue(stat.mean)} ± {rawValue(stat.sampleSd)}
                  </td>
                  {baseline && (
                    <td>
                      {delta === null ? (
                        baselineComparisonNote(baseline, metric.key, condition.dataset)
                      ) : (
                        <>
                          <span
                            className={
                              delta > 0
                                ? "text-chart-positive"
                                : delta < 0
                                  ? "text-chart-negative"
                                  : "text-foreground"
                            }
                          >
                            {formatChange(delta)}
                          </span>
                          <small>Baseline 평균 {rawValue(referenceStat?.mean ?? null)}</small>
                        </>
                      )}
                    </td>
                  )}
                  <td>{stat.statuses.map((status) => statusLabels[status]).join(" · ")}</td>
                  <td>
                    <Button
                      controlSize="sm"
                      variant="secondary"
                      onClick={() => onInspect(condition)}
                      aria-label={`${label} 실험 정보 보기`}
                    >
                      실험 정보 보기
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function RecordedComparisonDashboard({
  data,
  catalog,
  liveRun,
  liveError,
}: {
  data: RecordedDataset;
  liveRun?: SupabaseComparisonRun | null;
  liveError?: boolean;
  catalog: Awaited<ReturnType<typeof loadBaselineCatalog>>;
}) {
  const conditionMenuRef = useDismissibleDetails();
  const conditions = liveRun ? [liveRun.condition, ...data.conditions] : data.conditions;
  const baselineCatalog = catalog.status === "ready" ? catalog.data : undefined;
  const datasets = [
    ...new Set([
      ...conditions.map(({ dataset }) => dataset),
      ...(baselineCatalog?.baselines.map(({ dataset }) => dataset) ?? []),
    ]),
  ].toSorted();
  const defaultDataset =
    liveRun?.condition.dataset ??
    (baselineCatalog
      ? (datasets.find((dataset) =>
          data.conditions.some((condition) => condition.dataset === dataset),
        ) ?? all)
      : all);
  const defaultMetric =
    data.metrics.find(({ key }) => key === "mia_full_max") ??
    liveRun?.metrics.find(({ definition }) => definition.key === "mia_full_max")?.definition ??
    data.metrics[0];
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, dataset: defaultDataset });
  const [metricKey, setMetricKey] = useState(defaultMetric?.key);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const liveSelection = liveRun ? [liveRun.condition.id] : [];
    if (!baselineCatalog || !defaultMetric) return liveSelection;
    return [
      ...liveSelection,
      ...datasets.flatMap((dataset) => {
        const reference = baselineCatalog.baselines.find(
          (entry) => entry.dataset === dataset && !entry.excluded,
        );
        const stat = reference?.metrics[defaultMetric.key];
        const condition = data.conditions
          .filter((entry) => entry.dataset === dataset)
          .toSorted((a, b) => b.phase - a.phase)
          .find(
            (entry) =>
              baselineDifference(defaultMetric, entry.metrics[defaultMetric.key], stat) !== null,
          );
        return condition ? [condition.id] : [];
      }),
    ];
  });
  const [baselineModels, setBaselineModels] = useState<Record<string, RecordedBaseline["model"]>>(
    {},
  );
  const [inspection, setInspection] = useState<{ conditionId: string; runId: string } | null>(null);
  const metricByKey = new Map(data.metrics.map((metric) => [metric.key, metric]));
  for (const { definition } of liveRun?.metrics ?? []) {
    if (!metricByKey.has(definition.key)) metricByKey.set(definition.key, definition);
  }
  const baselineOptions =
    baselineCatalog?.baselines.filter(({ dataset }) => dataset === filters.dataset) ?? [];
  const baseline =
    baselineOptions.find(({ model }) => model === baselineModels[filters.dataset]) ??
    baselineOptions.find(({ excluded }) => !excluded);
  const regression = baselineOptions.some(({ task }) => task === "regression");
  const baselineMetrics = baselineCatalog?.metrics ?? [];
  const availableMetrics = [
    ...metricByKey.values(),
    ...baselineMetrics.filter(({ key }) => !metricByKey.has(key)),
  ].filter(
    ({ key, axis }) =>
      (!regression ||
        axis !== "utility" ||
        baselineOptions.some(({ metrics }) => metrics[key]?.mean != null)) &&
      (metricByKey.has(key) || baselineOptions.some(({ metrics }) => Object.hasOwn(metrics, key))),
  );
  const metricOptions = availableMetrics.filter(
    (metric) => filters.scope === all || metric.reference_scope === filters.scope,
  );
  const activeMetric =
    metricOptions.find(({ key }) => key === metricKey) ??
    (regression
      ? (metricOptions.find(({ key }) => key === "xgb_full_rmse") ??
        metricOptions.find(({ key }) => key === "xgb_rmse"))
      : undefined) ??
    metricOptions.find(({ attack, statistic }) => attack === "max" && statistic === "auc") ??
    metricOptions[0];
  const filterOptions = {
    experiment: options(conditions.map(({ experimentId }) => experimentId ?? "소속 미확인")),
    phase: options(
      conditions.flatMap(({ phase }) => (phase === null ? [] : [String(phase)])).toSorted(),
    ),
    dataset: options(datasets)
      .filter(({ value }) => !baselineCatalog || value !== all)
      .map((option) => ({ ...option, label: datasetLabels[option.value] ?? option.label })),
    condition: options(conditions.map(({ condition }) => condition).toSorted()),
    scope: [
      { value: all, label: "전체" },
      ...Object.entries(scopeLabels)
        .filter(([scope]) => availableMetrics.some((metric) => metric.reference_scope === scope))
        .map(([value, label]) => ({ value, label })),
    ],
  };
  const labels = {
    experiment: "실험",
    phase: "Phase",
    condition: "조건",
  };
  const rowsByExperiment = new Map<string | null, ConditionRow[]>();
  for (const condition of conditions) {
    const stat = activeMetric && condition.metrics[activeMetric.key];
    if (
      !stat ||
      (filters.experiment !== all &&
        filters.experiment !== (condition.experimentId ?? "소속 미확인")) ||
      (filters.phase !== all && filters.phase !== String(condition.phase)) ||
      (filters.dataset !== all && filters.dataset !== condition.dataset) ||
      (filters.condition !== all && filters.condition !== condition.condition)
    )
      continue;
    const rows = rowsByExperiment.get(condition.experimentId) ?? [];
    rows.push({ condition, stat });
    rowsByExperiment.set(condition.experimentId, rows);
  }
  const datasetConditions = conditions.filter(
    ({ dataset }) => filters.dataset === all || dataset === filters.dataset,
  );
  const selectedConditions = selectedIds.flatMap(
    (id) => datasetConditions.find((condition) => condition.id === id) ?? [],
  );
  const conditionOptions = new Map<string, ComparisonCondition[]>();
  for (const condition of datasetConditions) {
    const experiment = condition.experimentId ?? "소속 미확인";
    const group = conditionOptions.get(experiment) ?? [];
    group.push(condition);
    conditionOptions.set(experiment, group);
  }
  const detailCondition = conditions.find(({ id }) => id === inspection?.conditionId);
  const detailRun = inspection ? data.runs[inspection.runId] : undefined;
  const detailBaseline = detailCondition?.dataset === baseline?.dataset ? baseline : undefined;

  function toggleCondition(condition: ComparisonCondition) {
    setSelectedIds((ids) =>
      ids.includes(condition.id) ? ids.filter((id) => id !== condition.id) : [...ids, condition.id],
    );
  }

  function inspect(condition: ComparisonCondition, runId = condition.runIds[0]!) {
    setInspection({ conditionId: condition.id, runId });
    requestAnimationFrame(() => {
      document.getElementById("recorded-run-detail")?.focus({ preventScroll: true });
      document.getElementById("recorded-run-detail")?.scrollIntoView({ block: "start" });
    });
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeading}>
        <div>
          <h1>실험 비교</h1>
        </div>
        <span className={styles.demoTag}>
          <span />
          Supabase · 실험 결과
        </span>
      </header>
      <ThemeScope theme="light" className={styles.recordedPanels}>
        {liveError && (
          <p role="status">Supabase 실행을 읽지 못했습니다. 기존 실험과 Baseline을 표시합니다.</p>
        )}
        <section className={styles.recordedPanel} aria-labelledby="recorded-multi-axis-title">
          <div className={styles.panelHeading}>
            <h2 id="recorded-multi-axis-title">Baseline 대비 성능</h2>
            <a className="text-label underline underline-offset-4" href="/baselines">
              전체 Baseline 표
            </a>
          </div>
          <div className="my-control-inset grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-start gap-control-inset">
            <Select
              label="데이터셋"
              value={filters.dataset}
              options={filterOptions.dataset}
              onValueChange={(dataset) => {
                setFilters((current) => ({ ...current, dataset, scope: all }));
                setInspection(null);
              }}
              controlSize="sm"
            />
            {baselineOptions.length > 0 && (
              <Select
                label="Baseline 모델"
                value={baseline?.model}
                options={baselineOptions.map((option) => ({
                  value: option.model,
                  label: baselineName(option) + (option.excluded ? " · 주 비교 제외·참고용" : ""),
                }))}
                onValueChange={(model) => {
                  const option = baselineOptions.find((item) => item.model === model);
                  if (option)
                    setBaselineModels((current) => ({
                      ...current,
                      [filters.dataset]: option.model,
                    }));
                }}
                controlSize="sm"
                fieldClassName="min-w-0 max-w-full"
              />
            )}
            <div className="grid gap-1">
              <span className="text-label">비교할 실험 조건</span>
              <details
                ref={conditionMenuRef}
                key={filters.dataset}
                className="min-w-0 rounded-control border-thin border-border"
              >
                <summary className="min-h-control-sm cursor-pointer rounded-control px-control-inset py-1.5 text-label hover:bg-surface-hover focus-visible:bg-surface-hover">
                  조건 고르기 · {selectedConditions.length}개 선택
                </summary>
                <div className="max-h-table-region-max overflow-y-auto border-t border-border p-control-inset">
                  {conditionOptions.size ? (
                    <div className="grid gap-control-inset">
                      {Array.from(conditionOptions, ([experiment, conditions]) => (
                        <fieldset key={experiment} className="grid gap-1">
                          <legend className="mb-1 text-label">{experiment}</legend>
                          {conditions.map((condition) => (
                            <label
                              key={condition.id}
                              className="flex cursor-pointer items-center gap-control-gap rounded-control p-1 text-meta hover:bg-surface-hover"
                            >
                              <input
                                type="checkbox"
                                aria-label={conditionName(condition)}
                                checked={selectedIds.includes(condition.id)}
                                onChange={() => toggleCondition(condition)}
                              />
                              {filters.dataset === all &&
                                `${datasetLabels[condition.dataset] ?? condition.dataset} · `}
                              {phaseLabel(condition.phase)} · {condition.condition}
                            </label>
                          ))}
                        </fieldset>
                      ))}
                      <Button
                        variant="ghost"
                        controlSize="sm"
                        disabled={!selectedConditions.length}
                        onClick={() =>
                          setSelectedIds((ids) =>
                            ids.filter(
                              (id) => !selectedConditions.some((condition) => condition.id === id),
                            ),
                          )
                        }
                      >
                        이 데이터셋의 선택 해제
                      </Button>
                    </div>
                  ) : (
                    <p className="text-meta text-foreground-muted">
                      이 데이터셋에 연결된 실험 조건이 없습니다.
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
          {baseline?.excluded && (
            <p className="mb-control-gap text-meta">
              주 비교 제외·참고용 · {baseline.exclusionReason}
            </p>
          )}
          {!baseline && (
            <p className="mb-control-gap text-meta text-foreground-muted" role="status">
              {catalog.status === "invalid"
                ? catalog.message
                : catalog.status === "ready"
                  ? "데이터셋을 선택하면 공식 Baseline이 표시됩니다."
                  : "Supabase에서 공식 Baseline을 읽을 수 없습니다."}
            </p>
          )}
          {baselineCatalog?.dashboardMismatch && (
            <p className="mb-control-gap text-meta" role="status">
              Baseline과 실험 파일의 버전 연결 확인이 필요합니다. 변화량은 표시하지 않습니다.
            </p>
          )}
          <RecordedMultiAxisView
            conditions={datasetConditions}
            selected={selectedConditions}
            metrics={availableMetrics}
            regression={regression}
            baseline={baseline}
            baselineOptions={baselineOptions}
          />
        </section>

        <section className={styles.recordedPanel} aria-labelledby="recorded-chart-title">
          <div className={`${styles.panelHeading} mb-control-inset`}>
            <h2 id="recorded-chart-title">지표별 평균과 반복값</h2>
          </div>
          <div className="mb-control-inset flex flex-wrap items-start gap-control-inset">
            {activeMetric && (
              <Select
                label="비교 지표"
                value={activeMetric.key}
                options={metricOptions.map((metric) => ({
                  value: metric.key,
                  label: `${recordedMetricName(metric)} · ${scopeLabels[metric.reference_scope]}`,
                }))}
                onValueChange={setMetricKey}
                controlSize="sm"
                fieldClassName="w-field-md max-w-full"
              />
            )}
            <details className="self-end text-meta">
              <summary className="cursor-pointer text-label">평가 범위 필터</summary>
              <div className="mt-control-gap">
                <Select
                  label="평가 범위"
                  value={filters.scope}
                  options={filterOptions.scope}
                  onValueChange={(scope) => setFilters((current) => ({ ...current, scope }))}
                  controlSize="sm"
                  fieldClassName="w-field-sm max-w-full"
                />
              </div>
            </details>
          </div>
          <ConditionChart
            conditions={selectedConditions}
            metric={activeMetric}
            runs={data.runs}
            baseline={baseline}
          />
          {baseline && activeMetric && (
            <BaselineMetricDetail baseline={baseline} metric={activeMetric} />
          )}
        </section>

        <section className={styles.recordedPanel} aria-labelledby="recorded-summary-title">
          <div className={styles.panelHeading}>
            <h2 id="recorded-summary-title">실험 결과표</h2>
          </div>
          <details className="mt-control-inset text-meta">
            <summary className="cursor-pointer text-label">실험 목록 필터</summary>
            <div className="my-control-inset grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-control-inset">
              {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
                <Select
                  key={key}
                  label={labels[key]}
                  value={filters[key]}
                  options={filterOptions[key]}
                  controlSize="sm"
                  onValueChange={(value) => setFilters((current) => ({ ...current, [key]: value }))}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              controlSize="sm"
              onClick={() =>
                setFilters((current) => ({
                  ...initialFilters,
                  dataset: current.dataset,
                  scope: current.scope,
                }))
              }
            >
              실험 목록 필터 초기화
            </Button>
          </details>
          {activeMetric && rowsByExperiment.size ? (
            <div className="mt-control-inset grid grid-cols-[minmax(0,1fr)] gap-control-gap">
              {Array.from(rowsByExperiment, ([experimentId, rows]) => {
                const experiment = data.experiments.find(({ id }) => id === experimentId);
                const label = experimentId ?? "소속 미확인";
                return (
                  <details
                    key={label}
                    className="group min-w-0 rounded-control border-thin border-border"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-control-gap rounded-control p-control-inset hover:bg-surface-hover focus-visible:bg-surface-hover [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className="font-mono group-open:rotate-90">
                        ▸
                      </span>
                      <strong className="shrink-0 text-label">{label}</strong>
                      <span className="ml-auto shrink-0 text-meta text-foreground-muted">
                        {rows.length}개 조건
                      </span>
                    </summary>
                    <div className="px-control-inset pb-control-inset">
                      {experiment && (
                        <p className={styles.archiveHelp}>
                          신규 생성 {experiment.generatedCount}건 · 재사용 {experiment.reusedCount}
                          건
                        </p>
                      )}
                      <ConditionTable
                        experiment={label}
                        rows={rows}
                        metric={activeMetric}
                        baseline={baseline}
                        onInspect={inspect}
                      />
                      <p className={styles.archiveHelp}>
                        유효 반복 수는 지표가 측정된 생성 실행 수입니다.
                      </p>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className={styles.archiveHelp} role="status">
              이 데이터셋 또는 필터에 맞는 실험 결과가 없습니다.
            </p>
          )}
          <details className="mt-control-inset text-meta">
            <summary className="cursor-pointer text-label">재사용 결과 보기</summary>
            {data.reuse.map((relation) => (
              <details
                key={JSON.stringify([
                  relation.consumer_experiment_id,
                  relation.owner_experiment_id,
                  relation.phase,
                  relation.conditions,
                ])}
                className="mt-control-inset rounded-control border-thin border-border p-control-inset"
              >
                <summary className="cursor-pointer text-label">
                  {relation.consumer_experiment_id}에서 재사용한 {relation.owner_experiment_id}{" "}
                  Phase {relation.phase} {relation.conditions.join("·")} ·{" "}
                  {relation.generation_ids.length}건
                </summary>
                <p className="mt-1 break-all text-meta text-foreground-muted">
                  {relation.evidence_ref.path} · {relation.evidence_ref.field}
                </p>
                <div className="mt-control-inset flex flex-wrap gap-control-gap">
                  {relation.generation_ids.map((id) => {
                    const condition = data.conditions.find(({ runIds }) => runIds.includes(id))!;
                    return (
                      <Button
                        key={id}
                        controlSize="sm"
                        variant="secondary"
                        onClick={() => inspect(condition, id)}
                      >
                        {data.runs[id]!.source_run_id}
                      </Button>
                    );
                  })}
                </div>
              </details>
            ))}
          </details>
        </section>

        {liveRun && (
          <details
            id={inspection?.runId === liveRun.condition.id ? "recorded-run-detail" : undefined}
            tabIndex={-1}
            open={inspection?.runId === liveRun.condition.id || undefined}
            className={`${styles.recordedPanel} scroll-mt-24`}
          >
            <summary className="cursor-pointer text-label">
              {liveRun.condition.experimentId} ·{" "}
              {datasetLabels[liveRun.condition.dataset] ?? liveRun.condition.dataset} · 실행 지표{" "}
              {liveRun.metrics.length}개
            </summary>
            <p className="my-control-inset text-meta">
              반복 {liveRun.repetition} · 시도 {liveRun.attempt} · 공통 N{" "}
              {liveRun.commonN.toLocaleString("ko-KR")} · {liveRun.condition.condition}
            </p>
            <p className="mb-control-inset break-all font-mono text-caption">
              {liveRun.condition.id}
            </p>
            <div
              className={styles.archiveScroll}
              tabIndex={0}
              role="region"
              aria-label="Supabase 실행 지표"
            >
              <table className={styles.archiveTable}>
                <thead>
                  <tr>
                    <th scope="col">지표</th>
                    <th scope="col">평가 범위</th>
                    <th scope="col">측정값</th>
                    <th scope="col">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRun.metrics.map(({ definition, stat, reason }) => (
                    <tr key={definition.key}>
                      <th scope="row">
                        {recordedMetricName(definition)}
                        <small>{directionLabel(definition)}</small>
                      </th>
                      <td>{scopeLabels[definition.reference_scope]}</td>
                      <td>{rawValue(stat.mean)}</td>
                      <td>{reason ?? statusLabels[stat.statuses[0] ?? "missing_unknown"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        {detailCondition && detailRun && detailCondition.phase !== null && (
          <section
            id="recorded-run-detail"
            tabIndex={-1}
            className={`${styles.recordedPanel} scroll-mt-24`}
            aria-labelledby="recorded-run-title"
          >
            <div className={styles.panelHeading}>
              <div>
                <h2 id="recorded-run-title">실험 조건 상세</h2>
              </div>
            </div>
            <ConditionDetail
              key={detailCondition.id}
              condition={{ ...detailCondition, phase: detailCondition.phase }}
              metric={activeMetric}
              baseline={detailBaseline}
              run={detailRun}
              data={data}
              metricByKey={metricByKey}
              onRunChange={(runId) => setInspection({ conditionId: detailCondition.id, runId })}
            />
          </section>
        )}
      </ThemeScope>
    </div>
  );
}
