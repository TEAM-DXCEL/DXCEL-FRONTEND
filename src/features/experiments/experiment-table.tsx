import type { ReactNode, Ref } from "react";
import { TableViewport } from "@/components/layout/table-viewport";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { statusLabels } from "./list-query";
import type { ExperimentListRow, ExperimentStatus } from "./types";

const statusTones: Record<ExperimentStatus, BadgeProps["tone"]> = {
  not_started: "neutral",
  unknown: "neutral",
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
  recorded,
  footer,
  viewportRef,
}: {
  items: readonly ExperimentListRow[];
  recorded: boolean;
  footer?: ReactNode;
  viewportRef?: Ref<HTMLDivElement>;
}) {
  return (
    <TableViewport label="실험 목록 표" ref={viewportRef}>
      <table className="w-full min-w-table-min border-collapse text-left text-table">
        <caption className="sr-only">
          {recorded
            ? "실험 정보와 최신 생성 상태. 제목 아래에서 이전 실험과 목적을 확인할 수 있습니다."
            : "실험 설계와 최신 실행 상태. 제목 아래에서 변경 이유를 펼칠 수 있습니다."}
        </caption>
        <thead className="sticky top-0 z-(--z-sticky) bg-surface-muted text-table-head text-foreground-muted">
          <tr>
            {[
              "실험",
              recorded ? "실험 정보" : "설계와 변경 이력",
              recorded ? "최신 생성" : "최신 실행",
              recorded ? "신규 생성 · 재사용" : "누적 실행",
              "담당자",
              "업데이트 (KST)",
            ].map((label) => (
              <th
                key={label}
                scope="col"
                className="h-table-header whitespace-nowrap px-table-cell-x py-table-cell-y"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { status } = item;
            return (
              <tr key={item.id} className="border-t border-border align-top hover:bg-surface-hover">
                <th
                  scope="row"
                  className="whitespace-nowrap px-table-cell-x py-table-cell-y font-mono text-label font-medium"
                >
                  {item.code}
                </th>
                <td className="px-table-cell-x py-table-cell-y">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-caption text-foreground-muted">
                    {item.version === null ? "설계 버전 미확인" : `설계 v${item.version}`}
                    {item.changes && ` · ${item.changes}`}
                  </p>
                  <details className="mt-2 max-w-reading text-body">
                    <summary className="w-fit cursor-pointer rounded-control text-label text-link outline-none hover:underline focus-visible:bg-control-focus">
                      {recorded ? "실험 정보 보기" : "변경 이유 보기"}
                    </summary>
                    <dl className="mt-3 grid gap-3 rounded-control bg-surface-muted p-control-inset">
                      {item.details.map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-caption text-foreground-muted">{label}</dt>
                          <dd className="mt-1">{value ?? "미확인"}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y">
                  <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y tabular-nums">
                  {item.runCount}회{item.reusedCount !== null && ` · ${item.reusedCount}회`}
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-foreground-muted">
                  {item.owner ?? (recorded ? "미확인" : "미지정")}
                </td>
                <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-meta text-foreground-muted">
                  {item.updatedAt ? (
                    <time dateTime={item.updatedAt}>
                      {dateFormatter.format(new Date(item.updatedAt))}
                    </time>
                  ) : (
                    "미확인"
                  )}
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
