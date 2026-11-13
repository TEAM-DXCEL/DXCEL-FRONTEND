import { DashboardPage } from "@/components/layout/dashboard-page";
import { loadBaselineCatalog } from "@/features/recorded-comparison/baseline-loader";
import { loadSelectedPerformance } from "@/features/selected-experiments/source";
import { MetricComparison } from "./metric-comparison";
import { ResultsDetail } from "./results-detail";

export const metadata = { title: "결과표 | DXCEL" };

const overviewMetricLabels = {
  xgb_cn: "XGB PR-AUC",
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
  const comparablePairs = new Set(
    selected?.baselineComparisons
      .filter(({ status }) => status === "comparable_with_explicit_historical_version_limit")
      .map(({ evaluation_group, baseline_id }) => JSON.stringify([evaluation_group, baseline_id])),
  );
  const canCompareToAim = (groupId: string, datasetId: string) => {
    const aim = aimByDataset.get(datasetId);
    return aim !== undefined && comparablePairs.has(JSON.stringify([groupId, aim.id]));
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
    readings: Record<string, { mean: number | null; sampleSd: number | null; n: number }>,
  ) =>
    Object.fromEntries(
      Object.entries(readings)
        .filter(([key]) => overviewKeys.has(key))
        .map(([key, { mean, sampleSd, n }]) => [key, { mean, sampleSd, n }]),
    );
  return (
    <DashboardPage title="실험 결과표">
      <MetricComparison
        baselines={baselines.map(({ dataset, id, modelName, model, excluded, metrics }) => ({
          dataset,
          label: modelName,
          model,
          excluded,
          reference: aimByDataset.get(dataset)?.id === id,
          metrics: pickReadings(metrics),
        }))}
        experiments={groups.map(({ condition }) => ({
          dataset: condition.dataset,
          label: `${condition.experimentId} · ${condition.condition}`,
          comparableToAim: canCompareToAim(condition.id, condition.dataset),
          metrics: pickReadings(condition.metrics),
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
