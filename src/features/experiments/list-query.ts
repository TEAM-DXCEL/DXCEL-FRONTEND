import type { ExperimentListQuery, ExperimentListItem, ExperimentStatus } from "./types";

export const statusLabels = {
  not_started: "실행 전",
  queued: "대기",
  running: "실행 중",
  succeeded: "성공",
  failed: "실패",
  cancelled: "취소",
} satisfies Record<ExperimentStatus, string>;

export const sortOptions = [
  { value: "updated_desc", label: "최근 업데이트순" },
  { value: "number_desc", label: "실험 번호 내림차순" },
  { value: "number_asc", label: "실험 번호 오름차순" },
] as const;

export function experimentCode(number: number) {
  return `EXP-${String(number).padStart(3, "0")}`;
}

export function experimentStatus(item: ExperimentListItem): ExperimentStatus {
  return item.latestRun?.status ?? "not_started";
}

export function readListQuery(params: URLSearchParams): ExperimentListQuery {
  const status = params.get("status") ?? "all";
  const sort = params.get("sort");
  const page = Number(params.get("page"));
  return {
    search: params.get("q") ?? "",
    status: Object.hasOwn(statusLabels, status) ? (status as ExperimentStatus) : "all",
    sort: sortOptions.find((option) => option.value === sort)?.value ?? "updated_desc",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
