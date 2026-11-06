import type { ReactNode, Ref } from "react";
import { TableViewport } from "@/components/layout/table-viewport";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { experimentCode, experimentStatus, statusLabels } from "./list-query";
import type { ExperimentListItem, ExperimentStatus } from "./types";

const statusTones: Record<ExperimentStatus, BadgeProps["tone"]> = {
  not_started: "neutral",
  queued: "warning",
  running: "info",
  succeeded: "success",
  failed: "danger",
  cancelled: "neutral",
};
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

export function ExperimentTable({
  items,
  footer,
  viewportRef,
}: {
  items: readonly ExperimentListItem[];
  footer?: ReactNode;
  viewportRef?: Ref<HTMLDivElement>;
}) {
  return (
    <TableViewport label="실험 목록 표" ref={viewportRef}>
      <table className="w-full min-w-table-min border-collapse text-left text-table">
        <caption className="sr-only">
          실험 설계와 최신 실행 상태. 제목 아래에서 변경 이유를 펼칠 수 있습니다.
        </caption>
        <thead className="sticky top-0 z-(--z-sticky) bg-surface-muted text-table-head text-foreground-muted">
          <tr>
            {["실험", "설계와 변경 이력", "최신 실행", "누적 실행", "담당자", "업데이트 (KST)"].map(
              (label) => (
                <th
                  key={label}
                  scope="col"
                  className="h-table-header whitespace-nowrap px-table-cell-x py-table-cell-y"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { experiment, revision } = item;
            const status = experimentStatus(item);
            return (
              <tr
                key={experiment.id}
                className="border-t border-border align-top hover:bg-surface-hover"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-table-cell-x py-table-cell-y font-mono text-label font-medium"
                >
                  {experimentCode(experiment.number)}
                </th>
                <td className="px-table-cell-x py-table-cell-y">
                  <p className="font-medium">{experiment.title}</p>
                  <p className="mt-1 text-caption text-foreground-muted">
                    설계 v{revision.version} · {revision.changes}
                  </p>
                  <details className="mt-2 max-w-reading text-body">
                    <summary className="w-fit cursor-pointer rounded-control text-label text-link outline-none hover:underline focus-visible:bg-control-focus">
                      변경 이유 보기
                    </summary>
                    <dl className="mt-3 grid gap-3 rounded-control bg-surface-muted p-control-inset">
                      {[
                        [
                          "이전 실험",
                          item.previousExperimentNumber === null
                            ? "없음 · 시작 실험"
                            : experimentCode(item.previousExperimentNumber),
                        ],
                        ["변경 이유", revision.changeReason],
                        ["가설", revision.hypothesis],
                        ["평가 계획", revision.evaluationPlan],
                        [
                          "대표 결과",
                          experiment.representativeGroupId ? "확정된 실행 묶음 있음" : "미선정",
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-caption text-foreground-muted">{label}</dt>
                          <dd className="mt-1">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y">
                  <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y tabular-nums">
                  {item.runCount}회
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-foreground-muted">
                  {experiment.owner?.name ?? "미지정"}
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-meta text-foreground-muted">
                  <time dateTime={experiment.updatedAt}>
                    {dateFormatter.format(new Date(experiment.updatedAt))}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer}
    </TableViewport>
  );
}
