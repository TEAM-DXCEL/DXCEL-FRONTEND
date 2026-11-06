import { type EvaluationAxis, type EvaluationMetric } from "./evaluation-metrics";

export type SampleMetric = EvaluationAxis;
export type SampleConditions = {
  noiseMultiplier: number;
  latentDim: number;
  epochs: number;
  learningRate: number;
  seedPolicy: string;
};
export type SampleExperiment = {
  id: string;
  label: string;
  number: number;
  family: "baseline" | "A" | "B";
  title: string;
  previousId: string | null;
  change: string;
  authorId: string;
  objectiveId: string;
  changedFactor: keyof SampleConditions;
  conditions: SampleConditions;
  createdAt: string;
  utility: readonly number[];
  privacy: readonly number[];
  fidelity: readonly number[];
};
export const comparisonMetrics = ["privacy", "utility", "fidelity"] as const;
export const metricLabels: Record<SampleMetric, string> = {
  privacy: "Privacy",
  utility: "Utility",
  fidelity: "Fidelity",
};
export const sampleAxisMetrics = {
  privacy: "miaAucMaxFull",
  utility: "xgbPrAuc",
  fidelity: "wd3",
} as const satisfies Record<SampleMetric, EvaluationMetric>;
export const sampleAuthors = [
  { id: "author-a", name: "연구자 A", initial: "A", color: "var(--color-green-500)" },
  { id: "author-b", name: "연구자 B", initial: "B", color: "var(--color-orange-500)" },
  { id: "author-c", name: "연구자 C", initial: "C", color: "var(--color-blue-300)" },
  { id: "author-d", name: "연구자 D", initial: "D", color: "var(--color-yellow-400)" },
] as const;
export const sampleObjectives = [
  {
    id: "privacy",
    label: "Privacy 개선",
    factor: "noiseMultiplier",
    description: "노이즈 설정의 영향 확인",
    color: "var(--color-green-500)",
  },
  {
    id: "utility",
    label: "Utility 개선",
    factor: "epochs",
    description: "학습량 조정의 영향 확인",
    color: "var(--color-orange-500)",
  },
  {
    id: "fidelity",
    label: "Fidelity 개선",
    factor: "latentDim",
    description: "표현 차원 조정의 영향 확인",
    color: "var(--color-blue-300)",
  },
  {
    id: "stability",
    label: "안정성 검증",
    factor: "seedPolicy",
    description: "반복 간 변동 확인",
    color: "var(--color-yellow-400)",
  },
] as const;
export const conditionLabels: Record<keyof SampleConditions, string> = {
  noiseMultiplier: "Noise multiplier",
  latentDim: "Latent dimension",
  epochs: "Epochs",
  learningRate: "Learning rate",
  seedPolicy: "반복 seed",
};
const initialConditions: SampleConditions = {
  noiseMultiplier: 1,
  latentDim: 64,
  epochs: 100,
  learningRate: 0.001,
  seedPolicy: "11–15",
};
const repeats = (center: number, n: number) =>
  [-2, -1, 0, 1, 2].map((offset) =>
    Number((center + offset * (0.003 + (n % 4) * 0.002)).toFixed(3)),
  );
export const sampleExperiments: readonly SampleExperiment[] = (() => {
  const entries: SampleExperiment[] = [];
  for (let number = 1; number <= 128; number++) {
    const parentNumber = number > 20 ? number - 20 : number > 4 ? number - 4 : null;
    const previous = parentNumber ? entries[parentNumber - 1]! : null;
    const goal = sampleObjectives[number === 100 ? 0 : (number + Math.floor(number / 7)) % 4]!;
    const author = sampleAuthors[Math.floor((number - 1) / 8) % 4]!;
    const conditions = { ...(previous?.conditions ?? initialConditions) };
    if (previous) {
      if (goal.factor === "noiseMultiplier")
        conditions.noiseMultiplier = Number((conditions.noiseMultiplier + 0.1).toFixed(1));
      if (goal.factor === "epochs") conditions.epochs += 20;
      if (goal.factor === "latentDim") conditions.latentDim += 16;
      if (goal.factor === "seedPolicy")
        conditions.seedPolicy = `${number * 5 + 1}–${number * 5 + 5}`;
    }
    const progress = number / 128;
    const centers = {
      privacy: 0.63 - progress * 0.12 + Math.sin(number * 0.7) * 0.07,
      utility: 0.68 + progress * 0.18 + Math.cos(number * 0.8) * 0.045,
      fidelity: 0.7 + progress * 0.14 + Math.sin(number * 0.5) * 0.05,
    };
    if (number === 80) Object.assign(centers, { privacy: 0.61, utility: 0.85, fidelity: 0.875 });
    if (number === 100) Object.assign(centers, { privacy: 0.53, utility: 0.86, fidelity: 0.85 });
    const id = `exp-${String(number).padStart(3, "0")}`;
    entries.push({
      id,
      number,
      label: `EXP-${String(number).padStart(3, "0")}`,
      family: number % 2 ? "A" : "B",
      title: `${goal.label} · ${conditionLabels[goal.factor]} 검토`,
      previousId: previous?.id ?? null,
      change: previous
        ? `${previous.label}의 ${conditionLabels[goal.factor]}를 ${String(previous.conditions[goal.factor])} → ${String(conditions[goal.factor])}로 변경해 ${goal.description}을 위한 샘플 실험입니다.`
        : "계열의 출발점으로 세 지표의 기준 결과를 기록한 샘플 실험입니다.",
      authorId: author.id,
      objectiveId: goal.id,
      changedFactor: goal.factor,
      conditions,
      createdAt: new Date(Date.UTC(2026, 9, 1, number * 6)).toISOString(),
      privacy: repeats(centers.privacy, number),
      utility: repeats(centers.utility, number + 1),
      fidelity: repeats(1 - centers.fidelity, number + 2),
    });
  }
  return entries;
})();
export const sampleBaseline: SampleExperiment = {
  id: "baseline",
  label: "Baseline",
  number: 0,
  family: "baseline",
  title: "샘플 기준 모델",
  previousId: null,
  authorId: "author-a",
  objectiveId: "stability",
  changedFactor: "seedPolicy",
  conditions: initialConditions,
  change: "동일한 평가 조건의 고정 비교 기준입니다.",
  createdAt: "2026-10-01T00:00:00Z",
  privacy: repeats(0.56, 1),
  utility: repeats(0.78, 2),
  fidelity: repeats(0.18, 3),
};
export const comparisonSamples = [sampleBaseline, ...sampleExperiments];
export const findSample = (id: string | null) => comparisonSamples.find((entry) => entry.id === id);
export function sampleLineage(selected: SampleExperiment): SampleExperiment[] {
  const lineage: SampleExperiment[] = [];
  let current: SampleExperiment | undefined = selected;
  while (current && !lineage.some((item) => item.id === current!.id)) {
    lineage.unshift(current);
    current = findSample(current.previousId);
  }
  return lineage;
}
export function comparisonSet(selected: SampleExperiment): readonly SampleExperiment[] {
  return [sampleBaseline, ...sampleLineage(selected).slice(-6)].filter(
    (item, index, entries) => entries.findIndex((other) => other.id === item.id) === index,
  );
}
export const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
export const sampleSd = (values: readonly number[]) => {
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1),
  );
};
export const score = (value: number) => value.toFixed(3);
export const difference = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(3)}`;
