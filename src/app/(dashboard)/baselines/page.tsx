import { DashboardPage } from "@/components/layout/dashboard-page";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { BaselineCatalogTable } from "@/features/recorded-comparison/baseline-catalog";
import { loadBaselineCatalog } from "@/features/recorded-comparison/baseline-loader";

export const metadata = { title: "Baseline | DXCEL" };

export default async function BaselinesPage() {
  const catalog = await loadBaselineCatalog();
  return (
    <DashboardPage
      title="Baseline"
      description="데이터셋별로 AIM·PrivPGD·Tab-PE의 기준값을 확인하세요. 실험과 비교하려면 실험 비교 화면을 이용하세요."
    >
      {catalog.status === "ready" ? (
        <BaselineCatalogTable catalog={catalog.data} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>비교 기준의 이력</CardTitle>
            <CardDescription>
              {catalog.status === "invalid"
                ? catalog.message
                : catalog.status === "missing"
                  ? "Supabase Baseline 연결을 확인하세요."
                  : "기준이 바뀌어도 당시의 결과와 선정 이유를 보존합니다."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </DashboardPage>
  );
}
