import { DashboardPage } from "@/components/layout/dashboard-page";
import { loadBaselineCatalog } from "@/features/recorded-comparison/baseline-loader";
import {
  loadSelectedPerformance,
  type SelectedPerformance,
} from "@/features/selected-experiments/source";
import { MetricComparison } from "./metric-comparison";
import { ResultsDetail } from "./results-detail";

export const metadata = { title: "결과표 | DXCEL" };

const overviewMetricLabels = {
  xgb_cn: "XGB PR-AUC",
  xgb_rmse: "XGB RMSE",
  wsd1: "1-way WSD",
  wsd3: "3-way WSD",
  spear: "Spearman 오차",
  mia_cn_max: "MIA 최대 AUC",
  mia_cn_a2_tpr_rand: "MIA A2 TPR@FPR 1%",
};

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
  const aimByDataset = new Map(
    baselines
      .filter(({ model, excluded }) => model === "aim" && !excluded)
      .map((entry) => [entry.dataset, entry]),
  );
  const canCompareToAim = (condition: SelectedPerformance["groups"][number]["condition"]) => {
    const baseline = aimByDataset.get(condition.dataset);
    const pair = condition.comparisonEvidence?.find(
      ({ baselineId }) => baselineId === baseline?.id,
    );
    return (
      !condition.referenceOnly &&
      condition.primaryCondition !== false &&
      (pair?.comparable ?? pair?.status === "comparable_with_explicit_historical_version_limit")
    );
  };
  const referenceBaseline = dataset ? aimByDataset.get(dataset) : undefined;
  const metricsByKey = new Map(
    [...(catalog.status === "ready" ? catalog.data.metrics : []), ...(selected?.metrics ?? [])].map(
      (metric) => [metric.key, metric] as const,
    ),
  );
  const allMetrics = [...metricsByKey.values()];
  const overviewMetrics = Object.entries(overviewMetricLabels).flatMap(([key, shortLabel]) => {
    const metric = metricsByKey.get(key);
    return metric ? [{ ...metric, shortLabel }] : [];
  });
  const overviewKeys = new Set(overviewMetrics.map(({ key }) => key));
  const pickReadings = (
    readings: Record<
      string,
      { mean: number | null; sampleSd: number | null; n: number; missingReason?: string | null }
    >,
    missingReasons?: Record<string, string | null>,
  ) =>
    Object.fromEntries(
      Object.entries(readings)
        .filter(([key]) => overviewKeys.has(key))
        .map(([key, { mean, sampleSd, n, missingReason }]) => [
          key,
          { mean, sampleSd, n, reason: missingReasons?.[key] ?? missingReason },
        ]),
    );
  return (
    <DashboardPage title="실험 결과표">
      {selected?.generationCounts.map((counts) => (
        <p key={counts.experimentId} className="mb-control-gap text-caption text-foreground-muted">
          {counts.experimentId} · 독립 DP 부모 {counts.independentParents}개 · 복원 출력·평가{" "}
          {counts.outputs}개 · 조건별 n은 공유 부모 기준
        </p>
      ))}
      <MetricComparison
        baselines={baselines.map(
          ({ dataset, id, modelName, model, excluded, metrics, comparisonLimits }) => ({
            dataset,
            label: modelName,
            model,
            excluded,
            reference: aimByDataset.get(dataset)?.id === id,
            metrics: pickReadings(metrics),
            comparisonNote: comparisonLimits?.length ? "비교 제한 있음" : undefined,
          }),
        )}
        experiments={groups.map(({ condition, summaries }) => ({
          dataset: condition.dataset,
          label: `${condition.experimentId} · ${condition.label}${condition.referenceOnly ? " · 참고용" : ""}`,
          comparisonNote: condition.referenceOnly
            ? "참고용"
            : (condition.comparisonEvidence?.find(
                ({ baselineId }) => baselineId === aimByDataset.get(condition.dataset)?.id,
              )?.status ?? "비교 조건 확인 필요"),
          metrics: pickReadings(condition.metrics, summaries),
        }))}
        metrics={overviewMetrics}
      />
      <ResultsDetail
        dataset={dataset}
        datasets={datasets}
        baselines={baselines}
        groups={groups}
        allMetrics={allMetrics}
        referenceBaseline={referenceBaseline}
        canCompareToAim={canCompareToAim}
        baselineAvailable={catalog.status === "ready"}
        experimentsAvailable={selected !== null}
      />
    </DashboardPage>
  );
}
