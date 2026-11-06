"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { ThemeScope } from "@/components/ui/theme-scope";
import { ComparisonChart, DistributionChart, EvolutionChart } from "./comparison-charts";
import { SelectedComparisonTable } from "./selected-comparison-table";
import { ExperimentLineage } from "./experiment-lineage";
import { ResearchArchive, ResearchClassification, emptyArchiveFilters } from "./research-archive";
import {
  comparisonMetrics,
  sampleAxisMetrics,
  sampleAuthors,
  sampleObjectives,
  findSample,
  sampleBaseline,
  metricMean,
  metricRuns,
  measurementLabel,
  metricLabels,
  type AxisMetrics,
  sampleSd,
  score,
  difference,
  type SampleMetric,
} from "./sample-data";
import {
  metricCriterion,
  metricImprovement,
  metricTarget,
  metricName,
  evaluationMetrics,
  type EvaluationMetric,
} from "@/lib/evaluation-metrics";
import { EvaluationMetricCatalog } from "./evaluation-metric-catalog";
import styles from "./comparison.module.css";

const metricIds = Object.keys(evaluationMetrics) as EvaluationMetric[];
const axisOptions = Object.fromEntries(
  comparisonMetrics.map((axis) => [
    axis,
    metricIds
      .filter((metric) => evaluationMetrics[metric].axis === axis)
      .map((metric) => ({
        value: metric,
        label: metricName(metric),
      })),
  ]),
) as Record<SampleMetric, { value: EvaluationMetric; label: string }[]>;

export function ComparisonDashboard() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState(sampleBaseline.id);
  const [inspectedId, setInspectedId] = useState(sampleBaseline.id);
  const [metrics, setMetrics] = useState<AxisMetrics>(sampleAxisMetrics);
  const [metric, setMetric] = useState<SampleMetric>("privacy");
  const [chartMode, setChartMode] = useState<"radar" | "parallel">("radar");
  const [filters, setFilters] = useState(emptyArchiveFilters);

  function focusExperiment(id: string) {
    setFocusedId(id);
    setInspectedId(id);
  }

  function toggleExperiment(id: string) {
    const isSelected = selectedIds.includes(id);
    const next = isSelected ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id];
    setSelectedIds(next);
    if (!isSelected) {
      focusExperiment(id);
      return;
    }
    const fallbackId = next.at(-1) ?? sampleBaseline.id;
    if (focusedId === id) setFocusedId(fallbackId);
    if (inspectedId === id) setInspectedId(focusedId === id ? fallbackId : focusedId);
  }

  const entries = [sampleBaseline, ...selectedIds.map((id) => findSample(id)!)];
  const selected = findSample(inspectedId)!;
  const analysisRuns = metricRuns(selected, metrics[metric]);
  const chartSelection = findSample(focusedId)!;
  const chartEntries = [...entries.filter(({ id }) => id !== chartSelection.id), chartSelection];
  const previous = findSample(selected.previousId);
  const author = sampleAuthors.find((a) => a.id === selected.authorId)!;
  const objective = sampleObjectives.find((goal) => goal.id === selected.objectiveId)!;
  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>RESEARCH INTELLIGENCE / WORKSPACE A</p>
          <h1>실험 비교</h1>
        </div>
        <span className={styles.demoTag}>
          <span />
          SAMPLE DATA
        </span>
      </header>
      <ThemeScope theme="light" className={styles.canvas}>
        <div className={styles.contextBar}>
          <div className={styles.contextIdentity}>
            <span className={styles.contextMark}>A</span>
            <div>
              <strong>실험 비교 워크스페이스</strong>
              <p>Privacy · Utility · Fidelity / 샘플 평가 조건 A</p>
            </div>
          </div>
          <div className={styles.contextNote}>
            128개 가상 실험으로 구성한 디자인 시안입니다.
            <br />
            실제 실험자·조건·연구 수치가 아닙니다.
          </div>
        </div>
        <EvaluationMetricCatalog />
        <ResearchArchive
          selectedIds={selectedIds}
          onToggle={toggleExperiment}
          filters={filters}
          onFilter={setFilters}
        />
        <section className={styles.metricControls} aria-label="비교 축 지표 선택">
          {comparisonMetrics.map((axis) => (
            <Select
              key={axis}
              label={`${metricLabels[axis]} 지표`}
              value={metrics[axis]}
              options={axisOptions[axis]}
              onValueChange={(value) => {
                const option = axisOptions[axis].find((option) => option.value === value);
                if (option) setMetrics((current) => ({ ...current, [axis]: option.value }));
              }}
              controlSize="sm"
            />
          ))}
        </section>
        <SelectedComparisonTable
          entries={entries}
          metrics={metrics}
          selectedId={chartSelection.id}
          onInspect={focusExperiment}
          onRemove={toggleExperiment}
          onClear={() => {
            setSelectedIds([]);
            focusExperiment(sampleBaseline.id);
          }}
        />
        <div className={styles.mainGrid}>
          <section className={styles.tradeoffPanel} aria-labelledby="comparison-chart-title">
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionIndex}>03 / THREE-AXIS COMPARISON</span>
                <h2 id="comparison-chart-title">Privacy · Utility · Fidelity</h2>
              </div>
              <div className={styles.chartMode} aria-label="주 비교 그래프 형식">
                <button
                  type="button"
                  aria-pressed={chartMode === "radar"}
                  onClick={() => setChartMode("radar")}
                >
                  레이더
                </button>
                <button
                  type="button"
                  aria-pressed={chartMode === "parallel"}
                  onClick={() => setChartMode("parallel")}
                >
                  평행좌표
                </button>
              </div>
            </div>
            <p className={styles.panelSubtitle}>
              Baseline 1개 · 선택 실험 {selectedIds.length}개 · 샘플 원점수 평균 0–1
            </p>
            <div className="mt-control-inset flex flex-wrap items-end gap-control-inset">
              <Select
                label="차트에서 강조할 실험"
                value={focusedId}
                onValueChange={focusExperiment}
                options={entries.map(({ id, label }) => ({ value: id, label }))}
                controlSize="sm"
                fieldClassName="w-field-sm max-w-full"
              />
              <p className={styles.panelSubtitle}>겹친 선은 실험 번호로 선택할 수 있습니다.</p>
            </div>
            <ComparisonChart
              mode={chartMode}
              metrics={metrics}
              selected={chartSelection}
              entries={chartEntries}
              onSelect={focusExperiment}
            />
            <div className={styles.legend}>
              <span>
                <i className={styles.baselineSwatch} />
                Baseline v1
              </span>
              {chartSelection.id !== sampleBaseline.id && (
                <span>
                  <i className={styles.familyA} />
                  {chartSelection.label} 강조 선
                </span>
              )}
              <span className={styles.legendHint}>선 가까이를 클릭해 강조할 수 있습니다.</span>
            </div>
            <div className={styles.legend} aria-label="점 색상의 의미">
              <span>
                <i className={styles.resultSwatch} data-result="better" />
                Baseline보다 좋음
              </span>
              <span>
                <i className={styles.resultSwatch} data-result="worse" />
                Baseline보다 나쁨
              </span>
              <span>
                <i className={styles.resultSwatch} />
                동률 또는 비교 불가
              </span>
            </div>
            <p className={styles.chartFootnote}>
              축 위의 원은 목표값입니다. 미측정 값에는 점이나 선을 그리지 않습니다. 레이더의 면적은
              종합 성능을 나타내지 않습니다.
            </p>
          </section>
          <aside className={styles.inspector} aria-label="실험 상세">
            <p className={styles.sectionIndex}>EXPERIMENT DETAILS</p>
            <div className={styles.selectedHeading}>
              <h2>{selected.label}</h2>
              <span className={styles.authorInitial} style={{ background: author.color }}>
                {selected.id === "baseline" ? "B" : author.initial}
              </span>
            </div>
            <p className={styles.selectedTitle}>
              {selected.id === "baseline"
                ? "공통 비교 기준"
                : `${author.name} · ${objective.label}`}
            </p>
            <div className={styles.selectedGoal}>
              <span>개선 목적</span>
              <strong>
                {selected.id === "baseline" ? "고정된 비교 기준" : objective.description}
              </strong>
              {previous && (
                <button type="button" onClick={() => setInspectedId(previous.id)}>
                  {previous.label}에서 이어진 실험 ↗
                </button>
              )}
            </div>
            <div className={styles.metricReadouts}>
              {comparisonMetrics.map((key) => {
                const selectedMetric = metrics[key];
                const value = metricMean(selected, selectedMetric);
                const baseline = metricMean(sampleBaseline, selectedMetric);
                const delta = metricImprovement(selectedMetric, value, baseline);
                return (
                  <div key={key} className={styles.readout}>
                    <p>{metricName(metrics[key])}</p>
                    <div>
                      <strong>{measurementLabel(value)}</strong>
                      {selected.id !== sampleBaseline.id && delta !== null && (
                        <span
                          className={
                            delta > 0
                              ? styles.positiveDelta
                              : delta < 0
                                ? styles.negativeDelta
                                : styles.neutralDelta
                          }
                        >
                          {difference(delta)}
                        </span>
                      )}
                    </div>
                    <small>{metricCriterion(selectedMetric)}</small>
                    <small>
                      Baseline {measurementLabel(baseline)}
                      {delta !== null &&
                        (metricTarget(selectedMetric) === undefined
                          ? " · 방향을 반영한 개선량"
                          : " · 목표 오차 감소량")}
                    </small>
                  </div>
                );
              })}
            </div>
            <div className={styles.variation}>
              <span>{metricName(metrics[metric])} 표본 SD</span>
              <strong>
                {analysisRuns && analysisRuns.length > 1
                  ? `± ${score(sampleSd(analysisRuns))}`
                  : "—"}
              </strong>
            </div>
            <p className={styles.inspectorFootnote}>
              상세를 보고 있는 실험의 조건 차이는 아래 계보에서 확인합니다.
            </p>
          </aside>
        </div>
        <div className={styles.researchGrid}>
          <ExperimentLineage selected={selected} onSelect={setInspectedId} />
          <ResearchClassification filters={filters} onFilter={setFilters} />
        </div>
        <div className={styles.analysisBar}>
          <span>반복과 계보를 함께 읽기</span>
          <div className={styles.metricSwitch} aria-label="분포와 추이의 지표 선택">
            {comparisonMetrics.map((key) => (
              <button
                type="button"
                key={key}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {metricName(metrics[key])}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.bottomGrid}>
          <section className={styles.distributionPanel} aria-labelledby="distribution-title">
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionIndex}>04 / REPEATED RUNS</span>
                <h2 id="distribution-title">반복 결과의 분포</h2>
              </div>
              {analysisRuns?.length ? (
                <span className={styles.chartTag}>n = {analysisRuns.length}</span>
              ) : null}
            </div>
            <p className={styles.panelSubtitle}>
              최근 계보 6개 + Baseline · 평균 ± 표본 SD · 점은 개별 실행
            </p>
            {analysisRuns?.length ? (
              <DistributionChart selected={selected} metric={metric} onSelect={setInspectedId} />
            ) : (
              <p className={styles.chartFootnote}>
                미측정 · {metricName(metrics[metric])}의 샘플 결과가 없습니다.
              </p>
            )}
          </section>
          <section className={styles.evolutionPanel} aria-labelledby="evolution-title">
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionIndex}>LINEAGE EVOLUTION</span>
                <h2 id="evolution-title">이전 실험에서 이어진 변화</h2>
              </div>
            </div>
            <p className={styles.panelSubtitle}>
              선택한 실험의 전체 계보 · 색은 실험자 · 가로축은 계보 순서
            </p>
            {analysisRuns?.length ? (
              <EvolutionChart selected={selected} metric={metric} onSelect={setInspectedId} />
            ) : (
              <p className={styles.chartFootnote}>
                미측정 · {metricName(metrics[metric])}의 샘플 결과가 없습니다.
              </p>
            )}
          </section>
        </div>
        <div className={styles.valuesFooter}>
          <p>
            모든 결과는 가상입니다. MIA AUC는 해당 공격에서 관측한 결과이며, 수학적 차등
            프라이버시(DP) 보장은 별도로 확인해야 합니다.
          </p>
          <span>128 SAMPLE EXPERIMENTS</span>
        </div>
      </ThemeScope>
    </div>
  );
}
