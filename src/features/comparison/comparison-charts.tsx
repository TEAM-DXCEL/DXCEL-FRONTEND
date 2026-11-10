import type { KeyboardEvent } from "react";
import {
  comparisonMetrics,
  sampleAxisMetrics,
  comparisonSet,
  mean,
  measurementLabel,
  metricMean,
  type AxisMetrics,
  sampleAuthors,
  sampleBaseline,
  sampleLineage,
  sampleSd,
  score,
  type SampleExperiment,
  type SampleMetric,
} from "./sample-data";
import {
  metricCriterion,
  metricImprovement,
  metricTarget,
  metricName,
  evaluationMetrics,
} from "@/lib/evaluation-metrics";
import { AxisComparisonPlot } from "./axis-comparison-plot";
import styles from "./comparison.module.css";

const authorColor = (item: SampleExperiment) =>
  item.id === "baseline"
    ? "var(--chart-baseline)"
    : sampleAuthors.find((author) => author.id === item.authorId)!.color;
const activate = (event: KeyboardEvent<SVGGElement>, callback: () => void) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
};
export function ComparisonChart({
  mode,
  metrics,
  selected,
  entries,
  onSelect,
}: {
  mode: "radar" | "parallel";
  metrics: AxisMetrics;
  selected: SampleExperiment;
  entries: readonly SampleExperiment[];
  onSelect: (id: string) => void;
}) {
  const metricIds = comparisonMetrics.map((axis) => metrics[axis]);
  return (
    <AxisComparisonPlot
      mode={mode}
      axes={metricIds.map((metric) => {
        const definition = evaluationMetrics[metric];
        return {
          id: metric,
          name: definition.name,
          variant: "variant" in definition ? definition.variant : undefined,
          criterion: metricCriterion(metric),
          targetPosition: metricTarget(metric),
        };
      })}
      entries={entries.map((item) => ({
        id: item.id,
        label: item.label,
        values: metricIds.map((metric) => {
          const value = metricMean(item, metric);
          return value === null
            ? null
            : {
                position: value,
                label: measurementLabel(value),
                delta: metricImprovement(metric, value, metricMean(sampleBaseline, metric)),
              };
        }),
      }))}
      selectedId={selected.id}
      baselineId={sampleBaseline.id}
      onSelect={onSelect}
    />
  );
}

export function DistributionChart({
  selected,
  metric,
  onSelect,
}: {
  selected: SampleExperiment;
  metric: SampleMetric;
  onSelect: (id: string) => void;
}) {
  const entries = comparisonSet(selected);
  const target = metricTarget(sampleAxisMetrics[metric]);
  const minimum = metric === "utility" ? 0.5 : 0;
  const x = (value: number) => 90 + ((value - minimum) / (1 - minimum)) * 430;
  const offsets = [-5, 4, -1, 6, -6];
  return (
    <svg
      viewBox="0 0 560 325"
      className={styles.secondaryChart}
      aria-label={`${metricName(sampleAxisMetrics[metric])} 반복 결과. 선택한 실험과 최근 계보 6개, Baseline의 개별 실행과 평균 ± 표본 SD입니다.`}
    >
      {Array.from({ length: 6 }, (_, i) => minimum + (i / 5) * (1 - minimum)).map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} y1="12" x2={x(tick)} y2="280" className={styles.gridLine} />
          <text x={x(tick)} y="308" textAnchor="middle" className={styles.tick}>
            {tick.toFixed(1)}
          </text>
        </g>
      ))}
      {target !== undefined && (
        <g className={styles.targetGuide}>
          <line x1={x(target)} y1="12" x2={x(target)} y2="280" />
          <text x={x(target)} y="308" textAnchor="middle">
            {target} 목표
          </text>
        </g>
      )}
      <line
        x1={x(mean(sampleBaseline[metric]))}
        y1="12"
        x2={x(mean(sampleBaseline[metric]))}
        y2="280"
        className={styles.referenceLine}
      />
      {entries.map((item, i) => {
        const cy = 26 + i * (240 / Math.max(entries.length - 1, 1));
        const average = mean(item[metric]);
        const sd = sampleSd(item[metric]);
        return (
          <g
            key={item.id}
            role="button"
            tabIndex={0}
            className={styles.plotPoint}
            aria-label={`${item.label}, 평균 ${score(average)}, 표본 SD ${score(sd)}`}
            aria-pressed={selected.id === item.id}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => activate(e, () => onSelect(item.id))}
          >
            <rect
              x="0"
              y={cy - 13}
              width="550"
              height="27"
              rx="3"
              fill={selected.id === item.id ? "var(--primary-subtle)" : "transparent"}
            />
            <text
              x="0"
              y={cy + 4}
              className={selected.id === item.id ? styles.activePointLabel : styles.pointLabel}
            >
              {item.label}
            </text>
            <line
              x1={x(average - sd)}
              y1={cy}
              x2={x(average + sd)}
              y2={cy}
              stroke={authorColor(item)}
              className={styles.intervalLine}
            />
            <line
              x1={x(average - sd)}
              y1={cy - 5}
              x2={x(average - sd)}
              y2={cy + 5}
              stroke={authorColor(item)}
            />
            <line
              x1={x(average + sd)}
              y1={cy - 5}
              x2={x(average + sd)}
              y2={cy + 5}
              stroke={authorColor(item)}
            />
            {item[metric].map((value, j) => (
              <circle
                key={j}
                cx={x(value)}
                cy={cy + offsets[j]!}
                r="2.5"
                fill={authorColor(item)}
                opacity="0.6"
              />
            ))}
            <circle
              cx={x(average)}
              cy={cy}
              r="4"
              fill={authorColor(item)}
              className={styles.meanDot}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function EvolutionChart({
  selected,
  metric,
  onSelect,
}: {
  selected: SampleExperiment;
  metric: SampleMetric;
  onSelect: (id: string) => void;
}) {
  const entries = sampleLineage(selected);
  const target = metricTarget(sampleAxisMetrics[metric]);
  const minimum = metric === "utility" ? 0.5 : 0;
  const x = (i: number) => 45 + (i / Math.max(entries.length - 1, 1)) * 465;
  const y = (v: number) => 250 - ((v - minimum) / (1 - minimum)) * 210;
  return (
    <svg
      viewBox="0 0 560 325"
      className={styles.secondaryChart}
      aria-label={`${metricName(sampleAxisMetrics[metric])} 이전 실험 계보의 평균 변화. 가로축은 계보 순서이며 시간 간격이나 인과 효과를 나타내지 않습니다.`}
    >
      {Array.from({ length: 6 }, (_, i) => minimum + (i / 5) * (1 - minimum)).map((tick) => (
        <g key={tick}>
          <line x1="45" y1={y(tick)} x2="510" y2={y(tick)} className={styles.gridLine} />
          <text x="29" y={y(tick) + 4} textAnchor="end" className={styles.tick}>
            {tick.toFixed(1)}
          </text>
        </g>
      ))}
      {target !== undefined && (
        <g className={styles.targetGuide}>
          <line x1="45" y1={y(target)} x2="510" y2={y(target)} />
          <text x="510" y={y(target) - 6} textAnchor="end">
            {target} 목표
          </text>
        </g>
      )}
      <line
        x1="45"
        y1={y(mean(sampleBaseline[metric]))}
        x2="510"
        y2={y(mean(sampleBaseline[metric]))}
        className={styles.referenceLine}
      />
      <polyline
        points={entries.map((item, i) => `${x(i)},${y(mean(item[metric]))}`).join(" ")}
        fill="none"
        stroke="var(--chart-1)"
        className={styles.evolutionLine}
      />
      {entries.map((item, i) => (
        <g
          key={item.id}
          role="button"
          tabIndex={0}
          className={styles.plotPoint}
          aria-label={`${item.label}, ${metricName(sampleAxisMetrics[metric])} ${score(mean(item[metric]))}`}
          aria-pressed={selected.id === item.id}
          onClick={() => onSelect(item.id)}
          onKeyDown={(e) => activate(e, () => onSelect(item.id))}
        >
          <circle cx={x(i)} cy={y(mean(item[metric]))} r="16" className={styles.pointHit} />
          <circle
            cx={x(i)}
            cy={y(mean(item[metric]))}
            r={selected.id === item.id ? 6 : 4}
            fill={authorColor(item)}
            className={styles.pointCore}
          />
          <text x={x(i)} y="279" textAnchor="middle" className={styles.tick}>
            {item.number || "B"}
          </text>
        </g>
      ))}
      <text x="510" y="308" textAnchor="end" className={styles.axisTitle}>
        계보 순서 →
      </text>
    </svg>
  );
}
