import { Suspense } from "react";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { ExperimentList, ExperimentListLoading } from "@/features/experiments/experiment-list";

export const metadata = { title: "실험 | DXCEL" };

export default function ExperimentsPage() {
  return (
    <DashboardPage title="실험" description="실험별 설계와 실행 결과, 개선 과정을 살펴봅니다.">
      <Suspense fallback={<ExperimentListLoading />}>
        <ExperimentList />
      </Suspense>
    </DashboardPage>
  );
}
