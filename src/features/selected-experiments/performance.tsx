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
  rawValue,
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
    const first = data.groups[0]?.condition;
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
  const baselineEvidence = data.baselineComparisons.filter(
    ({ evaluation_group, baseline_id }) =>
      baseline_id === baseline?.id && selected.some(({ id }) => id === evaluation_group),
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
              const first = data.groups.find(({ condition }) => condition.dataset === value);
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
                    {options.map(({ id, condition }) => (
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
                        <span className="min-w-0 wrap-anywhere">{condition}</span>
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
                    ))}
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
              {group.condition.experimentId} · {group.condition.condition} · 지표와 누락 사유
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
                          {rawValue(stat.mean)} ± {rawValue(stat.sampleSd)}
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
                                {rawValue(reading?.value ?? null)}
                                {reading?.value == null &&
                                  reading &&
                                  ` · ${statusLabels[reading.state]} · ${reading.reason ?? "사유 미확인"}`}
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
            EXP-135는 비교 근거입니다. 통계적 유의성은 미평가입니다.
          </p>
          <pre className="overflow-auto text-caption">
            {JSON.stringify({ 실험_비교: pairEvidence, Baseline_비교: baselineEvidence }, null, 2)}
          </pre>
        </details>
      </section>
    </ThemeScope>
  );
}
