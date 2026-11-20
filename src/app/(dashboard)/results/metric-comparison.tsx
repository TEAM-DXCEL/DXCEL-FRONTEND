"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  datasetLabels,
  directionLabel,
  recordedMetricName,
  scopeLabels,
  type RecordedMetricDefinition,
} from "@/features/recorded-comparison/model";
import { MetricPlot, models, type OverviewSeries } from "./metric-plot";
import styles from "./metric-comparison.module.css";

const categories = [
  ["utility", "Utility"],
  ["fidelity", "Fidelity"],
  ["privacy", "Privacy"],
] as const;

function appliesToDataset(key: string, dataset: string) {
  if (key === "xgb_cn") return dataset !== "california_housing";
  if (key === "xgb_rmse") return dataset === "california_housing";
  return true;
}

export function MetricComparison({
  baselines,
  experiments,
  metrics: allMetrics,
}: {
  baselines: OverviewSeries[];
  experiments: OverviewSeries[];
  metrics: (RecordedMetricDefinition & { shortLabel: string })[];
}) {
  const datasets = [...new Set([...baselines, ...experiments].map((series) => series.dataset))];
  const defaults = ["adult", "default_credit"].filter((dataset) => datasets.includes(dataset));
  const [selectedDatasets, setSelectedDatasets] = useState(
    defaults.length ? defaults : datasets.slice(0, 2),
  );
  const availableSelection = selectedDatasets.filter((id) => datasets.includes(id));
  const visible = availableSelection.length
    ? availableSelection
    : defaults.length
      ? defaults
      : datasets.slice(0, 2);
  const metrics = allMetrics.filter(({ key }) =>
    visible.some((dataset) => appliesToDataset(key, dataset)),
  );
  const hasExcludedBaseline = baselines.some(
    ({ dataset, excluded }) => excluded && visible.includes(dataset),
  );
  const options = [
    ...new Map(experiments.map(({ label }) => [label, { value: label, label }])).values(),
  ];
  const [selectedExperiment, setExperiment] = useState(options[0]?.value ?? "");
  const experiment =
    options.find(({ value }) => value === selectedExperiment)?.value ?? options[0]?.value ?? "";
  const rows = visible.map((dataset) => ({
    dataset,
    series: models.map(({ key }) =>
      key === "experiment"
        ? experiments.find((series) => series.dataset === dataset && series.label === experiment)
        : baselines.find(
            (series) =>
              series.dataset === dataset &&
              series.model === key &&
              (key !== "aim" || series.reference),
          ),
    ),
  }));

  if (!datasets.length || !metrics.length) return null;

  const ranges = metrics.map((metric) => {
    const bounds = rows.flatMap(({ dataset, series }) =>
      appliesToDataset(metric.key, dataset)
        ? series.flatMap((entry) => {
            const stat = entry?.metrics[metric.key];
            return stat?.mean == null
              ? []
              : [stat.mean - (stat.sampleSd ?? 0), stat.mean + (stat.sampleSd ?? 0)];
          })
        : [],
    );
    if (metric.target != null) bounds.push(metric.target);
    if (!bounds.length) return [0, 1] as const;
    const low = Math.min(...bounds);
    const high = Math.max(...bounds);
    const pad = (high - low) * 0.12 || Math.abs(high) * 0.05 || 0.01;
    return [low - pad, high + pad] as const;
  });

  return (
    <Card className="mb-panel-gap" aria-labelledby="metric-comparison">
      <div className="flex flex-wrap items-end justify-between gap-control-inset">
        <div className="min-w-0 max-w-full">
          <h2 id="metric-comparison" className="text-heading-sm">
            주요 지표 비교
          </h2>
          <fieldset className="mt-control-gap flex flex-wrap gap-control-gap">
            <legend className="text-label">데이터셋</legend>
            {datasets.map((dataset) => (
              <label key={dataset} className={styles.datasetToggle}>
                <input
                  type="checkbox"
                  checked={visible.includes(dataset)}
                  disabled={visible.length === 1 && visible.includes(dataset)}
                  onChange={({ currentTarget }) => {
                    const checked = currentTarget.checked;
                    setSelectedDatasets(
                      datasets.filter((id) => (id === dataset ? checked : visible.includes(id))),
                    );
                  }}
                />
                {datasetLabels[dataset] ?? dataset}
              </label>
            ))}
          </fieldset>
        </div>
        {options.length > 0 && (
          <Select
            label="실험 조건"
            options={options}
            value={experiment}
            onValueChange={setExperiment}
            fieldClassName="w-field-md min-w-0 max-w-full"
          />
        )}
      </div>
      <div
        className={styles.matrixScroll}
        role="region"
        tabIndex={0}
        aria-label="데이터셋별 주요 지표 차트"
      >
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                데이터셋
              </th>
              {categories.map(([axis, label]) => {
                const count = metrics.filter((metric) => metric.axis === axis).length;
                return count ? (
                  <th key={axis} scope="colgroup" colSpan={count} className={styles.category}>
                    {label}
                  </th>
                ) : null;
              })}
            </tr>
            <tr>
              {metrics.map((metric) => (
                <th key={metric.key} scope="col" title={recordedMetricName(metric)}>
                  <span className="block">{metric.shortLabel}</span>
                  <span className="text-caption text-foreground-muted">
                    {scopeLabels[metric.reference_scope]} · {directionLabel(metric).split(" ")[0]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dataset, series }) => (
              <tr key={dataset}>
                <th scope="row">{datasetLabels[dataset] ?? dataset}</th>
                {metrics.map((metric, index) => (
                  <td key={metric.key}>
                    {appliesToDataset(metric.key, dataset) ? (
                      <MetricPlot metric={metric} series={series} range={ranges[index]!} />
                    ) : (
                      <span className="text-caption text-foreground-muted">해당 없음</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-control-gap text-caption text-foreground-muted">
        <p>
          점 평균 · 세로선 ± 표본 표준편차 · 점선 AIM
          {" · 초록 테두리: AIM·Tab-PE·PrivPGD 모두보다 수치상 개선"}
          {hasExcludedBaseline && " · † 주 비교 제외"}
        </p>
        <ul className="flex flex-wrap gap-control-inset">
          {models.map(({ key, symbol, label }) => (
            <li key={key} className={styles.seriesColor} data-series={key}>
              {symbol} {label}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
