import { DashboardPage } from "@/components/layout/dashboard-page";
import { RecordedOverview } from "@/features/overview/recorded-overview";
import { TopExperiments } from "@/features/overview/top-experiments";
import { readComparisonRelease } from "@/features/recorded-comparison/comparison-release";
import { loadSelectedPerformance } from "@/features/selected-experiments/source";
import { loadRecordedDashboard } from "@/features/recorded-comparison/loader";

export const metadata = { title: "Overview | DXCEL" };

export default async function OverviewPage() {
  const releaseRequest = readComparisonRelease();
  const [result, release, selected] = await Promise.all([
    loadRecordedDashboard(),
    releaseRequest,
    releaseRequest.then((release) => (release ? loadSelectedPerformance() : null)),
  ]);
  return (
    <DashboardPage
      title="Overview"
      description="같은 조건에서 공식 Baseline과 비교한 Privacy, Utility, Fidelity 결과를 확인합니다."
    >
      {result.status === "disabled" ? (
        <TopExperiments />
      ) : result.status === "ready" && result.catalog.status === "ready" ? (
        <RecordedOverview
          conditions={
            selected
              ? [...result.data.conditions, ...selected.groups.map(({ condition }) => condition)]
              : result.data.conditions
          }
          definitions={
            selected ? [...result.data.metrics, ...selected.metrics] : result.data.metrics
          }
          catalog={result.catalog.data}
          local={release?.source === "local"}
          replacement={release !== null}
        />
      ) : (
        <p className="rounded-card border-thin border-border bg-surface p-card-inset text-body text-foreground">
          비교 결과 미확인 ·{" "}
          {result.status === "invalid"
            ? result.message
            : result.status === "missing"
              ? "Supabase 실험 기록 연결을 확인하세요."
              : result.catalog.status === "invalid"
                ? result.catalog.message
                : "Supabase Baseline 연결을 확인하세요."}
        </p>
      )}
    </DashboardPage>
  );
}
