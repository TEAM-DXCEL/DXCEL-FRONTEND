"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { controlClasses, controlSizes } from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { Select, selectOptionClasses, selectPanelClasses } from "@/components/ui/select";
import { ThemeScope } from "@/components/ui/theme-scope";
import styles from "@/features/comparison/comparison.module.css";
import type { RecordedBaseline } from "@/features/recorded-comparison/baseline-loader";
import { ConditionChart } from "@/features/recorded-comparison/condition-chart";
import { RecordedMultiAxisView } from "@/features/recorded-comparison/multi-axis-view";
import {
  baselineName,
  datasetLabels,
  formatMetricValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
} from "@/features/recorded-comparison/model";
import type { SelectedPerformance } from "./source";

export function SelectedPerformanceView({
  data,
  baselines,
}: {
  data: SelectedPerformance;
  baselines: RecordedBaseline[];
}) {
  const [dataset, setDataset] = useState(data.groups[0]?.condition.dataset ?? "");
  const [selectedIds, setSelectedIds] = useState(() => {
    const first =
      data.groups.find(({ condition }) => !condition.referenceOnly)?.condition ??
      data.groups[0]?.condition;
    return first ? [first.id] : [];
  });
  const [baselineId, setBaselineId] = useState("");
  const [metricKey, setMetricKey] = useState("mia_full_max");
  const groups = data.groups.filter(({ condition }) => condition.dataset === dataset);
  const conditions = groups.map(({ condition }) => condition);
  const selectedGroups = groups.filter(({ condition }) => selectedIds.includes(condition.id));
  const selected = selectedGroups.map(({ condition }) => condition);
  const conditionOptions = Map.groupBy(conditions, ({ experimentId }) => experimentId);
  const baselineOptions = baselines.filter((baseline) => baseline.dataset === dataset);
  const baseline =
    baselineOptions.find(({ id }) => id === baselineId) ??
    baselineOptions.find(({ model, excluded }) => model === "aim" && !excluded) ??
    baselineOptions.find(({ excluded }) => !excluded);
  const metrics = data.metrics.filter(({ key }) =>
    selected.some((condition) => condition.metrics[key]?.mean != null),
  );
  const metric = metrics.find(({ key }) => key === metricKey) ?? metrics[0];
  const datasetOptions = [...new Set(data.groups.map(({ condition }) => condition.dataset))].map(
    (value) => ({
      value,
      label: datasetLabels[value] ?? value,
    }),
  );
  const pairEvidence = data.comparisons.filter(({ lhs, rhs }) =>
    selected.some(({ id }) => id === lhs || id === rhs),
  );

  return (
    <ThemeScope theme="light" className="mb-section-gap">
      <section id="selected-performance" className={`${styles.recordedPanel} scroll-mt-header`}>
        <h2 className="text-heading-sm">선정 실험 성능 비교</h2>
        <div className="my-control-inset grid gap-control-inset desktop:grid-cols-2">
          <Select
            label="데이터셋"
            value={dataset}
            options={datasetOptions}
            onValueChange={(value) => {
              setDataset(value);
              const first =
                data.groups.find(
                  ({ condition }) => condition.dataset === value && !condition.referenceOnly,
                ) ?? data.groups.find(({ condition }) => condition.dataset === value);
              setSelectedIds(first ? [first.condition.id] : []);
              setBaselineId("");
            }}
          />
          <div className="grid min-w-0 content-start gap-control-gap">
            <span className="text-label">비교할 실험 조건</span>
            <details key={dataset} className="group relative min-w-0">
              <summary
                aria-label={`비교할 실험 조건 · ${selected.length}개 선택`}
                className={cx(
                  controlClasses,
                  controlSizes.md,
                  "flex cursor-pointer list-none items-center justify-between gap-control-gap text-left group-open:bg-control-focus [&::-webkit-details-marker]:hidden",
                )}
              >
                {selected.length}개 선택
                <svg
                  className="size-icon-sm shrink-0 text-foreground-subtle"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div
                className={cx(
                  selectPanelClasses,
                  "absolute inset-x-0 top-full mt-select-sheet-gap max-h-select-list-max space-y-select-item-gap overflow-y-auto p-select-inset",
                )}
              >
                <div className="flex flex-wrap gap-control-gap">
                  <Button
                    variant="ghost"
                    controlSize="sm"
                    disabled={selected.length === conditions.length}
                    onClick={() => setSelectedIds(conditions.map(({ id }) => id))}
                  >
                    전체 선택
                  </Button>
                  <Button
                    variant="ghost"
                    controlSize="sm"
                    disabled={selected.length === 0}
                    onClick={() => setSelectedIds([])}
                  >
                    전체 해제
                  </Button>
                </div>
                {Array.from(conditionOptions, ([experimentId, options]) => (
                  <fieldset key={experimentId} className="min-w-0 space-y-select-item-gap">
                    <legend className="px-control-inset pt-1 text-label text-foreground-muted">
                      {experimentId}
                    </legend>
                    {options.map(
                      ({ id, condition, label, referenceOnly, displayedGenerationN }) => (
                        <label
                          key={id}
                          data-selected={selectedIds.includes(id)}
                          className={cx(
                            selectOptionClasses,
                            "relative cursor-pointer hover:bg-control-focus has-[:focus-visible]:bg-control-focus data-[selected=true]:bg-select-selected data-[selected=true]:text-select-selected-foreground",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            aria-label={`${experimentId} · ${condition}`}
                            checked={selectedIds.includes(id)}
                            onChange={({ currentTarget }) => {
                              const checked = currentTarget.checked;
                              setSelectedIds((ids) =>
                                checked ? [...ids, id] : ids.filter((value) => value !== id),
                              );
                            }}
                          />
                          <span className="min-w-0 wrap-anywhere">
                            {label}
                            {referenceOnly && " · 참고용"}
                            {displayedGenerationN !== undefined &&
                              ` · 생성 n=${displayedGenerationN}`}
                          </span>
                          {selectedIds.includes(id) && (
                            <svg
                              className="size-icon-sm shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="m5 12 4 4L19 6" />
                            </svg>
                          )}
                        </label>
                      ),
                    )}
                  </fieldset>
                ))}
              </div>
            </details>
          </div>
          {baselineOptions.length > 0 && (
            <Select
              label="Baseline"
              value={baseline?.id}
              onValueChange={setBaselineId}
              options={baselineOptions.map((entry) => ({
                value: entry.id,
                label: baselineName(entry) + (entry.excluded ? " · 참고용" : ""),
              }))}
            />
          )}
        </div>
        {selected.length > 0 ? (
          <RecordedMultiAxisView
            conditions={conditions}
            selected={selected}
            metrics={metrics}
            baseline={baseline}
            baselineOptions={baselineOptions}
            regression={dataset === "california_housing"}
          />
        ) : (
          <p className="text-body text-foreground-muted">
            비교할 실험 조건을 하나 이상 선택하세요.
          </p>
        )}
        {metric && (
          <div className="my-control-inset">
            <Select
              label="막대그래프 지표"
              value={metric.key}
              onValueChange={setMetricKey}
              options={metrics.map((entry) => ({
                value: entry.key,
                label: `${recordedMetricName(entry)} · ${scopeLabels[entry.reference_scope]}`,
              }))}
            />
            <ConditionChart
              conditions={selected}
              metric={metric}
              runs={data.runs}
              baseline={baseline}
            />
          </div>
        )}
        {selectedGroups.map((group) => (
          <details
            key={group.condition.id}
            className="mt-control-inset rounded-control border-thin border-border p-control-inset"
          >
            <summary className="cursor-pointer text-label">
              {group.condition.experimentId} · {group.condition.label}
              {group.condition.referenceOnly && " · 참고용"}
              {group.condition.displayedGenerationN !== undefined &&
                ` · 생성 n=${group.condition.displayedGenerationN}`}
              {" · 지표와 누락 사유"}
            </summary>
            <div className={styles.archiveScroll}>
              <table className={styles.archiveTable}>
                <thead>
                  <tr>
                    <th scope="col">지표</th>
                    <th scope="col">평균 ± 표본 표준편차</th>
                    <th scope="col">유효 반복</th>
                    <th scope="col">실행별 값과 누락 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {data.metrics.flatMap((entry) => {
                    const stat = group.condition.metrics[entry.key];
                    if (!stat) return [];
                    return [
                      <tr key={entry.key}>
                        <th scope="row">
                          {recordedMetricName(entry)} · {scopeLabels[entry.reference_scope]}
                        </th>
                        <td>
                          {formatMetricValue(entry, stat.mean)} ±{" "}
                          {formatMetricValue(entry, stat.sampleSd, "sd")}
                        </td>
                        <td>
                          {stat.n}/{group.condition.runIds.length}
                        </td>
                        <td>
                          {group.summaries[entry.key] && <div>{group.summaries[entry.key]}</div>}
                          {group.condition.runIds.map((id) => {
                            const run = data.runs[id];
                            const reading = run?.metrics.find(({ key }) => key === entry.key);
                            return (
                              <div key={id}>
                                원본 반복 {run?.repetition_index ?? "미확인"} ·{" "}
                                {formatMetricValue(entry, reading?.value ?? null)}
                                {reading?.value == null &&
                                  reading &&
                                  ` · ${statusLabels[reading.state]} · ${reading.reason ?? "사유 미확인"}`}
                                {reading?.evaluationCount != null &&
                                  ` · 평가 추출 ${reading.evaluationCount}회`}
                                {reading?.evaluationMissingReason &&
                                  ` · ${reading.evaluationMissingReason}`}
                              </div>
                            );
                          })}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
            <details className="mt-control-inset">
              <summary className="cursor-pointer text-label">평가 조건과 근거</summary>
              <pre className="overflow-auto text-caption">
                {JSON.stringify(group.comparisonConditions, null, 2)}
              </pre>
            </details>
          </details>
        ))}
        <details className="mt-control-inset rounded-control border-thin border-border p-control-inset">
          <summary className="cursor-pointer text-label">비교 조건과 근거</summary>
          <p className="text-meta text-foreground-muted">
            평균 차이는 기술 비교이며 통계적 유의성이나 DP 보장 강도를 뜻하지 않습니다.
          </p>
          {baseline &&
            selectedGroups.map(({ condition }) => {
              const pair = condition.comparisonEvidence?.find(
                ({ baselineId }) => baselineId === baseline.id,
              );
              return (
                <div key={condition.id} className="mt-control-gap text-meta">
                  <strong>
                    {condition.experimentId} · {pair?.status ?? "비교 조건 확인 필요"}
                  </strong>
                  {condition.referenceOnly && <p>참고용 · 자동 개선 판정 제외</p>}
                  {pair?.limits?.map((limit) => (
                    <p key={limit}>{limit}</p>
                  ))}
                </div>
              );
            })}
          {pairEvidence.length > 0 && (
            <pre className="overflow-auto text-caption">
              {JSON.stringify(pairEvidence, null, 2)}
            </pre>
          )}
        </details>
      </section>
    </ThemeScope>
  );
}
