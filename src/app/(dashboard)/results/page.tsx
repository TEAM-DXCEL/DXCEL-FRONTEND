import Link from "next/link";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Card } from "@/components/ui/card";
import { loadBaselineCatalog } from "@/features/recorded-comparison/baseline-loader";
import {
  datasetLabels,
  directionLabel,
  improvement,
  previewValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
} from "@/features/recorded-comparison/model";
import { loadSelectedPerformance } from "@/features/selected-experiments/source";
import styles from "./results.module.css";

export const metadata = { title: "결과표 | DXCEL" };

const axes = [
  ["privacy", "Privacy"],
  ["utility", "Utility"],
  ["fidelity", "Fidelity"],
] as const;

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string | string[] }>;
}) {
  const [{ dataset: requested }, catalog, selected] = await Promise.all([
    searchParams,
    loadBaselineCatalog(),
    loadSelectedPerformance().catch(() => null),
  ]);
  const baselines = catalog.status === "ready" ? catalog.data.baselines : [];
  const groups = selected?.groups ?? [];
  const datasetIds = new Set([
    ...baselines.map(({ dataset }) => dataset),
    ...groups.map(({ condition }) => condition.dataset),
  ]);
  const datasets = [...datasetIds];
  const dataset =
    typeof requested === "string" && datasetIds.has(requested)
      ? requested
      : (datasets.find((id) => id === "adult") ?? datasets[0]);
  const datasetBaselines = baselines.filter((entry) => entry.dataset === dataset);
  const comparableBaselines = new Map(
    selected?.baselineComparisons
      .filter(({ status }) => status === "comparable_with_explicit_historical_version_limit")
      .map(({ evaluation_group, baseline_id }) => [evaluation_group, baseline_id]),
  );
  const referenceBaseline = datasetBaselines.find(
    ({ model, excluded }) => model === "aim" && !excluded,
  );
  const datasetGroups = groups.filter(({ condition }) => condition.dataset === dataset);
  const columns = [
    ...datasetBaselines.map((entry) => ({
      id: entry.id,
      label: entry.modelName,
      detail: entry.setting,
      baseline: true,
      exclusion: entry.excluded ? entry.exclusionReason : null,
      reading: (key: string) => {
        const stat = entry.metrics[key];
        return (
          stat && {
            ...stat,
            reason: stat.missingReason ?? statusLabels[stat.status],
          }
        );
      },
    })),
    ...datasetGroups.map(({ condition, summaries }) => ({
      id: condition.id,
      label: condition.experimentId,
      detail: condition.condition,
      baseline: false,
      exclusion: null,
      reading: (key: string) => {
        const stat = condition.metrics[key];
        return (
          stat && {
            ...stat,
            expected: condition.runIds.length,
            reason:
              summaries[key] ?? stat.statuses.map((status) => statusLabels[status]).join(" · "),
          }
        );
      },
    })),
  ];
  const metrics = [
    ...new Map(
      [
        ...(catalog.status === "ready" ? catalog.data.metrics : []),
        ...(selected?.metrics ?? []),
      ].map((metric) => [metric.key, metric] as const),
    ).values(),
  ].filter(({ key }) => columns.some(({ reading }) => reading(key)));

  return (
    <DashboardPage title="실험 결과표">
      <Card>
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
        {(!selected || catalog.status !== "ready") && (
          <p className="text-body text-foreground-muted">
            {[catalog.status !== "ready" && "Baseline", !selected && "선정 실험"]
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
                  <span className="font-semibold text-danger">더 나쁨</span> · 비교 근거가 있는
                  값에만 색상 적용. 평가 버전 차이 있음 · 통계적 유의성 미평가.
                </span>
              )}
            </p>
            <div
              className={styles.scroll}
              role="region"
              tabIndex={0}
              aria-label="데이터셋별 지표 표"
            >
              <table className={styles.table} aria-describedby="results-note">
                <caption className="sr-only">
                  {dataset ? (datasetLabels[dataset] ?? dataset) : ""} 실험 결과
                </caption>
                <thead>
                  <tr>
                    <th scope="col">평가 지표</th>
                    {columns.map(({ id, label, detail, baseline, exclusion }) => (
                      <th
                        key={id}
                        scope="col"
                        data-baseline={baseline}
                        data-reference={id === referenceBaseline?.id}
                      >
                        <span className="block text-label font-semibold">{label}</span>
                        {id === referenceBaseline?.id && (
                          <span className="block text-caption text-primary-text">비교 기준</span>
                        )}
                        <span className="block text-caption text-foreground-muted">{detail}</span>
                        {exclusion && (
                          <span
                            className="block text-caption text-foreground-muted"
                            title={exclusion}
                          >
                            주 비교 제외 · 참고용
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                {axes.map(([axis, label]) => {
                  const rows = metrics.filter((metric) => metric.axis === axis);
                  if (!rows.length) return null;
                  return (
                    <tbody key={axis}>
                      {rows.map((metric, index) => (
                        <tr key={metric.key} data-axis-start={index === 0}>
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
                          {columns.map(({ id, baseline, reading }) => {
                            const stat = reading(metric.key);
                            const reference =
                              referenceBaseline &&
                              comparableBaselines.get(id) === referenceBaseline.id
                                ? referenceBaseline.metrics[metric.key]?.mean
                                : null;
                            const change =
                              !baseline && stat?.mean != null && reference != null
                                ? improvement(metric, stat.mean, reference)
                                : null;
                            const better = change !== null && change > 0;
                            const worse = change !== null && change < 0;
                            const tone = better ? "text-success" : worse ? "text-danger" : "";

                            return (
                              <td
                                key={id}
                                data-baseline={baseline}
                                data-reference={id === referenceBaseline?.id}
                                title={stat?.mean == null ? stat?.reason : stat?.mean.toString()}
                              >
                                {stat?.mean == null ? (
                                  <>
                                    <span aria-label="미측정">—</span>
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
                                      {previewValue(stat.mean)}
                                    </span>
                                    <span className="block text-caption text-foreground-muted">
                                      {stat.sampleSd !== null &&
                                        `± ${previewValue(stat.sampleSd)} · `}
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
    </DashboardPage>
  );
}
