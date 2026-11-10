"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { TableViewport } from "@/components/layout/table-viewport";
import { AxisComparisonPlot } from "@/features/comparison/axis-comparison-plot";
import styles from "@/features/comparison/comparison.module.css";
import { conditionName, type ComparisonCondition } from "./condition-chart";
import type { RecordedBaseline } from "./baseline-loader";
import {
  baselineComparisonNote,
  baselineDifference,
  baselineName,
  directionLabel,
  formatChange,
  previewValue,
  rawValue,
  recordedMetricName,
  scopeLabels,
  type RecordedMetricDefinition,
} from "./model";

const axisLabels = { privacy: "Privacy", utility: "Utility", fidelity: "Fidelity" } as const;
const axisIds = ["privacy", "utility", "fidelity"] as const;
const defaults = { privacy: "mia_full_max", utility: "xgb_full", fidelity: "wsd3" };
const tickLabel = (value: number) => String(Number(value.toPrecision(4)));

function axisRange(
  conditions: readonly ComparisonCondition[],
  metric: RecordedMetricDefinition,
  baselines: readonly RecordedBaseline[],
) {
  const values = [...conditions, ...baselines].flatMap(({ metrics }) => {
    const mean = metrics[metric.key]?.mean;
    return mean == null ? [] : [mean];
  });
  if (metric.target !== null) values.push(metric.target);
  if (!values.length) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || Math.abs(max) || 1) * 0.05;
  return { min: min - padding, max: max + padding };
}

export function RecordedMultiAxisView({
  conditions,
  selected,
  metrics,
  baseline,
  baselineOptions,
  regression,
}: {
  conditions: readonly ComparisonCondition[];
  selected: readonly ComparisonCondition[];
  metrics: readonly RecordedMetricDefinition[];
  baseline: RecordedBaseline | undefined;
  baselineOptions: readonly RecordedBaseline[];
  regression: boolean;
}) {
  const [metricKeys, setMetricKeys] = useState(defaults);
  const [focusedId, setFocusedId] = useState<string>();

  const rangeBaselines = baselineOptions.filter(
    ({ id, excluded }) => !excluded || id === baseline?.id,
  );
  const options = axisIds.map((axis) => ({
    axis,
    definitions: metrics.filter((metric) => metric.axis === axis),
  }));
  const axes = options.flatMap(({ axis, definitions }) => {
    const metric =
      definitions.find(({ key }) => key === metricKeys[axis]) ??
      (regression && axis === "utility"
        ? definitions.find(({ key }) => key === "xgb_full_rmse")
        : undefined) ??
      definitions[0];
    if (!metric) return [];
    const { min, max } = axisRange(conditions, metric, rangeBaselines);
    const position = (value: number) => (value - min) / (max - min);
    return [{ axis, metric, min, max, position }];
  });
  const experimentSeries = selected.map((condition) => ({
    id: condition.id,
    name: conditionName(condition),
    values: axes.map(({ metric }) => {
      const stat = condition.metrics[metric.key];
      return {
        mean: stat?.mean ?? null,
        delta: baselineDifference(metric, stat, baseline?.metrics[metric.key]),
        note: baseline ? baselineComparisonNote(baseline, metric.key, condition.dataset) : null,
      };
    }),
  }));
  const series = baseline
    ? [
        {
          id: baseline.id,
          name: baselineName(baseline),
          values: axes.map(({ metric }) => ({
            mean: baseline.metrics[metric.key]?.mean ?? null,
            delta: null,
            note: baseline.metrics[metric.key]?.missingReason ?? null,
          })),
        },
        ...experimentSeries,
      ]
    : experimentSeries;
  const focusedExperiment =
    experimentSeries.find(({ id }) => id === focusedId) ?? experimentSeries[0];
  const focused = focusedExperiment ?? series[0];

  const plotAxes = axes.map(({ axis, metric, min, max, position }) => ({
    id: axis,
    name: axisLabels[axis],
    variant: scopeLabels[metric.reference_scope],
    criterion: directionLabel(metric),
    targetPosition: metric.target === null ? undefined : position(metric.target),
    ticks: [0.25, 0.5, 0.75, 1].map((position) => ({
      position,
      label: tickLabel(min + (max - min) * position),
    })),
  }));
  const entries = series.map(({ id, name, values }) => ({
    id,
    label: name,
    values: values.map(({ mean, delta }, index) =>
      mean === null
        ? null
        : {
            position: axes[index]!.position(mean),
            label: rawValue(mean),
            displayLabel: previewValue(mean),
            delta,
          },
    ),
  }));

  return (
    <div className="grid min-w-0 gap-control-inset">
      {axes.length === axisIds.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-control-gap">
            <div className="flex flex-wrap items-center gap-control-gap text-meta">
              {baseline && (
                <span className={styles.recordedSeriesTag} data-baseline="true">
                  Baseline · {baseline.modelName}
                </span>
              )}
              {focusedExperiment && (
                <span className={styles.recordedSeriesTag}>실험 · {focusedExperiment.name}</span>
              )}
              {!focusedExperiment && (
                <span className="text-foreground-muted">비교할 실험 조건을 선택하세요.</span>
              )}
            </div>
            {experimentSeries.length > 1 && (
              <Select
                label="강조할 실험"
                value={focusedExperiment?.id}
                options={experimentSeries.map(({ id, name }) => ({ value: id, label: name }))}
                onValueChange={setFocusedId}
                controlSize="sm"
                fieldClassName="w-field-md max-w-full"
              />
            )}
          </div>
          <div className={styles.recordedAxisStrip}>
            {axes.map(({ axis, metric, position }, index) => {
              const reference = baseline?.metrics[metric.key]?.mean ?? null;
              const experiment = focusedExperiment?.values[index];
              const current = experiment?.mean ?? null;
              const delta = experiment?.delta ?? null;
              const referenceX = reference === null ? null : 8 + position(reference) * 144;
              const currentX = current === null ? null : 8 + position(current) * 144;
              const targetX = metric.target === null ? null : 8 + position(metric.target) * 144;
              const comparison =
                delta === null
                  ? focusedExperiment && baseline
                    ? experiment?.note
                    : null
                  : delta === 0
                    ? "동률"
                    : `${delta > 0 ? "개선" : "저하"} ${formatChange(delta)}`;
              return (
                <section key={axis} className={styles.recordedAxisCard}>
                  <h3 className="flex items-baseline justify-between gap-control-gap text-label">
                    {axisLabels[axis]}
                    <span
                      className="text-caption text-foreground-muted"
                      title={directionLabel(metric)}
                    >
                      {directionLabel(metric).split(" ")[0]}
                    </span>
                  </h3>
                  <p className="text-caption text-foreground-muted">
                    {recordedMetricName(metric)} · {scopeLabels[metric.reference_scope]}
                  </p>
                  <dl className="mt-control-gap grid grid-cols-2 gap-control-gap">
                    <div>
                      <dt className="text-caption text-foreground-muted">Baseline</dt>
                      <dd
                        className="font-mono text-body-lg font-semibold tabular-nums"
                        title={rawValue(reference)}
                      >
                        {previewValue(reference)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-caption text-chart-3">선택 실험</dt>
                      <dd
                        className="font-mono text-body-lg font-semibold text-chart-3 tabular-nums"
                        title={rawValue(current)}
                      >
                        {previewValue(current)}
                      </dd>
                    </div>
                  </dl>
                  <svg
                    viewBox="0 0 160 16"
                    className="mt-1 h-4 w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="8"
                      y1="8"
                      x2="152"
                      y2="8"
                      stroke="var(--chart-grid)"
                      strokeWidth="2"
                    />
                    {referenceX !== null && currentX !== null && (
                      <line
                        x1={referenceX}
                        y1="8"
                        x2={currentX}
                        y2="8"
                        stroke="var(--chart-axis)"
                        strokeWidth="2"
                      />
                    )}
                    {targetX !== null && (
                      <line
                        x1={targetX}
                        y1="2"
                        x2={targetX}
                        y2="14"
                        stroke="var(--chart-4)"
                        strokeDasharray="2 2"
                      />
                    )}
                    {referenceX !== null && (
                      <line
                        x1={referenceX}
                        y1="4"
                        x2={referenceX}
                        y2="12"
                        stroke="var(--chart-baseline)"
                        strokeWidth="3"
                      />
                    )}
                    {currentX !== null && (
                      <line
                        x1={currentX}
                        y1="3"
                        x2={currentX}
                        y2="13"
                        stroke="var(--chart-3)"
                        strokeWidth="3"
                      />
                    )}
                  </svg>
                  {comparison && (
                    <p
                      className={
                        delta === null || delta === 0
                          ? "text-caption text-foreground-muted"
                          : delta > 0
                            ? "text-caption text-chart-positive"
                            : "text-caption text-chart-negative"
                      }
                    >
                      {comparison}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          {baseline?.excluded && (
            <p className="text-meta text-foreground-muted">
              참고용 값이 포함되도록 차트 축 범위를 넓힐 수 있습니다.
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28rem),1fr))] gap-control-inset">
            {(["radar", "parallel"] as const).map((mode) => (
              <section key={mode} className={styles.recordedPlotCard}>
                <h3 className="text-heading-sm">
                  {mode === "radar" ? "삼각형 레이더" : "평행좌표"}
                </h3>
                <div className="overflow-x-auto">
                  <div className="mx-auto min-w-[26rem] max-w-[48rem]">
                    <AxisComparisonPlot
                      mode={mode}
                      axes={plotAxes}
                      entries={entries}
                      selectedId={focused?.id}
                      baselineId={baseline?.id}
                      selectedColor="var(--chart-3)"
                      onSelect={(id) => {
                        if (id !== baseline?.id) setFocusedId(id);
                      }}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
          <p className="text-caption text-foreground-muted">
            점선 Baseline · 파랑 강조 실험 · 빈 원 목표값 · 초록 개선 · 빨강 저하 · 회색 보류/동률
          </p>
          <div className={styles.recordedChartTools}>
            <details className="text-meta">
              <summary className="cursor-pointer text-label">차트 지표 변경</summary>
              <div className="mt-control-gap grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-control-inset">
                {axes.map(({ axis, metric }, index) => (
                  <Select
                    key={axis}
                    label={`${axisLabels[axis]} 축 지표`}
                    value={metric.key}
                    options={options[index]!.definitions.map((definition) => ({
                      value: definition.key,
                      label: `${recordedMetricName(definition)} · ${scopeLabels[definition.reference_scope]}`,
                    }))}
                    onValueChange={(key) =>
                      setMetricKeys((current) => ({ ...current, [axis]: key }))
                    }
                    controlSize="sm"
                  />
                ))}
              </div>
            </details>
            {series.length > 0 && (
              <details className="text-meta">
                <summary className="mb-control-gap cursor-pointer text-label">원점수 표</summary>
                <TableViewport label="다축 비교 원점수">
                  <table className={styles.archiveTable}>
                    <thead>
                      <tr>
                        <th scope="col">조건</th>
                        {axes.map(({ axis, metric }) => (
                          <th key={axis} scope="col">
                            {axisLabels[axis]} · {recordedMetricName(metric)}
                            <small>
                              {scopeLabels[metric.reference_scope]} · {directionLabel(metric)}
                            </small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((condition) => (
                        <tr key={condition.id}>
                          <th scope="row">
                            {condition.name}
                            {condition.id === baseline?.id && " · Baseline"}
                          </th>
                          {condition.values.map(({ mean, delta, note }, index) => (
                            <td key={axes[index]!.axis}>
                              {rawValue(mean)}
                              {baseline && (condition.id !== baseline.id || note) && (
                                <small>
                                  {delta === null ? note : `Baseline 대비 ${formatChange(delta)}`}
                                </small>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableViewport>
              </details>
            )}
          </div>
        </>
      ) : (
        <p className="text-meta text-foreground-muted">세 평가 축에 표시할 지표가 필요합니다.</p>
      )}
    </div>
  );
}
