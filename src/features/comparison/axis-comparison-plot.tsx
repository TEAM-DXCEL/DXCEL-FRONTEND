import type { KeyboardEvent, MouseEvent } from "react";
import styles from "./comparison.module.css";

const activate = (event: KeyboardEvent<SVGGElement>, callback: () => void) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
};
type ChartPoint = { x: number; y: number };
export type PlotAxis = {
  id: string;
  name: string;
  variant?: string;
  criterion: string;
  targetPosition?: number;
  ticks?: readonly { position: number; label: string }[];
};
type PlotValue = { position: number; label: string; displayLabel?: string; delta: number | null };
export type PlotEntry = {
  id: string;
  label: string;
  values: readonly (PlotValue | null)[];
};
type ChartVertex = ChartPoint & PlotValue;
type ChartSeries = {
  item: PlotEntry;
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
  selectedId: string | undefined,
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

export function AxisComparisonPlot({
  mode,
  axes,
  entries,
  selectedId,
  baselineId,
  selectedColor = "var(--color-green-500)",
  onSelect,
}: {
  mode: "radar" | "parallel";
  axes: readonly PlotAxis[];
  entries: readonly PlotEntry[];
  selectedId?: string;
  baselineId?: string;
  selectedColor?: string;
  onSelect: (id: string) => void;
}) {
  const radar = mode === "radar";
  const point = radar ? radarPoint : parallelPoint;
  const axisTicks = axes.find((axis) => axis.ticks)?.ticks;
  const gridTicks =
    axisTicks?.map(({ position }) => position) ??
    (radar ? [0.2, 0.4, 0.6, 0.8, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1]);
  const selected = entries.find(({ id }) => id === selectedId);
  const series = entries.map((item) => {
    const vertices = item.values.map((value, index) =>
      value === null ? null : { ...point(index, value.position), ...value },
    );
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
      onClick={(event) => selectNearestSeries(event, series, selectedId, onSelect)}
      className={styles.primaryChart}
      aria-label={radar ? "Privacy·Utility·Fidelity 삼각형 레이더" : "세 축 평행좌표 비교"}
    >
      {gridTicks.map((tick) => {
        const { y } = point(0, tick);
        return (
          <g key={tick}>
            {radar ? (
              <polygon
                points={axes.map((_, index) => coordinates(point(index, tick))).join(" ")}
                className={styles.radarGrid}
              />
            ) : (
              <line x1="86" y1={y} x2="566" y2={y} className={styles.gridLine} />
            )}
            {!axisTicks && (
              <text
                x={radar ? 340 : 62}
                y={y + 4}
                textAnchor={radar ? "start" : "end"}
                className={styles.tick}
              >
                {tick.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
      {axes.map((axis, index) => {
        const { name, variant, criterion, targetPosition } = axis;
        const start = point(index, 0);
        const end = point(index, 1);
        const label = radar ? radarLabels[index]! : { x: end.x, y: 24 };
        const labelY = radar && index === 0 && variant ? label.y - 12 : label.y;
        const marker = targetPosition === undefined ? null : point(index, targetPosition);
        const value = selected?.values[index];
        return (
          <g key={axis.id}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.parallelAxis} />
            {axis.ticks?.map(({ position, label }) => {
              const tick = point(index, position);
              return (
                <g key={position}>
                  <line
                    x1={tick.x - 3}
                    y1={tick.y}
                    x2={tick.x + 3}
                    y2={tick.y}
                    className={styles.parallelAxis}
                  />
                  <text x={tick.x + 8} y={tick.y + 4} className={styles.tick}>
                    {label}
                  </text>
                </g>
              );
            })}
            {marker && <circle cx={marker.x} cy={marker.y} r="8" className={styles.targetMarker} />}
            <text x={label.x} y={labelY} textAnchor="middle" className={styles.axisHeading}>
              {name}
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
              {criterion}
            </text>
            <text
              x={label.x}
              y={labelY + (variant ? 54 : 34)}
              textAnchor="middle"
              className={styles.axisReadout}
              data-missing={!value}
            >
              {value?.displayLabel ?? value?.label ?? "—"}
            </text>
          </g>
        );
      })}
      {series.map(({ item, vertices, segments }) => {
        if (!vertices.some((vertex) => vertex !== null)) return null;

        const active = item.id === selectedId;
        const baseline = item.id === baselineId;
        const color = baseline
          ? "var(--chart-baseline)"
          : active
            ? selectedColor
            : "var(--chart-axis)";
        const complete = vertices.every((vertex) => vertex !== null);
        const path = complete
          ? `M${vertices.map(coordinates).join(" L")}${radar ? " Z" : ""}`
          : segments.map(([start, end]) => `M${coordinates(start)} L${coordinates(end)}`).join(" ");
        const label = [
          item.label,
          ...axes.map((axis, index) => {
            const vertex = vertices[index];
            const delta = vertex?.delta;
            const outcome =
              !vertex || baseline || baselineId === undefined
                ? ""
                : delta == null
                  ? " · Baseline 비교 불가"
                  : delta < 0
                    ? " · Baseline보다 낮은 성과"
                    : delta > 0
                      ? " · Baseline보다 좋은 성과"
                      : " · Baseline과 동률";
            return `${axis.name}${axis.variant ? ` · ${axis.variant}` : ""} ${vertex?.label ?? "미측정"}${outcome}`;
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
                  <g key={axes[index]?.id}>
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
                              ? "var(--comparison-point-worse, var(--chart-negative))"
                              : "var(--comparison-point-better, var(--chart-positive))"
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
          {axisTicks
            ? "각 축의 눈금은 선택한 지표의 원점수 범위입니다."
            : "각 꼭짓점은 원점수 평균 · 중심 0 / 바깥 1"}
        </text>
      )}
    </svg>
  );
}
