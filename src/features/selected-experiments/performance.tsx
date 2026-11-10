"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
        <p className="text-body text-foreground-muted">
          성능 실험 {data.experimentCount}개 · {data.groups.length}개 그룹 ·{" "}
          {Object.keys(data.runs).length}개 실행
        </p>
        <div className="my-control-inset grid gap-control-inset desktop:grid-cols-2">
          <Select
            label="선정 실험 데이터셋"
            value={dataset}
            options={datasetOptions}
            onValueChange={(value) => {
              setDataset(value);
              const first = data.groups.find(({ condition }) => condition.dataset === value);
              setSelectedIds(first ? [first.condition.id] : []);
              setBaselineId("");
            }}
          />
          <details
            key={dataset}
            className="relative min-w-0 self-start rounded-control border-thin border-border"
          >
            <summary className="min-h-control-sm cursor-pointer rounded-control px-control-inset py-1.5 text-label hover:bg-surface-hover focus-visible:bg-surface-hover">
              비교할 실험 조건 · {selected.length}개 선택
            </summary>
            <div className="absolute inset-x-0 top-full z-(--z-popover) mt-select-sheet-gap grid max-h-table-region-max gap-control-inset overflow-y-auto rounded-card border-thin border-border bg-surface p-control-inset shadow-dropdown">
              {Array.from(conditionOptions, ([experimentId, options]) => (
                <fieldset key={experimentId} className="grid gap-1">
                  <legend className="mb-1 text-label">{experimentId}</legend>
                  {options.map(({ id, condition }) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-control-gap rounded-control p-1 text-meta hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        aria-label={`${experimentId} · ${condition}`}
                        checked={selectedIds.includes(id)}
                        onChange={({ currentTarget }) => {
                          const checked = currentTarget.checked;
                          setSelectedIds((ids) =>
                            checked ? [...ids, id] : ids.filter((value) => value !== id),
                          );
                        }}
                      />
                      {condition}
                    </label>
                  ))}
                </fieldset>
              ))}
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
            </div>
          </details>
          {baselineOptions.length > 0 && (
            <Select
              label="기존 Baseline"
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
          <summary className="cursor-pointer text-label">비교 조건 · 조건 제한 있음</summary>
          <p className="text-meta text-foreground-muted">
            원본에 기록된 비교쌍입니다. EXP-135-context는 비교 근거로 표시됩니다. 평균 차이의 통계적
            유의성은 미평가입니다.
          </p>
          <pre className="overflow-auto text-caption">
            {JSON.stringify({ 실험_비교: pairEvidence, Baseline_비교: baselineEvidence }, null, 2)}
          </pre>
        </details>
      </section>
    </ThemeScope>
  );
}
