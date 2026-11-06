import { sampleAuthors, sampleExperiments as researchSamples } from "@/lib/demo-research";
import type { ExperimentListItem, RunStatus } from "./types";

// These are later attempts. The completed runs remain available for comparison.
const followUpStatuses: Partial<Record<number, RunStatus>> = {
  125: "cancelled",
  126: "failed",
  127: "running",
  128: "queued",
};

const evaluatedExperiments: readonly ExperimentListItem[] = researchSamples.map((sample) => {
  const owner = sampleAuthors.find((author) => author.id === sample.authorId)!;
  const revisionId = `sample-revision-${sample.number}`;
  const followUpStatus = followUpStatuses[sample.number];
  const updatedAt = followUpStatus
    ? new Date(Date.parse(sample.createdAt) + 60_000).toISOString()
    : sample.createdAt;
  return {
    experiment: {
      id: sample.id,
      projectId: "sample-project",
      number: sample.number,
      title: sample.title,
      owner: { id: owner.id, name: owner.name },
      previousExperimentId: sample.previousId,
      currentRevisionId: revisionId,
      representativeGroupId: null,
      archivedAt: null,
      updatedAt,
    },
    revision: {
      id: revisionId,
      experimentId: sample.id,
      version: 1,
      hypothesis: "동일한 평가 조건에서 변경 요인의 영향을 검토합니다.",
      changes: sample.title,
      changeReason: sample.change,
      evaluationPlan: `샘플 평가 조건 A에서 5회 반복. 조건: ${Object.entries(sample.conditions)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")}`,
      createdAt: sample.createdAt,
    },
    latestRun: {
      id: `sample-run-${sample.number}${followUpStatus ? "-retry" : ""}`,
      status: followUpStatus ?? "succeeded",
      createdAt: updatedAt,
    },
    runCount: sample.utility.length + (followUpStatus ? 1 : 0),
    previousExperimentNumber: sample.previousId
      ? Number(sample.previousId.replace("exp-", ""))
      : null,
  };
});

const lastEvaluated = evaluatedExperiments.at(-1)!;
const draftId = "exp-129";
const draftRevisionId = "sample-revision-129";
const draftDate = new Date(Date.parse(lastEvaluated.experiment.updatedAt) + 60_000).toISOString();

export const sampleExperiments: readonly ExperimentListItem[] = [
  ...evaluatedExperiments,
  {
    experiment: {
      ...lastEvaluated.experiment,
      id: draftId,
      number: 129,
      title: "후속 설정 검증 계획",
      previousExperimentId: lastEvaluated.experiment.id,
      currentRevisionId: draftRevisionId,
      updatedAt: draftDate,
    },
    revision: {
      id: draftRevisionId,
      experimentId: draftId,
      version: 1,
      hypothesis: "후속 설정의 영향을 같은 평가 조건에서 검토합니다.",
      changes: "후속 평가 계획 작성",
      changeReason: "직전 실험의 결과를 바탕으로 후속 검증을 계획합니다.",
      evaluationPlan: "샘플 평가 조건 A에서 5회 반복할 예정입니다.",
      createdAt: draftDate,
    },
    latestRun: null,
    runCount: 0,
    previousExperimentNumber: lastEvaluated.experiment.number,
  },
];
