import {
  evaluationMetrics,
  metricCriterion,
  metricName,
  type EvaluationMetric,
} from "@/lib/evaluation-metrics";
import { comparisonMetrics, metricLabels, sampleAxisMetrics } from "./sample-data";
import styles from "./comparison.module.css";

const metricIds = Object.keys(evaluationMetrics) as EvaluationMetric[];

export function EvaluationMetricCatalog() {
  return (
    <details className={styles.metricCatalog}>
      <summary>지표별 평가 기준 · 샘플 제공 여부</summary>
      <div className={styles.metricCatalogGroups}>
        {comparisonMetrics.map((axis) => (
          <section key={axis} aria-label={metricLabels[axis]}>
            <h2>{metricLabels[axis]}</h2>
            <ul>
              {metricIds
                .filter((metric) => evaluationMetrics[metric].axis === axis)
                .map((metric) => (
                  <li key={metric}>
                    <strong>{metricName(metric)}</strong>
                    <span>
                      {metricCriterion(metric)} ·{" "}
                      {metric === sampleAxisMetrics[axis] ? "샘플 제공" : "미측정 (샘플)"}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
