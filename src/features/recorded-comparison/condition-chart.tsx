import { useState } from "react";
import {
  baselineComparisonNote,
  baselineDifference,
  baselineName,
  formatChange,
  directionLabel,
  previewValue,
  rawValue,
  type RecordedMetricDefinition,
} from "./model";
import styles from "@/features/comparison/comparison.module.css";
import type { RecordedBaseline } from "./baseline-loader";
import type { RecordedCondition, RecordedDataset } from "./loader";

export type ComparisonCondition = Omit<RecordedCondition, "phase"> & { phase: number | null };

export function phaseLabel(phase: ComparisonCondition["phase"]) {
  return phase === null ? "Phase 미확인" : `Phase ${phase}`;
}

export function conditionName(condition: ComparisonCondition) {
  return `${condition.experimentId ?? "소속 미확인"} · ${phaseLabel(condition.phase)} · ${condition.dataset} · ${condition.condition}`;
}

export function ConditionChart({
  conditions,
  metric,
  runs,
  baseline,
}: {
  conditions: readonly ComparisonCondition[];
  metric: RecordedMetricDefinition | undefined;
  runs: Record<
    string,
    {
      source_run_id: RecordedDataset["runs"][string]["source_run_id"];
      metrics: readonly Pick<RecordedDataset["runs"][string]["metrics"][number], "key" | "value">[];
    }
  >;
  baseline: RecordedBaseline | undefined;
}) {
  const [scale, setScale] = useState<"zoom" | "zero">("zoom");
  if (!metric || (!conditions.length && !baseline)) {
    return (
      <p className="text-body text-foreground-muted">
        위에서 실험 조건을 선택하면 막대그래프에 표시됩니다.
      </p>
    );
  }

  const referenceStat = baseline?.metrics[metric.key];
  const baselineMean = referenceStat?.mean ?? null;
  const rows: {
    id: string;
    name: string;
    stat: { mean: number | null; sampleSd: number | null; n: number } | undefined;
    isBaseline: boolean;
    note: string | null;
    delta: number | null;
    points: { id: string; label: string; value: number }[];
  }[] = conditions.map((condition) => ({
    id: condition.id,
    name: conditionName(condition),
    stat: condition.metrics[metric.key],
    isBaseline: false,
    note: baseline ? baselineComparisonNote(baseline, metric.key, condition.dataset) : null,
    delta: baselineDifference(metric, condition.metrics[metric.key], referenceStat),
    points: condition.runIds.flatMap((id) => {
      const run = runs[id];
      if (!run) {
        const value = condition.metrics[metric.key]?.mean;
        return value == null ? [] : [{ id, label: id, value }];
      }
      const measure = run.metrics.find(({ key }) => key === metric.key);
      return measure?.value == null ? [] : [{ id, label: run.source_run_id, value: measure.value }];
    }),
  }));
  if (baseline) {
    rows.unshift({
      id: baseline.id,
      name: baselineName(baseline),
      stat: referenceStat,
      isBaseline: true,
      note: referenceStat?.missingReason ?? null,
      delta: null,
      points:
        referenceStat?.points.flatMap(({ seed, value }) =>
          value === null ? [] : [{ id: String(seed), label: baseline.runs[seed]!.label, value }],
        ) ?? [],
    });
  }
  const plotted = rows.flatMap(({ stat, points }) => [
    ...(stat?.mean == null ? [] : [stat.mean]),
    ...points.map(({ value }) => value),
  ]);
  const zoomed = scale === "zoom";
  const observedMin = plotted.length ? Math.min(...plotted) : 0;
  const observedMax = plotted.length ? Math.max(...plotted) : 1;
  const padding = (observedMax - observedMin || Math.abs(observedMax) || 1) * 0.1;
  const min = zoomed ? observedMin - padding : Math.min(0, metric.target ?? 0, observedMin);
  const domainMax = zoomed ? observedMax + padding : Math.max(0, metric.target ?? 0, observedMax);
  const max = domainMax === min ? min + 1 : domainMax;
  const span = max - min;
  const percent = (value: number) => 2.5 + ((value - min) / span) * 95;
  const x = (value: number) => percent(value) * 4.8;
  const target = metric.target;
  const targetVisible = target !== null && target >= min && target <= max;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => min + (max - min) * fraction);
  const tickLabels = ticks.map(previewValue);
  const distinctTickLabels = new Set(tickLabels).size === ticks.length;

  return (
    <div className="grid gap-control-inset">
      <div className="flex flex-wrap items-center justify-between gap-control-gap text-meta text-foreground-muted">
        <div>
          <p>{directionLabel(metric)}</p>
          <p>
            {zoomed ? "세로 표식은 평균 · 점은 생성 반복" : "막대는 평균 · 점은 생성 반복"} · ± 표본
            표준편차
          </p>
        </div>
        <div className={styles.chartMode} role="group" aria-label="지표 그래프 범위">
          <button type="button" aria-pressed={zoomed} onClick={() => setScale("zoom")}>
            값 차이 확대
          </button>
          <button type="button" aria-pressed={!zoomed} onClick={() => setScale("zero")}>
            0 기준 막대
          </button>
        </div>
      </div>
      <div className="grid gap-control-gap text-caption text-foreground-muted">
        <p>
          {zoomed ? "관측값 주변 확대 · 원점수" : "0을 포함한 원점수 범위"}
          {target !== null && !targetVisible && ` · 목표값 ${rawValue(target)} (표시 범위 밖)`}
        </p>
        {plotted.length > 0 && (
          <div className="px-control-inset" aria-label="공통 가로축 눈금">
            <div className="mx-[2.5%] flex justify-between gap-1 font-mono tabular-nums">
              {ticks.map((tick, index) => (
                <span key={index} title={rawValue(tick)}>
                  {distinctTickLabels ? tickLabels[index] : rawValue(tick)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-control-inset">
        {rows.map(({ id, name, stat, points, delta, isBaseline, note }) => {
          const average = stat?.mean ?? null;
          const seriesColor = isBaseline ? "var(--chart-baseline)" : "var(--chart-3)";
          const comparison = !baseline
            ? null
            : isBaseline
              ? baseline.excluded
                ? "주 비교 제외·참고용"
                : "선택한 Baseline"
              : delta === null
                ? note
                : `Baseline 대비 ${formatChange(delta)}`;
          const deltaColor =
            delta === null || delta === 0
              ? "var(--chart-neutral)"
              : delta > 0
                ? "var(--chart-positive)"
                : "var(--chart-negative)";
          return (
            <div
              key={id}
              className="grid gap-control-gap rounded-control border-thin border-border p-control-inset"
            >
              <div className="flex flex-wrap justify-between gap-control-gap">
                <span className="text-label">
                  <span className={styles.recordedSeriesTag} data-baseline={isBaseline}>
                    {isBaseline ? "Baseline" : "실험"}
                  </span>{" "}
                  {name}
                </span>
                <span
                  className="font-mono text-meta tabular-nums"
                  title={`${rawValue(average)} ± ${rawValue(stat?.sampleSd ?? null)}`}
                >
                  {previewValue(average)} ± {previewValue(stat?.sampleSd ?? null)} · n=
                  {stat?.n ?? 0}
                </span>
              </div>
              {average === null ? (
                <p className="text-meta text-foreground-muted">
                  {isBaseline ? (note ?? "미측정") : "미측정"}
                </p>
              ) : (
                <div
                  role="img"
                  aria-label={`${name} 평균 ${average}, 생성 반복 ${points.length}개`}
                  className="relative h-11"
                >
                  <svg
                    viewBox="0 0 480 44"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      x1={x(min)}
                      y1="22"
                      x2={x(max)}
                      y2="22"
                      stroke="var(--chart-grid)"
                      vectorEffect="non-scaling-stroke"
                    />
                    {!zoomed && (
                      <rect
                        x={Math.min(x(0), x(average))}
                        y="16"
                        width={Math.abs(x(average) - x(0))}
                        height="12"
                        rx="2"
                        fill={seriesColor}
                      />
                    )}
                    {targetVisible && (
                      <line
                        x1={x(target)}
                        x2={x(target)}
                        y1="3"
                        y2="41"
                        stroke="var(--chart-2)"
                        strokeDasharray="4 3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {!isBaseline && baselineMean !== null && delta !== null && (
                      <line
                        x1={x(baselineMean)}
                        x2={x(baselineMean)}
                        y1="3"
                        y2="41"
                        stroke="var(--chart-baseline)"
                        strokeDasharray="3 3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {zoomed && (
                      <line
                        x1={x(average)}
                        x2={x(average)}
                        y1="12"
                        y2="32"
                        stroke={seriesColor}
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </svg>
                  {points.map(({ id, label, value }, index) => (
                    <span
                      key={id}
                      aria-hidden="true"
                      className="absolute size-2 -translate-x-1/2 rounded-full border border-surface"
                      style={{
                        left: `${percent(value)}%`,
                        top: 2 + (index % 5) * 7,
                        backgroundColor: seriesColor,
                      }}
                      title={`${label} · ${rawValue(value)}`}
                    />
                  ))}
                </div>
              )}
              {comparison && (
                <p
                  className="break-all text-meta"
                  style={{ color: delta === null ? undefined : deltaColor }}
                >
                  {comparison}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {baseline && (
        <details className="text-caption text-foreground-muted">
          <summary className="cursor-pointer text-label">변화량 판정 기준 보기</summary>
          <p className="mt-control-gap">
            {target !== null && `주황색 점선은 목표값 ${target}입니다. `}
            검정 점선은 비교 가능한 실험 행의 Baseline 평균입니다. 데이터셋·분할·평가
            프로토콜·지표·표본 규칙과 기록된 ε·δ, 인접성, DP 보장 범위가 일치할 때 변화량을
            표시합니다. 양수는 개선 방향입니다. 통계적 유의성은 별도 검정이 필요합니다.
          </p>
        </details>
      )}
    </div>
  );
}
