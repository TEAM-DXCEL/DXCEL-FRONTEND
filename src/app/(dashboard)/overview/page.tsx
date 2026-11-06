import { DashboardPage } from "@/components/layout/dashboard-page";
import { TopExperiments } from "@/features/overview/top-experiments";

export const metadata = { title: "Overview | DXCEL" };

export default function OverviewPage() {
  return (
    <DashboardPage
      title="Overview"
      description="전체 실험에서 Privacy, Utility, Fidelity 성능이 고르게 좋은 실험과 변경 내용을 확인합니다."
    >
      <TopExperiments />
    </DashboardPage>
  );
}
