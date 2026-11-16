"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import styles from "@/features/comparison/comparison.module.css";
import type { BaselineCatalog, RecordedBaseline } from "./baseline-loader";
import {
  baselineName,
  datasetLabels,
  directionLabel,
  formatMetricValue,
  rawValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
  type RecordedMetricDefinition,
} from "./model";

const defaultMetric = "by_task";

function metricLabel(metric: RecordedMetricDefinition) {
  return `${recordedMetricName(metric)} · ${scopeLabels[metric.reference_scope]}`;
}

export function BaselineMetricDetail({
  baseline,
  metric,
  open,
}: {
  baseline: RecordedBaseline;
  metric: RecordedMetricDefinition;
  open?: boolean;
}) {
  const stat = baseline.metrics[metric.key];
  return (
    <details
      open={open}
      className="mt-control-inset rounded-control border-thin border-border p-control-inset"
    >
      <summary className="cursor-pointer text-label">Baseline 생성 반복과 평가 조건 보기</summary>
      <div className="mt-control-inset grid gap-control-gap text-meta">
        <p>
          {baselineName(baseline)} · {datasetLabels[baseline.dataset] ?? baseline.dataset}
        </p>
        {baseline.displayedGenerationN !== undefined && (
          <p>표기 생성 n={baseline.displayedGenerationN}</p>
        )}
        {baseline.comparisonLimits?.length ? (
          <details>
            <summary className="cursor-pointer text-label">비교 제한</summary>
            <ul className="list-disc pl-control-inset">
              {baseline.comparisonLimits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {baseline.nativeDiagnostics?.length ? (
          <details>
            <summary className="cursor-pointer text-label">
              Native population 진단 · 별도 평가
            </summary>
            <ul className="list-disc pl-control-inset">
              {baseline.nativeDiagnostics.map(({ label, mean, sampleSd, n, missingReason }) => (
                <li key={label}>
                  {label} · {rawValue(mean)} ± {rawValue(sampleSd)} · 유효 생성 n={n}
                  {missingReason && ` · ${missingReason}`}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {baseline.excluded && <p>주 비교 제외·참고용 · {baseline.exclusionReason}</p>}
        <p>
          {metricLabel(metric)} · {directionLabel(metric)}
        </p>
        {stat ? (
          <>
            <p className="break-all font-mono">
              {formatMetricValue(metric, stat.mean)} ±{" "}
              {formatMetricValue(metric, stat.sampleSd, "sd")} · 유효 생성 반복 {stat.n}/
              {stat.expected}회
            </p>
            {stat.mean === null ? (
              <p>
                {statusLabels[stat.status]} · {stat.missingReason ?? "사유 미확인"}
              </p>
            ) : (
              stat.sdMissingReason && <p>{stat.sdMissingReason}</p>
            )}
            <ol className="grid gap-control-gap">
              {stat.points.map((point) => (
                <li
                  key={point.seed}
                  className="rounded-control bg-surface-muted p-control-inset [overflow-wrap:anywhere]"
                >
                  <p>
                    {baseline.displayedGenerationN === undefined ? "시드" : "원본 생성 반복"}{" "}
                    {point.seed} ·{" "}
                    <span className="font-mono">{formatMetricValue(metric, point.value)}</span>
                    {point.value === null &&
                      ` · ${statusLabels[point.status]} · ${point.missingReason ?? "사유 미확인"}`}
                  </p>
                  {point.evaluationCount !== null && point.evaluationCount > 1 && (
                    <p>이 생성물의 평가 추출·반복 {point.evaluationCount}회</p>
                  )}
                  {point.evaluationMissingReason && <p>{point.evaluationMissingReason}</p>}
                  <p className="text-caption text-foreground-muted">
                    기록 ε {baseline.runs[point.seed]!.epsilon} · δ{" "}
                    {baseline.runs[point.seed]!.delta}
                  </p>
                  <p className="text-caption text-foreground-muted">
                    {baseline.runs[point.seed]!.label} · {baseline.sourcePaths[point.sourcePath]}
                    {point.sourceField && ` · ${point.sourceField}`}
                  </p>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p>— · 이 Baseline에 지표 기록이 없습니다.</p>
        )}
        <p className="text-foreground-muted">
          {baseline.protocol} · 분할 {baseline.split} · 공통 N{" "}
          {baseline.commonN?.toLocaleString("ko-KR") ?? "미확인"}행 · 생성량{" "}
          {baseline.outputRows.map((rows) => rows.toLocaleString("ko-KR")).join(" / ")}행
        </p>
      </div>
    </details>
  );
}

export function BaselineCatalogTable({ catalog }: { catalog: BaselineCatalog }) {
  const [metricKey, setMetricKey] = useState(defaultMetric);
  const [detailId, setDetailId] = useState<string>();
  const metrics = new Map(catalog.metrics.map((metric) => [metric.key, metric]));
  const datasets = [...new Set(catalog.baselines.map(({ dataset }) => dataset))];
  const models = [...new Map(catalog.baselines.map(({ model, modelName }) => [model, modelName]))];
  const byDatasetModel = new Map(
    catalog.baselines.map((baseline) => [`${baseline.dataset}:${baseline.model}`, baseline]),
  );
  const keyFor = (baseline: RecordedBaseline) =>
    metricKey === defaultMetric
      ? baseline.task === "regression"
        ? "xgb_rmse"
        : "xgb_cn"
      : metricKey;
  const detail = catalog.baselines.find(({ id }) => id === detailId);
  const detailMetric = detail && metrics.get(keyFor(detail));

  return (
    <section className="rounded-card border-thin border-border bg-surface p-card-inset text-foreground">
      <div className="mb-control-inset flex flex-wrap items-end justify-between gap-control-inset">
        <div>
          <h2 className="text-heading-sm">데이터셋별 기준값</h2>
          <p className="text-meta text-foreground-muted">
            {catalog.baselines.some(
              ({ displayedGenerationN }) => displayedGenerationN !== undefined,
            )
              ? "공식 Baseline"
              : "paper_aligned"}{" "}
            · {datasets.length}개 데이터셋 · 모델 {models.length}종
          </p>
        </div>
        <Select
          label="표에 표시할 지표"
          value={metricKey}
          options={[
            { value: defaultMetric, label: "데이터셋 기본 지표" },
            ...catalog.metrics.map((metric) => ({ value: metric.key, label: metricLabel(metric) })),
          ]}
          onValueChange={setMetricKey}
          controlSize="sm"
          fieldClassName="w-field-md max-w-full"
        />
      </div>
      <p className="mb-control-gap text-meta text-foreground-muted">
        평균을 눌러 표본 표준편차, 생성 반복값과 비교 조건을 확인하세요.
      </p>
      <div
        role="region"
        aria-label="데이터셋별 공식 Baseline"
        tabIndex={0}
        className="overflow-x-auto rounded-control border-thin border-border focus-visible:bg-surface-muted"
      >
        <table className={`${styles.archiveTable} ${styles.baselineCatalogTable}`}>
          <thead>
            <tr>
              <th scope="col">데이터셋 · 지표</th>
              {models.map(([model, name]) => (
                <th key={model} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset) => {
              const first = byDatasetModel.get(`${dataset}:${models[0]![0]}`)!;
              const key = keyFor(first);
              const metric = metrics.get(key);
              const sameSource = models.every(
                ([model]) =>
                  byDatasetModel.get(`${dataset}:${model}`)?.sourceExperiment ===
                  first.sourceExperiment,
              );
              return (
                <tr key={dataset}>
                  <th scope="row">
                    <span className="flex flex-wrap items-baseline gap-x-control-gap">
                      <strong className="text-label">{datasetLabels[dataset] ?? dataset}</strong>
                      {sameSource && (
                        <span className="font-mono text-caption text-foreground-muted">
                          {first.sourceExperiment}
                        </span>
                      )}
                    </span>
                    {metric && (
                      <small title={directionLabel(metric)}>
                        {metricLabel(metric)} · {directionLabel(metric).split(" ")[0]}
                      </small>
                    )}
                  </th>
                  {models.map(([model]) => {
                    const baseline = byDatasetModel.get(`${dataset}:${model}`)!;
                    const stat = baseline.metrics[key];
                    return (
                      <td key={model}>
                        <button
                          type="button"
                          className={styles.recordedBaselineCell}
                          title={
                            stat
                              ? metric
                                ? `${formatMetricValue(metric, stat.mean)} ± ${formatMetricValue(metric, stat.sampleSd, "sd")} · ${stat.n}/${stat.expected}회`
                                : undefined
                              : undefined
                          }
                          aria-pressed={detailId === baseline.id}
                          aria-controls="baseline-catalog-detail"
                          aria-label={`${datasetLabels[dataset] ?? dataset} · ${baseline.modelName} · ${metric ? formatMetricValue(metric, stat?.mean ?? null) : "—"} · 생성 반복 보기`}
                          onClick={() => {
                            setDetailId(baseline.id);
                            requestAnimationFrame(() =>
                              document
                                .getElementById("baseline-catalog-detail")
                                ?.scrollIntoView({ block: "nearest" }),
                            );
                          }}
                        >
                          <span className="flex flex-wrap items-center gap-x-control-gap">
                            <strong className="font-mono text-table font-semibold tabular-nums">
                              {metric ? formatMetricValue(metric, stat?.mean ?? null) : "—"}
                            </strong>
                            {baseline.excluded && (
                              <span className={styles.recordedReferenceTag}>
                                주 비교 제외·참고용
                              </span>
                            )}
                          </span>
                          {stat?.mean != null && (
                            <small>
                              ± {metric ? formatMetricValue(metric, stat.sampleSd, "sd") : "—"} · n=
                              {stat.n}/{stat.expected}
                            </small>
                          )}
                          {!sameSource && <small>{baseline.sourceExperiment}</small>}
                          {baseline.displayedGenerationN !== undefined && (
                            <small>표기 생성 n={baseline.displayedGenerationN}</small>
                          )}
                          {baseline.comparisonLimits?.length ? <small>비교 제한 있음</small> : null}
                          {stat?.mean == null && (
                            <small>{stat?.missingReason ?? "지표 기록 없음"}</small>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div id="baseline-catalog-detail">
        {detail && detailMetric && (
          <BaselineMetricDetail key={detail.id} baseline={detail} metric={detailMetric} open />
        )}
      </div>
    </section>
  );
}
