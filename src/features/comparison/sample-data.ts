import {
  evaluationMetrics,
  type EvaluationAxis,
  type EvaluationMetric,
} from "@/lib/evaluation-metrics";
import { mean, sampleAxisMetrics, score, type SampleExperiment } from "@/lib/demo-research";

export * from "@/lib/demo-research";

export type AxisMetrics = Record<EvaluationAxis, EvaluationMetric>;

export function metricRuns(experiment: SampleExperiment, metric: EvaluationMetric) {
  const { axis } = evaluationMetrics[metric];
  return sampleAxisMetrics[axis] === metric ? experiment[axis] : undefined;
}

export function metricMean(experiment: SampleExperiment, metric: EvaluationMetric) {
  const runs = metricRuns(experiment, metric);
  return runs?.length ? mean(runs) : null;
}

export const measurementLabel = (value: number | null) =>
  value === null ? "미측정" : score(value);
