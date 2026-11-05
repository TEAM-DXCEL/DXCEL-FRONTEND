import { DashboardPage } from "@/components/layout/dashboard-page";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Baseline | DXCEL" };

export default function BaselinesPage() {
  return (
    <DashboardPage title="Baseline" description="비교 기준의 버전과 선정 이유를 함께 관리합니다.">
      <Card>
        <CardHeader>
          <CardTitle>비교 기준의 이력</CardTitle>
          <CardDescription>기준이 바뀌어도 당시의 결과와 선정 이유를 보존합니다.</CardDescription>
        </CardHeader>
      </Card>
    </DashboardPage>
  );
}
