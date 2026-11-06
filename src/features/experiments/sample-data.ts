import type { ExperimentListItem, RunStatus } from "./types";

const designs = [
  [
    "초기 평가 기준 정리",
    "평가 항목 정의",
    "후속 실험의 출발점을 일관되게 기록하기 위해 평가 계획을 정리했습니다.",
  ],
  [
    "전처리 방식 점검",
    "전처리 단계 분리",
    "이전 설계에서 여러 변경을 동시에 적용해 원인을 구분하기 어려웠습니다.",
  ],
  [
    "학습 설정 탐색",
    "설정별 실행 분리",
    "설정에 따른 차이를 독립적으로 확인하기 위해 실행 조건을 나눴습니다.",
  ],
  [
    "반복 실행 안정성 확인",
    "반복 수 확대",
    "단일 실행의 변동을 확인하기 위해 같은 조건의 반복 평가를 계획했습니다.",
  ],
  [
    "평가 지표 범위 확장",
    "평가 항목 추가",
    "한 가지 지표에만 의존하지 않도록 평가 범위를 넓혔습니다.",
  ],
  [
    "결측값 처리 비교",
    "결측 처리 방식 변경",
    "결측 처리에 따른 차이를 다른 설정과 분리해 확인하려고 합니다.",
  ],
  [
    "학습 종료 조건 조정",
    "종료 조건 변경",
    "이전 실행의 종료 시점이 결과에 영향을 주는지 확인하려고 합니다.",
  ],
  [
    "설정 조합 재검토",
    "변경 요인 축소",
    "설정 간 상호 작용을 확인하기 전에 각 변경의 영향을 분리합니다.",
  ],
  [
    "평가 절차 재현 확인",
    "평가 계획 고정",
    "동일한 평가 절차로 결과를 재현할 수 있는지 점검합니다.",
  ],
  [
    "전처리 후속 실험",
    "전처리 순서 변경",
    "이전 전처리 실험의 후속 질문을 별도 설계로 기록합니다.",
  ],
  [
    "반복 결과 검토",
    "검토 기준 명시",
    "실패와 결측을 누락하지 않고 검토하기 위한 기준을 정리했습니다.",
  ],
  ["다음 평가 설계", "후속 가설 작성", "이전 실험의 한계를 바탕으로 다음 평가를 계획합니다."],
] as const;

const statuses: readonly (RunStatus | null)[] = [
  "succeeded",
  "succeeded",
  "failed",
  "running",
  "queued",
  "cancelled",
  "succeeded",
  "failed",
  "running",
  "succeeded",
  "queued",
  null,
];

export const sampleExperiments: readonly ExperimentListItem[] = designs.map((design, index) => {
  const number = index + 1;
  const id = `sample-experiment-${number}`;
  const revisionId = `sample-revision-${number}`;
  const updatedAt = `2026-10-${String(number + 10).padStart(2, "0")}T09:00:00Z`;
  const status = statuses[index];
  return {
    experiment: {
      id,
      projectId: "sample-project",
      number,
      title: design[0],
      owner:
        number % 4 === 0
          ? null
          : { id: `sample-member-${number % 3}`, name: `샘플 팀원 ${(number % 3) + 1}` },
      previousExperimentId: index === 0 ? null : `sample-experiment-${index}`,
      currentRevisionId: revisionId,
      representativeGroupId: null,
      archivedAt: null,
      updatedAt,
    },
    revision: {
      id: revisionId,
      experimentId: id,
      version: (number % 3) + 1,
      hypothesis: "변경 요인을 분리하면 결과 차이의 원인을 더 명확하게 검토할 수 있습니다.",
      changes: design[1],
      changeReason: design[2],
      evaluationPlan: "같은 비교 조건에서 반복 평가하고 실패·결측도 함께 기록합니다.",
      createdAt: updatedAt,
    },
    latestRun: status ? { id: `sample-run-${number}`, status, createdAt: updatedAt } : null,
    runCount: status ? (number % 5) + 1 : 0,
    previousExperimentNumber: index === 0 ? null : index,
  };
});
