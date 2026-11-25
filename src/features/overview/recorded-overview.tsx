import { TableViewport } from "@/components/layout/table-viewport";
import type { BaselineCatalog } from "@/features/recorded-comparison/baseline-loader";
import type { ComparisonCondition } from "@/features/recorded-comparison/condition-chart";
import {
  baselineDifference,
  baselineName,
  datasetLabels,
  directionLabel,
  formatChange,
  previewValue,
  rawValue,
  recordedMetricName,
  scopeLabels,
  type RecordedMetricDefinition,
} from "@/features/recorded-comparison/model";

const axes = [
  { name: "Privacy", key: "mia_full_max" },
  { name: "Utility", key: "xgb_full" },
  { name: "Fidelity", key: "wsd3" },
];
const maxVisibleExperiments = 5;

export function RecordedOverview({
  conditions,
  definitions,
  catalog,
  local = false,
  replacement = false,
}: {
  conditions: readonly ComparisonCondition[];
  definitions: readonly RecordedMetricDefinition[];
  local?: boolean;
  replacement?: boolean;
  catalog: BaselineCatalog;
}) {
  if (catalog.dashboardMismatch) {
    return (
      <p className="rounded-card border-thin border-border bg-surface p-card-inset text-body text-foreground">
        비교 조건 미확인 · 실험 파일과 Baseline 파일의 버전 연결을 확인하세요.
      </p>
    );
  }
  const byKey = new Map(definitions.map((metric) => [metric.key, metric]));
  const metrics = axes.flatMap(({ name, key }) => {
    const metric = byKey.get(key);
    return metric ? [{ name, metric }] : [];
  });
  const datasets = new Set(conditions.map(({ dataset }) => dataset));
  const groups = catalog.baselines.filter(
    (baseline) => !baseline.excluded && datasets.has(baseline.dataset),
  );

  return (
    <section
      className="grid gap-panel-gap rounded-card border-thin border-border bg-surface p-card-inset text-foreground"
      aria-labelledby="recorded-overview-title"
    >
      <header>
        <p className="text-caption text-foreground-muted">
          {local ? "로컬 교체 검증 · 실험 결과" : "Supabase · 실험 결과"}
        </p>
        <h2 id="recorded-overview-title" className="text-heading-sm">
          세 지표 모두 Baseline보다 좋은 조건
        </h2>
        <p className="text-meta text-foreground-muted">
          같은 데이터셋과 Baseline 안에서 세 지표의 비교 조건이 모두 확인되고 모두 개선된 결과를
          실험 번호가 큰 순서대로 최대 {maxVisibleExperiments}건 표시합니다.
          {replacement &&
            " 비교는 기술 통계이며 비교 제한과 근거는 비교 화면에서 확인할 수 있습니다."}
        </p>
      </header>
      {metrics.length !== axes.length || !groups.length ? (
        <p className="text-body text-foreground-muted">
          비교에 필요한 지표 또는 Baseline이 미확인입니다.
        </p>
      ) : (
        <div className="grid gap-panel-gap">
          {groups.map((baseline) => {
            const regressionMetric =
              replacement && baseline.task === "regression"
                ? byKey.get("xgb_full_rmse")
                : undefined;
            const groupMetrics = regressionMetric
              ? metrics.map((entry) =>
                  entry.name === "Utility" ? { ...entry, metric: regressionMetric } : entry,
                )
              : metrics;
            const comparable = conditions.flatMap((condition) => {
              if (
                condition.dataset !== baseline.dataset ||
                condition.experimentId === null ||
                condition.referenceOnly ||
                condition.primaryCondition === false ||
                condition.includeInOverview === false
              )
                return [];
              const values = groupMetrics.flatMap(({ metric }) => {
                const stat = condition.metrics[metric.key];
                const delta = baselineDifference(metric, stat, baseline.metrics[metric.key]);
                return stat?.mean != null && delta !== null
                  ? [{ key: metric.key, mean: stat.mean, delta }]
                  : [];
              });
              return values.length === metrics.length ? [{ condition, values }] : [];
            });
            const improved = comparable.filter(({ values }) =>
              values.every(({ delta }) => delta > 0),
            );
            const visible = improved
              .toSorted(
                (a, b) =>
                  (b.condition.experimentId ?? "").localeCompare(
                    a.condition.experimentId ?? "",
                    "en",
                    { numeric: true },
                  ) || (b.condition.phase ?? 0) - (a.condition.phase ?? 0),
              )
              .slice(0, maxVisibleExperiments);
            return (
              <section
                key={baseline.id}
                className="grid gap-control-gap border-t border-border pt-control-inset"
              >
                <h3 className="text-label">
                  {datasetLabels[baseline.dataset] ?? baseline.dataset} · {baselineName(baseline)}
                </h3>
                <p className="text-meta text-foreground-muted">
                  비교 가능 {comparable.length}개 · 세 지표 모두 개선 {improved.length}개
                </p>
                {visible.length ? (
                  <TableViewport
                    label={`${datasetLabels[baseline.dataset] ?? baseline.dataset} ${baseline.modelName} 대비 결과`}
                  >
                    <table className="w-full border-collapse text-left text-table">
                      <thead className="bg-surface-muted">
                        <tr>
                          <th scope="col" className="px-control-inset py-control-gap">
                            실험 조건
                          </th>
                          {groupMetrics.map(({ name, metric }) => (
                            <MetricHeader
                              key={metric.key}
                              name={name}
                              metric={metric}
                              reference={baseline.metrics[metric.key]?.mean ?? null}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map(({ condition, values }) => (
                          <tr key={condition.id} className="border-t border-border">
                            <th scope="row" className="px-control-inset py-control-gap text-label">
                              {condition.experimentId} ·{" "}
                              {condition.phase === null
                                ? condition.label
                                : `Phase ${condition.phase} · ${condition.condition}`}
                              {condition.comparisonEvidence?.find(
                                ({ baselineId }) => baselineId === baseline.id,
                              )?.status && (
                                <small className="block text-foreground-muted">
                                  {
                                    condition.comparisonEvidence.find(
                                      ({ baselineId }) => baselineId === baseline.id,
                                    )?.status
                                  }
                                </small>
                              )}
                            </th>
                            {values.map(({ key, mean, delta }) => (
                              <td key={key} className="px-control-inset py-control-gap font-mono">
                                <span title={rawValue(mean)}>{previewValue(mean)}</span>{" "}
                                <span className="text-chart-positive">{formatChange(delta)}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableViewport>
                ) : (
                  <p className="text-meta text-foreground-muted">
                    {comparable.length
                      ? "세 지표에서 모두 Baseline보다 좋은 조건이 없습니다."
                      : "세 지표를 모두 비교할 수 있는 조건이 없습니다."}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetricHeader({
  name,
  metric,
  reference,
}: {
  name: string;
  metric: RecordedMetricDefinition;
  reference: number | null;
}) {
  return (
    <th scope="col" className="px-control-inset py-control-gap">
      <span className="block text-label">{name}</span>
      <span className="block text-caption text-foreground-muted">
        {recordedMetricName(metric)} · {scopeLabels[metric.reference_scope]} ·{" "}
        {directionLabel(metric)}
      </span>
      <span
        className="block font-mono text-caption text-foreground-muted"
        title={rawValue(reference)}
      >
        Baseline {previewValue(reference)}
      </span>
    </th>
  );
}
