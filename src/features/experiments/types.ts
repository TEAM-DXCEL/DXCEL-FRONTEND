export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ExperimentStatus = RunStatus | "not_started";

export interface Experiment {
  id: string;
  projectId: string;
  number: number;
  title: string;
  owner: { id: string; name: string } | null;
  previousExperimentId: string | null;
  currentRevisionId: string;
  representativeGroupId: string | null;
  archivedAt: string | null;
  updatedAt: string;
}

export interface ExperimentRevision {
  id: string;
  experimentId: string;
  version: number;
  hypothesis: string;
  changes: string;
  changeReason: string;
  evaluationPlan: string;
  createdAt: string;
}

export interface RunGroup {
  id: string;
  projectId: string;
  experimentId: string;
  revisionId: string;
  comparisonContextId: string;
  expectedRepetitions: number;
  state: "draft" | "finalized";
  finalizedAt: string | null;
}

export interface Run {
  id: string;
  projectId: string;
  groupId: string;
  revisionId: string;
  ingestionId: string;
  repetition: number;
  attempt: number;
  generationOutputId: string | null;
  previousRunId: string | null;
  status: RunStatus;
  config: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export type RunMetric = {
  runId: string;
  metricDefinitionId: string;
} & (
  { state: "measured"; value: number } | { state: "missing" | "error"; value: null; reason: string }
);

export interface ExperimentListItem {
  experiment: Experiment;
  revision: ExperimentRevision;
  latestRun: Pick<Run, "id" | "status" | "createdAt"> | null;
  runCount: number;
  previousExperimentNumber: number | null;
}

export type ExperimentSort = "updated_desc" | "number_desc" | "number_asc";

export interface ExperimentListQuery {
  search: string;
  status: ExperimentStatus | "all";
  sort: ExperimentSort;
  page: number;
}

export interface ExperimentListResult {
  items: readonly ExperimentListItem[];
  total: number;
  page: number;
  pageSize: number;
  source: "sample";
}
