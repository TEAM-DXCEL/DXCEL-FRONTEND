import { Suspense } from "react";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { ExperimentList, ExperimentListLoading } from "@/features/experiments/experiment-list";
import {
  includeSupabaseExperiment,
  recordedExperimentRows,
} from "@/features/experiments/recorded-rows";
import { loadRecordedDashboard } from "@/features/recorded-comparison/loader";

import { loadSupabaseComparisonRun } from "@/features/recorded-comparison/supabase-run";

export const metadata = { title: "실험 | DXCEL" };

export default async function ExperimentsPage() {
  const [result, liveRun] = await Promise.all([
    loadRecordedDashboard(),
    loadSupabaseComparisonRun().catch(() => null),
  ]);
  const archivedRows = result.status === "ready" ? recordedExperimentRows(result.data) : [];
  const rows = liveRun ? includeSupabaseExperiment(archivedRows, liveRun) : archivedRows;
  return (
    <DashboardPage title="실험" description="실험별 설계와 생성 실행 기록을 확인합니다.">
      {result.status === "ready" || result.status === "disabled" || liveRun ? (
        <Suspense fallback={<ExperimentListLoading />}>
          <ExperimentList rows={result.status === "disabled" ? undefined : rows} />
        </Suspense>
      ) : (
        <p className="rounded-card border-thin border-border bg-surface p-card-inset text-body text-foreground">
          {result.status === "missing"
            ? "실험 기록 미확인 · Supabase 실험 기록 연결을 확인하세요."
            : `실험 기록 미확인 · ${result.message}`}
        </p>
      )}
    </DashboardPage>
  );
}
