import type { BaselineStat, RecordedBaseline } from "./baseline-loader";
import type { SourceMetric } from "./schema";
import type { RecordedStat } from "./loader";

export type RecordedMetricDefinition = Pick<
  SourceMetric,
  | "key"
  | "display_name"
  | "axis"
  | "unit"
  | "direction"
  | "target"
  | "reference_scope"
  | "attack"
  | "fpr"
  | "tie_handling"
  | "score_transform"
> & { statistic: SourceMetric["statistic"] | "rmse" | "mae" | "r2" };

export const scopeLabels: Record<SourceMetric["reference_scope"], string> = {
  full_output: "전체 출력",
  common_n: "공통 N",
  rank_sample: "순위 변환 표본",
  official_sample: "공식 평가 표본",
  c2st_sample: "C2ST 표본",
};

export const statusLabels: Record<SourceMetric["status"], string> = {
  measured: "측정 완료",
  not_applicable: "적용 불가",
  failed: "평가 실패",
  not_computed: "미계산",
  missing_unknown: "누락 · 사유 미확인",
};

export function directionLabel(metric: RecordedMetricDefinition) {
  switch (metric.direction) {
    case "higher":
      return "↑ 높을수록 좋음";
    case "lower":
      return "↓ 낮을수록 좋음";
    case "closer_to_target":
      return `→${metric.target} 목표에 가까울수록 좋음`;
  }
}

export function recordedMetricName(metric: RecordedMetricDefinition) {
  if (metric.attack === null) {
    return metric.display_name.replace(/ \((full_output|common_n)\)$/, "");
  }
  const attack = metric.attack === "max" ? "최대" : metric.attack;
  const statistic =
    metric.statistic === "tpr_at_fpr"
      ? `TPR@FPR ${metric.fpr === null ? "미확인" : `${metric.fpr * 100}%`} (${metric.key.endsWith("_rand") ? "무작위 동점 처리" : "결정적 동점 처리"})`
      : "AUC";
  return `MIA ${attack} ${statistic}`;
}

export function rawValue(value: number | null) {
  return value === null ? "—" : String(value);
}

export function previewValue(value: number | null) {
  return value === null ? "—" : String(Number(value.toPrecision(6)));
}

export function formatMetricValue(
  metric: RecordedMetricDefinition,
  value: number | null,
  kind: "value" | "sd" | "change" = "value",
) {
  if (value === null) return "—";
  if (
    metric.statistic === "tpr_at_fpr" &&
    (metric.unit === "fraction" || metric.unit === "proportion")
  ) {
    const scaled = Number((value * 100).toPrecision(6));
    return `${kind === "change" && scaled > 0 ? "+" : ""}${scaled}${kind === "value" ? "%" : " pp"}`;
  }
  return kind === "change" ? formatChange(value) : previewValue(value);
}

export function improvement(metric: RecordedMetricDefinition, current: number, reference: number) {
  if (metric.direction === "closer_to_target" && metric.target === null) return null;

  const target = metric.target ?? 0;
  const change =
    metric.direction === "higher"
      ? current - reference
      : metric.direction === "lower"
        ? reference - current
        : Math.abs(reference - target) - Math.abs(current - target);
  const scale = Math.max(Math.abs(current), Math.abs(reference), Math.abs(target));
  return Math.abs(change) <= Number.EPSILON * scale * 4 ? 0 : change;
}

export function baselineDifference(
  metric: RecordedMetricDefinition,
  current: RecordedStat | undefined,
  baseline: BaselineStat | undefined,
) {
  if (
    !current?.comparisonKey ||
    !baseline?.comparisonKeys.includes(current.comparisonKey) ||
    current.mean === null ||
    baseline.mean === null
  )
    return null;

  return improvement(metric, current.mean, baseline.mean);
}

export function formatChange(change: number) {
  return `${change > 0 ? "+" : ""}${Number(change.toPrecision(8))}`;
}

export function baselineName(baseline: RecordedBaseline) {
  return `${baseline.modelName} · ${baseline.setting} · ${baseline.sourceExperiment}`;
}

export function baselineComparisonNote(
  baseline: RecordedBaseline,
  key: string,
  dataset: string,
  evidence?: { baselineId: string; status: string; comparable?: boolean }[],
) {
  if (baseline.excluded) return "주 비교 제외·참고용";
  if (baseline.dataset !== dataset) return "비교 데이터셋이 다름";
  const stat = baseline.metrics[key];
  if (stat?.mean == null)
    return stat ? (stat.missingReason ?? statusLabels[stat.status]) : "Baseline 지표 미측정";
  const pair = evidence?.find(({ baselineId }) => baselineId === baseline.id);
  return pair?.comparable ? pair.status : "비교 조건 확인 필요";
}

export const datasetLabels: Record<string, string> = {
  adult: "Adult",
  default_credit: "Default Credit",
  bank_marketing: "Bank Marketing",
  shoppers: "Online Shoppers",
  magic: "MAGIC",
  acs_mobility_ca: "ACS Mobility · California",
  california_housing: "California Housing",
};
