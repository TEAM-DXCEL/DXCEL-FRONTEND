"use client";

import { useState } from "react";
import { metricCriterion, metricImprovement, metricName } from "@/lib/evaluation-metrics";
import {
  comparisonMetrics,
  sampleAxisMetrics,
  conditionLabels,
  difference,
  findSample,
  mean,
  metricLabels,
  sampleAuthors,
  sampleBaseline,
  sampleExperiments,
  score,
} from "@/lib/demo-research";

const topLimit = 5;
const axes = comparisonMetrics.map((axis) => {
  const metric = sampleAxisMetrics[axis];
  const baseline = mean(sampleBaseline[axis]);
  const results = sampleExperiments
    .map((experiment) => {
      const value = mean(experiment[axis]);
      return { id: experiment.id, value, delta: metricImprovement(metric, value, baseline) };
    })
    .toSorted((a, b) => b.delta - a.delta);

  let rank = 0;
  const ranked = new Map(
    results.map((result, index) => {
      if (result.delta !== results[index - 1]?.delta) rank = index + 1;
      return [result.id, { ...result, rank }] as const;
    }),
  );
  return { axis, metric, baseline, ranked };
});

const topExperiments = sampleExperiments
  .map((experiment) => {
    const results = axes.map(({ ranked }) => ranked.get(experiment.id)!);
    const ranks = results.map(({ rank }) => rank);
    return { experiment, results, weakestRank: Math.max(...ranks), averageRank: mean(ranks) };
  })
  .filter(({ results }) => results.every(({ delta }) => delta > 0))
  .toSorted(
    (a, b) =>
      a.weakestRank - b.weakestRank ||
      a.averageRank - b.averageRank ||
      a.experiment.number - b.experiment.number,
  )
  .slice(0, topLimit);

export function TopExperiments() {
  const [selectedId, setSelectedId] = useState(topExperiments[0]?.experiment.id);
  const selected = topExperiments.find(
    ({ experiment }) => experiment.id === selectedId,
  )?.experiment;
  const previous = selected && findSample(selected.previousId);
  const author = sampleAuthors.find(({ id }) => id === selected?.authorId);

  return (
    <section
      aria-labelledby="top-experiments-title"
      className="overflow-hidden rounded-card border-thin border-border bg-surface text-foreground"
    >
      <header className="flex flex-wrap items-center justify-between gap-control-inset border-b border-border px-card-inset py-panel-gap">
        <div>
          <p className="font-mono text-caption tracking-wide text-foreground-subtle">
            TOP {topLimit} EXPERIMENTS
          </p>
          <h2 id="top-experiments-title" className="mt-1 text-heading-sm">
            세 축에서 가장 고르게 좋은 실험
          </h2>
          <p className="mt-1 text-meta text-foreground-muted">
            전체 {sampleExperiments.length}개 중 세 지표 모두 Baseline을 넘은 실험을 최대 {topLimit}
            개 표시합니다.
          </p>
        </div>
        <span className="rounded-badge bg-highlight px-control-inset py-1 text-caption text-highlight-foreground">
          샘플 데이터 · 평가 조건 A
        </span>
      </header>

      {topExperiments.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-table-min border-collapse text-left">
              <caption className="sr-only">
                상위 실험의 지표별 원점수, Baseline 대비 개선량, 전체 실험 내 순위
              </caption>
              <thead className="bg-surface-muted text-meta">
                <tr>
                  <th scope="col" className="px-card-inset py-control-inset">
                    순위 · 실험
                  </th>
                  {axes.map(({ axis, metric, baseline }) => (
                    <th key={axis} scope="col" className="px-card-inset py-control-inset">
                      <span className="block text-label">{metricLabels[axis]}</span>
                      <span className="block font-normal text-foreground-muted">
                        {metricName(metric)}
                      </span>
                      <span className="block font-normal text-foreground-muted">
                        {metricCriterion(metric)}
                      </span>
                      <span className="block font-mono text-caption font-normal text-foreground-subtle">
                        Baseline {score(baseline)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topExperiments.map(({ experiment, results }, index) => (
                  <tr key={experiment.id} className="border-t border-border">
                    <th scope="row" className="px-card-inset py-control-inset">
                      <button
                        type="button"
                        onClick={() => setSelectedId(experiment.id)}
                        aria-pressed={experiment.id === selectedId}
                        className="flex cursor-pointer items-baseline gap-control-inset rounded-control px-control-gap py-1 text-left outline-none hover:bg-surface-muted focus-visible:bg-surface-hover aria-pressed:bg-highlight-subtle"
                      >
                        <span className="font-mono text-caption text-foreground-muted">
                          {index + 1}위
                        </span>
                        <span className="font-mono text-label">{experiment.label}</span>
                      </button>
                    </th>
                    {results.map(({ value, delta, rank }, axisIndex) => (
                      <td key={axes[axisIndex]!.axis} className="px-card-inset py-control-inset">
                        <div className="flex flex-wrap items-baseline gap-control-gap font-mono text-label">
                          <strong>{score(value)}</strong>
                          <span className="text-chart-positive">{difference(delta)}</span>
                        </div>
                        <div
                          aria-hidden="true"
                          className="mt-1 h-1 overflow-hidden rounded-full bg-surface-hover"
                        >
                          <div
                            className="h-full rounded-full bg-chart-positive"
                            style={{
                              width: `${((sampleExperiments.length - rank + 1) / sampleExperiments.length) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-caption text-foreground-muted">전체 {rank}위</p>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-card-inset py-control-inset text-caption text-foreground-muted">
            막대가 길수록 해당 지표의 순위가 높습니다. 세 지표 중 가장 낮은 순위가 더 높은 실험을
            우선하고, 같으면 평균 순위를 비교합니다.
          </p>
        </>
      ) : (
        <p className="p-card-inset text-body text-foreground-muted">
          세 지표에서 모두 Baseline보다 좋은 실험이 없습니다.
        </p>
      )}

      {selected && (
        <section
          aria-labelledby="overview-selection"
          aria-live="polite"
          className="m-card-inset rounded-control bg-surface-muted p-card-inset"
        >
          <p className="font-mono text-caption tracking-wide text-foreground-subtle">
            SELECTED EXPERIMENT
          </p>
          <h3 id="overview-selection" className="mt-1 text-heading-sm">
            {selected.label} · {selected.title}
          </h3>
          <p className="mt-1 text-meta text-foreground-muted">
            {author?.name}
            {previous && ` · 이전 실험 ${previous.label}`} · {selected.utility.length}회 반복
          </p>
          <p className="mt-control-inset text-body text-foreground-muted">{selected.change}</p>
          {previous && (
            <p className="mt-1 font-mono text-caption text-foreground-subtle">
              {conditionLabels[selected.changedFactor]}{" "}
              {previous.conditions[selected.changedFactor]} →{" "}
              {selected.conditions[selected.changedFactor]}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
