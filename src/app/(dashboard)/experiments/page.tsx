import { DashboardPage } from "@/components/layout/dashboard-page";
import { TableViewport } from "@/components/layout/table-viewport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "실험 | DXCEL" };

export default function ExperimentsPage() {
  return (
    <DashboardPage title="실험" description="실험별 설계와 실행 결과, 개선 과정을 살펴봅니다.">
      <Card>
        <CardHeader>
          <CardTitle>실험 기록</CardTitle>
          <CardDescription>실험의 주요 정보와 변경 이력을 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <TableViewport label="실험 기록 표">
            <table className="w-full min-w-table-min border-collapse text-left text-table">
              <thead className="sticky top-0 z-(--z-sticky) bg-surface-muted text-table-head text-foreground-muted">
                <tr>
                  {["실험", "제목", "상태", "담당자", "업데이트"].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="h-table-header px-table-cell-x py-table-cell-y"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="px-table-cell-x py-section-gap text-body text-foreground-muted"
                  >
                    실험의 설계와 성능 기록을 이곳에서 확인합니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </TableViewport>
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
