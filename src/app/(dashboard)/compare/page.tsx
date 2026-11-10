import { DashboardPage } from "@/components/layout/dashboard-page";
import { ComparisonDashboard } from "@/features/comparison/comparison-dashboard";
import { RecordedComparisonDashboard } from "@/features/recorded-comparison/dashboard";
import { loadRecordedDashboard } from "@/features/recorded-comparison/loader";

import { loadBaselineCatalog } from "@/features/recorded-comparison/baseline-loader";
import { loadSupabaseComparisonRun } from "@/features/recorded-comparison/supabase-run";

export const metadata = { title: "비교 | DXCEL" };

export default async function ComparePage() {
  const [result, live] = await Promise.all([
    loadRecordedDashboard(),
    loadSupabaseComparisonRun()
      .then((run) => ({ run, error: false }))
      .catch(() => ({ run: null, error: true })),
  ]);
  if (result.status === "disabled") return <ComparisonDashboard />;
  if (result.status === "ready")
    return (
      <RecordedComparisonDashboard
        data={result.data}
        catalog={result.catalog}
        liveRun={live.run}
        liveError={live.error}
      />
    );

  if (live.run) {
    return (
      <RecordedComparisonDashboard
        data={{
          conditions: [],
          experiments: [],
          metrics: [],
          runs: {},
          evaluations: {},
          artifacts: {},
          metricDetails: [],
          reuse: [],
          metricCount: 0,
          notApplicableCount: 0,
          summaryCount: 0,
        }}
        catalog={await loadBaselineCatalog()}
        liveRun={live.run}
      />
    );
  }

  return (
    <DashboardPage title="실험 비교" description="평가 결과를 읽을 수 없습니다.">
      <p className="rounded-card border-thin border-border bg-surface p-card-inset text-body text-foreground">
        {result.status === "missing" ? "Supabase 실험 기록 연결을 확인하세요." : result.message}
      </p>
    </DashboardPage>
  );
}
