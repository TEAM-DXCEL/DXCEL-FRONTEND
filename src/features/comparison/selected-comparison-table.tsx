import { useInfiniteWindow } from "@/hooks/use-infinite-window";
import {
  comparisonMetrics,
  difference,
  metricMean,
  type AxisMetrics,
  sampleBaseline,
  score,
  type SampleExperiment,
} from "./sample-data";
import {
  metricCriterion,
  metricImprovement,
  metricTarget,
  metricName,
} from "@/lib/evaluation-metrics";
import styles from "./comparison.module.css";

export function SelectedComparisonTable({
  entries,
  metrics,
  selectedId,
  onInspect,
  onRemove,
  onClear,
}: {
  entries: readonly SampleExperiment[];
  metrics: AxisMetrics;
  selectedId: string;
  onInspect: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const { rootRef, sentinelRef, limit, hasMore, loadMoreWithFocus } = useInfiniteWindow(
    entries.length,
  );

  return (
    <section className={styles.archiveSection} aria-labelledby="selected-comparison-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionIndex}>02 / SELECTED COMPARISON</span>
          <h2 id="selected-comparison-title">선택한 실험의 성능 비교</h2>
        </div>
        {entries.length > 1 && (
          <button type="button" className={styles.pathToggle} onClick={onClear}>
            실험 선택 해제
          </button>
        )}
      </div>
      <p role="status" className={styles.archiveHelp}>
        Baseline 고정 · 선택 실험 {entries.length - 1}개
        {entries.length === 1 && " · 위 목록에서 실험을 선택하면 비교가 시작됩니다."}
      </p>
      <p className={styles.archiveHelp}>
        막대는 원점수 평균입니다. 점선은 Baseline, 실선은 목표값입니다. +는 지표 기준에 따른
        개선이며, 목표형은 목표 오차가 줄어든 양을 표시합니다.
      </p>
      <div
        ref={rootRef}
        className={styles.archiveScroll}
        role="region"
        tabIndex={0}
        aria-label="선택한 실험의 성능 표"
      >
        <table className={`${styles.archiveTable} ${styles.scoreTable}`}>
          <thead>
            <tr>
              <th scope="col">실험</th>
              {comparisonMetrics.map((metric) => (
                <th key={metric} scope="col">
                  {metricName(metrics[metric])}
                  <span className={styles.tableCriterion}>{metricCriterion(metrics[metric])}</span>
                </th>
              ))}
              <th scope="col">선택</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, limit).map((entry) => {
              const isBaseline = entry.id === sampleBaseline.id;
              return (
                <tr key={entry.id} data-selected={selectedId === entry.id}>
                  <th scope="row">
                    <button
                      type="button"
                      className={styles.archiveExperiment}
                      aria-pressed={selectedId === entry.id}
                      onClick={() => onInspect(entry.id)}
                    >
                      <strong>{entry.label}</strong>
                      <span>{entry.title}</span>
                    </button>
                  </th>
                  {comparisonMetrics.map((axis) => {
                    const metric = metrics[axis];
                    const value = metricMean(entry, metric);
                    if (value === null) {
                      return (
                        <td key={axis} className={styles.missingValue}>
                          미측정
                        </td>
                      );
                    }

                    const baseline = metricMean(sampleBaseline, metric);
                    const delta = metricImprovement(metric, value, baseline);
                    const target = metricTarget(metric);
                    return (
                      <td key={axis}>
                        <div className={styles.scoreValue}>
                          <strong>{score(value)}</strong>
                          {!isBaseline && delta !== null && (
                            <span
                              className={
                                delta > 0
                                  ? styles.positiveDelta
                                  : delta < 0
                                    ? styles.negativeDelta
                                    : styles.neutralDelta
                              }
                            >
                              {difference(delta)}
                            </span>
                          )}
                        </div>
                        <div className={styles.scoreTrack} aria-hidden="true">
                          <span
                            style={{
                              width: `${value * 100}%`,
                              background: isBaseline
                                ? "var(--chart-baseline)"
                                : delta === null || delta === 0
                                  ? "var(--chart-neutral)"
                                  : delta < 0
                                    ? "var(--chart-negative)"
                                    : "var(--chart-positive)",
                            }}
                          />
                          {baseline !== null && <i style={{ left: `${baseline * 100}%` }} />}
                          {target !== undefined && (
                            <i className={styles.targetTick} style={{ left: `${target * 100}%` }} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td>
                    {isBaseline ? (
                      <span className={styles.goalTag}>고정</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.pathToggle}
                        onClick={() => onRemove(entry.id)}
                        aria-label={`${entry.label} 비교에서 제거`}
                      >
                        제거
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {hasMore && (
          <div ref={sentinelRef} className={styles.scrollEnd}>
            <button type="button" onClick={loadMoreWithFocus}>
              더 보기 ↓
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
