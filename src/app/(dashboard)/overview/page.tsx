import Link from "next/link";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Overview | DXCEL" };

const sections = [
  {
    title: "실험 기록",
    description: "설계와 실행 결과, 변경 이유를 실험별로 연결합니다.",
    href: "/experiments",
    action: "실험 살펴보기",
  },
  {
    title: "조건별 비교",
    description: "같은 평가 조건의 결과와 차이를 함께 살펴봅니다.",
    href: "/compare",
    action: "비교 화면으로 이동",
  },
  {
    title: "Baseline",
    description: "비교 기준과 선정 이유를 버전으로 보존합니다.",
    href: "/baselines",
    action: "Baseline 살펴보기",
  },
];

export default function OverviewPage() {
  return (
    <DashboardPage
      title="Overview"
      description="실험의 결과와 개선 과정을 하나의 워크스페이스에서 연결합니다."
    >
      <div className="grid grid-cols-1 gap-panel-gap wide:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href={section.href}
                className="rounded-control text-label text-link underline-offset-4 outline-none hover:underline focus-visible:bg-primary-subtle focus-visible:underline"
              >
                {section.action} <span aria-hidden="true">→</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardPage>
  );
}
