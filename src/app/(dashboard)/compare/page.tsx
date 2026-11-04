import { DashboardPage } from "@/components/layout/dashboard-page";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "비교 | DXCEL" };

export default function ComparePage() {
  return (
    <DashboardPage
      title="비교"
      description="평가 조건을 기준으로 실험 결과와 Baseline의 차이를 살펴봅니다."
    >
      <Card>
        <CardHeader>
          <CardTitle>같은 조건에서 비교하기</CardTitle>
          <CardDescription>
            데이터셋, 평가 방법과 지표 정의가 일치하는 결과를 함께 비교합니다.
          </CardDescription>
        </CardHeader>
      </Card>
    </DashboardPage>
  );
}
