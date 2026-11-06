import type { KeyboardEvent, MouseEvent } from "react";
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
const referenceColor = (item: SampleExperiment, selected: SampleExperiment) =>
  item.id === "baseline"
    ? "var(--chart-baseline)"
    : item.id === selected.id
      ? "var(--color-green-500)"
      : "var(--chart-axis)";

type ChartPoint = { x: number; y: number };
type ChartVertex = ChartPoint & { value: number; delta: number | null };
type ChartSeries = {
  item: SampleExperiment;
  vertices: (ChartVertex | null)[];
  segments: [ChartPoint, ChartPoint][];
};

function distanceToSegment(point: ChartPoint, start: ChartPoint, end: ChartPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared
    ? ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    : 0;
  const ratio = Math.max(0, Math.min(1, projection));
  return Math.hypot(point.x - start.x - ratio * dx, point.y - start.y - ratio * dy);
}

function selectNearestSeries(
  event: MouseEvent<SVGSVGElement>,
  series: readonly ChartSeries[],
  selectedId: string,
  onSelect: (id: string) => void,
) {
  const matrix = event.currentTarget.getScreenCTM();
  if (!matrix) return;
  const click = { x: event.clientX, y: event.clientY };
  const toScreen = ({ x, y }: ChartPoint) => new DOMPoint(x, y).matrixTransform(matrix);
  let nearestId: string | undefined;
  let nearestDistance = 14;

  for (const { item, vertices, segments } of series) {
    const screenPoints = vertices.filter((vertex) => vertex !== null).map(toScreen);
    const distances = [
      ...screenPoints.map((point) => Math.hypot(click.x - point.x, click.y - point.y)),
      ...segments.map(([start, end]) => distanceToSegment(click, toScreen(start), toScreen(end))),
    ];
    const distance = Math.min(...distances);
    if (distance < nearestDistance || (distance === nearestDistance && item.id === selectedId)) {
      nearestDistance = distance;
      nearestId = item.id;
    }
  }

  if (nearestId) onSelect(nearestId);
}

const radarCenter = { x: 330, y: 270 };
const radarRadius = 200;
const radarPoint = (index: number, value: number) => {
  const angle = ((-90 + index * 120) * Math.PI) / 180;
  return {
    x: radarCenter.x + Math.cos(angle) * radarRadius * value,
    y: radarCenter.y + Math.sin(angle) * radarRadius * value,
  };
};
const parallelPoint = (index: number, value: number) => ({
  x: 86 + index * 240,
  y: 376 - value * 288,
});
const coordinates = ({ x, y }: ChartPoint) => `${x},${y}`;
const radarLabels = [
  { x: 330, y: 17 },
  { x: 563, y: 392 },
  { x: 97, y: 392 },
];

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
  const radar = mode === "radar";
  const point = radar ? radarPoint : parallelPoint;
  const baselineValues = comparisonMetrics.map((axis) => metricMean(sampleBaseline, metrics[axis]));
  const series = entries.map((item) => {
    const vertices = comparisonMetrics.map((axis, index) => {
      const metric = metrics[axis];
      const value = metricMean(item, metric);
      if (value === null) return null;
      return {
        ...point(index, value),
        value,
        delta: metricImprovement(metric, value, baselineValues[index] ?? null),
      };
    });
    const segments: ChartSeries["segments"] = [];
    vertices.forEach((start, index) => {
      const end = index === vertices.length - 1 && radar ? vertices[0] : vertices[index + 1];
      if (start && end) segments.push([start, end]);
    });
    return { item, vertices, segments };
  });

  return (
    <svg
      viewBox={radar ? "0 -12 660 472" : "0 0 660 442"}
      onClick={(event) => selectNearestSeries(event, series, selected.id, onSelect)}
      className={styles.primaryChart}
      aria-label={radar ? "Privacy·Utility·Fidelity 삼각형 레이더" : "세 축 평행좌표 비교"}
    >
      {(radar ? [0.2, 0.4, 0.6, 0.8, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1]).map((tick) => {
        const { y } = point(0, tick);
        return (
          <g key={tick}>
            {radar ? (
              <polygon
                points={comparisonMetrics
                  .map((_, index) => coordinates(point(index, tick)))
                  .join(" ")}
                className={styles.radarGrid}
              />
            ) : (
              <line x1="86" y1={y} x2="566" y2={y} className={styles.gridLine} />
            )}
            <text
              x={radar ? 340 : 62}
              y={y + 4}
              textAnchor={radar ? "start" : "end"}
              className={styles.tick}
            >
              {tick.toFixed(1)}
            </text>
          </g>
        );
      })}
      {comparisonMetrics.map((axis, index) => {
        const metric = metrics[axis];
        const definition = evaluationMetrics[metric];
        const variant = "variant" in definition ? definition.variant : undefined;
        const start = point(index, 0);
        const end = point(index, 1);
        const label = radar ? radarLabels[index]! : { x: end.x, y: 24 };
        const labelY = radar && index === 0 && variant ? label.y - 12 : label.y;
        const target = metricTarget(metric);
        const marker = target === undefined ? null : point(index, target);
        const value = metricMean(selected, metric);
        return (
          <g key={axis}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.parallelAxis} />
            {marker && <circle cx={marker.x} cy={marker.y} r="8" className={styles.targetMarker} />}
            <text x={label.x} y={labelY} textAnchor="middle" className={styles.axisHeading}>
              {definition.name}
            </text>
            {variant && (
              <text x={label.x} y={labelY + 17} textAnchor="middle" className={styles.axisVariant}>
                {variant}
              </text>
            )}
            <text
              x={label.x}
              y={labelY + (variant ? 35 : 17)}
              textAnchor="middle"
              className={styles.axisCriterion}
              data-target={marker !== null}
            >
              {metricCriterion(metric)}
            </text>
            <text
              x={label.x}
              y={labelY + (variant ? 54 : 34)}
              textAnchor="middle"
              className={styles.axisReadout}
              data-missing={value === null}
            >
              {measurementLabel(value)}
            </text>
          </g>
        );
      })}
      {series.map(({ item, vertices, segments }) => {
        if (!vertices.some((vertex) => vertex !== null)) return null;

        const active = item.id === selected.id;
        const color = referenceColor(item, selected);
        const baseline = item.id === sampleBaseline.id;
        const complete = vertices.every((vertex) => vertex !== null);
        const path = complete
          ? `M${vertices.map(coordinates).join(" L")}${radar ? " Z" : ""}`
          : segments.map(([start, end]) => `M${coordinates(start)} L${coordinates(end)}`).join(" ");
        const label = [
          item.label,
          ...comparisonMetrics.map((axis, index) => {
            const vertex = vertices[index];
            const delta = vertex?.delta;
            const outcome =
              !vertex || baseline
                ? ""
                : delta == null
                  ? " · Baseline 비교 불가"
                  : delta < 0
                    ? " · Baseline보다 낮은 성과"
                    : delta > 0
                      ? " · Baseline보다 좋은 성과"
                      : " · Baseline과 동률";
            return `${metricName(metrics[axis])} ${measurementLabel(vertex?.value ?? null)}${outcome}`;
          }),
        ].join(", ");
        return (
          <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={active}
            className={styles.plotPoint}
            onClick={(event) => {
              if (event.detail === 0) {
                event.stopPropagation();
                onSelect(item.id);
              }
            }}
            onKeyDown={(event) => activate(event, () => onSelect(item.id))}
          >
            <title>{label}</title>
            {path && (
              <>
                <path d={path} className={styles.pathHit} />
                <path
                  d={path}
                  fill={radar && complete && active ? color : "none"}
                  fillOpacity="0.09"
                  pointerEvents="none"
                  stroke={color}
                  strokeOpacity={active || baseline ? 1 : 0.3}
                  strokeWidth={active ? 3 : 2}
                  strokeDasharray={baseline ? "6 5" : undefined}
                />
              </>
            )}
            {vertices.map(
              (vertex, index) =>
                vertex && (
                  <g key={comparisonMetrics[index]}>
                    <circle cx={vertex.x} cy={vertex.y} r="14" className={styles.pointHit} />
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={active ? 5 : 3.5}
                      fill={
                        baseline
                          ? "var(--chart-baseline)"
                          : vertex.delta === null || vertex.delta === 0
                            ? "var(--chart-neutral)"
                            : vertex.delta < 0
                              ? "var(--comparison-point-worse)"
                              : "var(--comparison-point-better)"
                      }
                      className={styles.pointCore}
                    />
                  </g>
                ),
            )}
          </g>
        );
      })}
      {radar && (
        <text x="330" y="449" textAnchor="middle" className={styles.tick}>
          각 꼭짓점은 원점수 평균 · 중심 0 / 바깥 1
        </text>
      )}
    </svg>
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
