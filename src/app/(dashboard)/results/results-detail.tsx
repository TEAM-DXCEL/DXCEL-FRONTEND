import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { RecordedBaseline } from "@/features/recorded-comparison/baseline-loader";
import {
  datasetLabels,
  directionLabel,
  baselineDifference,
  formatMetricValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
  type RecordedMetricDefinition,
} from "@/features/recorded-comparison/model";
import type { SelectedPerformance } from "@/features/selected-experiments/source";
import styles from "./results.module.css";

const axes = [
  ["privacy", "Privacy"],
  ["utility", "Utility"],
  ["fidelity", "Fidelity"],
] as const;

export function ResultsDetail({
  dataset,
  datasets,
  baselines,
  groups,
  allMetrics,
  referenceBaseline,
  canCompareToAim,
  baselineAvailable,
  experimentsAvailable,
}: {
  dataset: string | undefined;
  datasets: string[];
  baselines: RecordedBaseline[];
  groups: SelectedPerformance["groups"];
  allMetrics: RecordedMetricDefinition[];
  referenceBaseline: RecordedBaseline | undefined;
  canCompareToAim: (condition: SelectedPerformance["groups"][number]["condition"]) => boolean;
  baselineAvailable: boolean;
  experimentsAvailable: boolean;
}) {
  const datasetBaselines = baselines.filter((entry) => entry.dataset === dataset);
  const datasetGroups = groups.filter(({ condition }) => condition.dataset === dataset);
  const columns = [
    ...datasetBaselines.map((entry) => ({
      id: entry.id,
      label: entry.modelName,
      detail: `${entry.sourceExperiment} · ${entry.setting}`,
      displayedGenerationN: entry.displayedGenerationN,
      limits: entry.comparisonLimits,
      comparisonNote: entry.comparisonLimits?.length ? "비교 제한 있음" : null,
      baseline: true,
      comparableToAim: false,
      exclusion: entry.excluded ? entry.exclusionReason : null,
      reading: (key: string) => {
        const stat = entry.metrics[key];
        return (
          stat && {
            mean: stat.mean,
            sampleSd: stat.sampleSd,
            n: stat.n,
            expected: stat.expected,
            reason: stat.missingReason ?? statusLabels[stat.status],
          }
        );
      },
    })),
    ...datasetGroups.map(({ condition, summaries }) => ({
      id: condition.id,
      label: condition.experimentId,
      detail: condition.label,
      displayedGenerationN: condition.displayedGenerationN,
      limits: condition.comparisonEvidence?.find(
        ({ baselineId }) => baselineId === referenceBaseline?.id,
      )?.limits,
      comparisonNote: condition.referenceOnly
        ? "참고용"
        : (condition.comparisonEvidence?.find(
            ({ baselineId }) => baselineId === referenceBaseline?.id,
          )?.status ?? "비교 조건 확인 필요"),
      baseline: false,
      comparableToAim: canCompareToAim(condition),
      exclusion: null,
      reading: (key: string) => {
        const stat = condition.metrics[key];
        return (
          stat && {
            mean: stat.mean,
            sampleSd: stat.sampleSd,
            n: stat.n,
            expected: condition.runIds.length,
            reason:
              summaries[key] ?? stat.statuses.map((status) => statusLabels[status]).join(" · "),
          }
        );
      },
    })),
  ];
  const metrics = allMetrics.filter(({ key }) => columns.some(({ reading }) => reading(key)));
  return (
    <Card aria-labelledby="results-detail">
      <h2 id="results-detail" className="text-heading-sm">
        상세 수치
      </h2>
      {datasets.length > 0 && (
        <nav aria-label="결과표 데이터셋" className="flex flex-wrap gap-control-gap">
          {datasets.map((id) => (
            <Link
              key={id}
              href={{ pathname: "/results", query: { dataset: id } }}
              prefetch={false}
              scroll={false}
              aria-current={id === dataset ? "page" : undefined}
              className="rounded-control border-thin border-border px-control-inset py-1.5 text-label hover:bg-surface-hover aria-[current=page]:border-primary aria-[current=page]:bg-primary-subtle aria-[current=page]:text-primary-text"
            >
              {datasetLabels[id] ?? id}
            </Link>
          ))}
        </nav>
      )}
      {(!experimentsAvailable || !baselineAvailable) && (
        <p className="text-body text-foreground-muted">
          {[!baselineAvailable && "Baseline", !experimentsAvailable && "선정 실험"]
            .filter(Boolean)
            .join(" 및 ")}{" "}
          결과를 불러올 수 없습니다.
        </p>
      )}
      {columns.length > 0 && (
        <>
          <p id="results-note" className="text-caption text-foreground-muted">
            평균 ± 표본 표준편차 · n = 유효 생성 반복 수.
            {referenceBaseline && (
              <span className="mt-1 block">
                {referenceBaseline.modelName} ({referenceBaseline.setting}) 대비{" "}
                <span className="font-semibold text-success">더 좋음</span> ·{" "}
                <span className="font-semibold text-danger">더 나쁨</span> · 비교 근거가 있는 값에만
                색상 적용. 비교 제한은 각 열에서 확인 · 통계적 유의성 미평가.
              </span>
            )}
          </p>
          <div className={styles.scroll} role="region" tabIndex={0} aria-label="데이터셋별 지표 표">
            <table className={styles.table} aria-describedby="results-note">
              <caption className="sr-only">
                {dataset ? (datasetLabels[dataset] ?? dataset) : ""} 실험 결과
              </caption>
              <thead>
                <tr>
                  <th scope="col">평가 지표</th>
                  {columns.map(
                    ({
                      id,
                      label,
                      detail,
                      baseline,
                      exclusion,
                      comparisonNote,
                      limits,
                      displayedGenerationN,
                    }) => (
                      <th
                        key={id}
                        scope="col"
                        data-group-id={id}
                        data-baseline={baseline}
                        data-reference={id === referenceBaseline?.id}
                      >
                        <span className="block text-label font-semibold">{label}</span>
                        {id === referenceBaseline?.id && (
                          <span className="block text-caption text-primary-text">비교 기준</span>
                        )}
                        <span className="block text-caption text-foreground-muted">{detail}</span>
                        {displayedGenerationN !== undefined && (
                          <span className="block text-caption">
                            표기 생성 n={displayedGenerationN}
                          </span>
                        )}
                        {comparisonNote &&
                          (limits?.length ? (
                            <details className="text-caption text-foreground-muted">
                              <summary className="cursor-pointer">{comparisonNote}</summary>
                              <ul className="list-disc pl-control-inset">
                                {limits.map((limit) => (
                                  <li key={limit}>{limit}</li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            <span className="block text-caption text-foreground-muted">
                              {comparisonNote}
                            </span>
                          ))}
                        {exclusion && (
                          <span
                            className="block text-caption text-foreground-muted"
                            title={exclusion}
                          >
                            주 비교 제외 · 참고용
                          </span>
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              {axes.map(([axis, label]) => {
                const rows = metrics.filter((metric) => metric.axis === axis);
                if (!rows.length) return null;
                return (
                  <tbody key={axis}>
                    {rows.map((metric, index) => (
                      <tr
                        key={metric.key}
                        data-metric-key={metric.key}
                        data-reference-scope={metric.reference_scope}
                        data-axis-start={index === 0}
                      >
                        <th scope="row">
                          {index === 0 && (
                            <span className="mb-1 inline-block rounded-control bg-primary-subtle px-2 text-table-head text-primary-text">
                              {label}
                            </span>
                          )}
                          <span className="block font-medium">{recordedMetricName(metric)}</span>
                          <span className="block text-caption text-foreground-muted">
                            {scopeLabels[metric.reference_scope]} · {directionLabel(metric)}
                          </span>
                        </th>
                        {columns.map(({ id, baseline, comparableToAim, reading }) => {
                          const stat = reading(metric.key);
                          const reference = comparableToAim
                            ? referenceBaseline?.metrics[metric.key]?.mean
                            : null;
                          const change =
                            reference != null
                              ? baselineDifference(
                                  metric,
                                  datasetGroups.find(({ condition }) => condition.id === id)
                                    ?.condition.metrics[metric.key],
                                  referenceBaseline?.metrics[metric.key],
                                )
                              : null;
                          const better = change !== null && change > 0;
                          const worse = change !== null && change < 0;
                          const tone = better ? "text-success" : worse ? "text-danger" : "";

                          return (
                            <td
                              key={id}
                              data-group-id={id}
                              data-baseline={baseline}
                              data-reference={id === referenceBaseline?.id}
                              title={stat?.mean == null ? stat?.reason : stat?.mean.toString()}
                            >
                              {stat?.mean == null ? (
                                <>
                                  <span aria-label="미측정">—</span>
                                  {stat && (
                                    <span className="text-caption text-foreground-muted">
                                      {" · "}n={stat.n}/{stat.expected}
                                    </span>
                                  )}
                                  {stat?.reason && (
                                    <span className="block text-caption text-foreground-muted">
                                      {stat.reason}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span
                                    className={`block font-mono text-table font-semibold tabular-nums ${tone}`}
                                  >
                                    {(better || worse) && (
                                      <span className="sr-only">
                                        {better ? "AIM 대비 더 좋음: " : "AIM 대비 더 나쁨: "}
                                      </span>
                                    )}
                                    {(better || worse) && (
                                      <span aria-hidden="true">{better ? "▲ " : "▼ "}</span>
                                    )}
                                    {formatMetricValue(metric, stat.mean)}
                                  </span>
                                  <span className="block text-caption text-foreground-muted">
                                    {stat.sampleSd !== null &&
                                      `± ${formatMetricValue(metric, stat.sampleSd, "sd")} · `}
                                    n={stat.n}/{stat.expected}
                                    {stat.sampleSd === null && " · 표준편차 —"}
                                  </span>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
          <Link
            href="/compare"
            className="self-start text-label text-primary-text underline underline-offset-4"
          >
            차트로 비교하기
          </Link>
        </>
      )}
    </Card>
  );
}
