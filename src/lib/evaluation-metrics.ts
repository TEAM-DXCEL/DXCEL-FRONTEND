export type EvaluationAxis = "privacy" | "utility" | "fidelity";

type MetricDefinition = {
  axis: EvaluationAxis;
  name: string;
  variant?: string;
} & ({ direction: "higher" | "lower" } | { direction: "target"; target: number });

export const evaluationMetrics = {
  miaAucMaxFull: {
    axis: "privacy",
    name: "MIA AUC",
    variant: "최대 AUC · 전체 출력",
    direction: "target",
    target: 0.5,
  },
  miaAucAttackFull: {
    axis: "privacy",
    name: "MIA AUC",
    variant: "개별 공격 · 전체 출력",
    direction: "target",
    target: 0.5,
  },
  miaAucMaxCommonN: {
    axis: "privacy",
    name: "MIA AUC",
    variant: "최대 AUC · 공통 N",
    direction: "target",
    target: 0.5,
  },
  miaAucAttackCommonN: {
    axis: "privacy",
    name: "MIA AUC",
    variant: "개별 공격 · 공통 N",
    direction: "target",
    target: 0.5,
  },
  miaTprAtFpr1: { axis: "privacy", name: "MIA TPR@FPR 1%", direction: "lower" },
  xgbPrAuc: { axis: "utility", name: "XGB PR-AUC", direction: "higher" },
  rfPrAuc: { axis: "utility", name: "RF PR-AUC", direction: "higher" },
  xgbRocAuc: { axis: "utility", name: "XGB ROC-AUC", direction: "higher" },
  rfRocAuc: { axis: "utility", name: "RF ROC-AUC", direction: "higher" },
  rmse: { axis: "utility", name: "RMSE", variant: "회귀 데이터셋", direction: "lower" },
  r2: { axis: "utility", name: "R²", variant: "회귀 데이터셋", direction: "higher" },
  wd1: { axis: "fidelity", name: "1-way WD", direction: "lower" },
  wd2: { axis: "fidelity", name: "2-way WD", direction: "lower" },
  wd3: { axis: "fidelity", name: "3-way WD", direction: "lower" },
  spearmanError: { axis: "fidelity", name: "Spearman 상관 오차", direction: "lower" },
  billChangeTvd: { axis: "fidelity", name: "BILL 변화 TVD", direction: "lower" },
  c2stAuc: {
    axis: "fidelity",
    name: "C2ST AUC",
    variant: "보조 지표",
    direction: "target",
    target: 0.5,
  },
} satisfies Record<string, MetricDefinition>;

export type EvaluationMetric = keyof typeof evaluationMetrics;

export function metricName(metric: EvaluationMetric) {
  const definition: MetricDefinition = evaluationMetrics[metric];
  return definition.variant ? `${definition.name} · ${definition.variant}` : definition.name;
}

export function metricTarget(metric: EvaluationMetric) {
  const definition = evaluationMetrics[metric];
  return definition.direction === "target" ? definition.target : undefined;
}

export function metricCriterion(metric: EvaluationMetric) {
  const definition = evaluationMetrics[metric];
  switch (definition.direction) {
    case "higher":
      return "높을수록 좋음 ↑";
    case "lower":
      return "낮을수록 좋음 ↓";
    case "target":
      return `${definition.target}에 가까울수록 좋음`;
  }
}

export function metricImprovement(
  metric: EvaluationMetric,
  value: number,
  reference: number,
): number;
export function metricImprovement(
  metric: EvaluationMetric,
  value: number | null,
  reference: number | null,
): number | null;
export function metricImprovement(
  metric: EvaluationMetric,
  value: number | null,
  reference: number | null,
) {
  if (value === null || reference === null) return null;

  const definition = evaluationMetrics[metric];
  const change =
    definition.direction === "target"
      ? Math.abs(reference - definition.target) - Math.abs(value - definition.target)
      : definition.direction === "lower"
        ? reference - value
        : value - reference;
  return Math.round(change * 1e10) / 1e10;
}
