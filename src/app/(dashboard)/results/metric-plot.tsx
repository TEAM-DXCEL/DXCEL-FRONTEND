import {
  formatMetricValue,
  improvement,
  type RecordedMetricDefinition,
} from "@/features/recorded-comparison/model";
import styles from "./metric-comparison.module.css";

type Reading = { mean: number | null; sampleSd: number | null; n: number; reason?: string | null };
export type OverviewSeries = {
  dataset: string;
  label: string;
  model?: string;
  excluded?: boolean;
  reference?: boolean;
  comparableToAim?: boolean;
  comparisonNote?: string;
  metrics: Record<string, Reading>;
};

export const models = [
  { key: "aim", label: "AIM", symbol: "■" },
  { key: "tabpe", label: "Tab-PE", symbol: "▲" },
  { key: "privpgd", label: "PrivPGD", symbol: "●" },
  { key: "experiment", label: "선택 실험", symbol: "◆" },
] as const;

const aimIndex = models.findIndex(({ key }) => key === "aim");
const experimentIndex = models.findIndex(({ key }) => key === "experiment");

export function MetricPlot({
  metric,
  series,
  range: [low, high],
}: {
  metric: RecordedMetricDefinition;
  series: (OverviewSeries | undefined)[];
  range: readonly [number, number];
}) {
  const readings = series.map((entry) => entry?.metrics[metric.key]);
  const aim = readings[aimIndex]?.mean;
  const current = readings[experimentIndex]?.mean;
  const change =
    series[experimentIndex]?.comparableToAim && aim != null && current != null
      ? improvement(metric, current, aim)
      : null;
  const tone = change === null || change === 0 ? undefined : change > 0 ? "better" : "worse";
  const position = (value: number) => ((high - value) / (high - low)) * 100;
  const format = (value: number) =>
    metric.statistic === "tpr_at_fpr"
      ? formatMetricValue(metric, value)
      : String(Number(value.toPrecision(4)));

  return (
    <div className={styles.plot} data-tone={tone}>
      {tone && (
        <span
          className={styles.change}
          aria-label={tone === "better" ? "AIM 대비 개선" : "AIM 대비 저하"}
        >
          {tone === "better" ? "↑" : "↓"}
        </span>
      )}
      <div className={styles.plotArea}>
        {aim != null && (
          <span
            className={styles.aimLine}
            style={{ top: `${position(aim)}%` }}
            aria-hidden="true"
          />
        )}
        {metric.target != null && (
          <span className={styles.targetLine} style={{ top: `${position(metric.target)}%` }}>
            목표 {metric.target}
          </span>
        )}
        {models.map(({ key, label, symbol }, index) => {
          const stat = readings[index];
          const entry = series[index];
          const name = entry?.label ?? label;
          const left = `${12.5 + index * 25}%`;
          if (stat?.mean == null) {
            return (
              <span
                key={key}
                className={styles.missingPoint}
                style={{ left }}
                title={`${name} 미측정${stat?.reason ? ` · ${stat.reason}` : ""}`}
                aria-label={`${name} 미측정${stat?.reason ? ` · ${stat.reason}` : ""}`}
              >
                —
              </span>
            );
          }
          const y = position(stat.mean);
          const sd = stat.sampleSd;
          const summary = `${name}${entry?.excluded ? " · 주 비교 제외" : ""} · 평균 ${formatMetricValue(metric, stat.mean)} · 표본 표준편차 ${formatMetricValue(metric, sd, "sd")} · 유효 생성 n=${stat.n}${entry?.comparisonNote ? ` · ${entry.comparisonNote}` : ""}`;
          return (
            <div key={key} className={styles.plotSeries} style={{ left }} data-series={key}>
              {sd !== null && (
                <span
                  className={styles.errorBar}
                  style={{
                    top: `${position(stat.mean + sd)}%`,
                    height: `${position(stat.mean - sd) - position(stat.mean + sd)}%`,
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                className={styles.point}
                style={{ top: `${y}%` }}
                tabIndex={0}
                data-tooltip-below={y < 50}
                aria-label={summary}
              >
                <span aria-hidden="true">
                  {symbol}
                  {entry?.excluded ? "†" : ""}
                </span>
                <span className={styles.pointValue} aria-hidden="true">
                  {format(stat.mean)}
                </span>
                <span className={styles.tooltip} aria-hidden="true">
                  {summary}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
