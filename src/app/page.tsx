import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-page flex-col gap-section-gap px-page-gutter py-page-block">
      <header className="flex flex-col gap-2">
        <p className="text-label tracking-wide text-primary-text">DXCEL / UI</p>
        <h1 className="text-heading-lg">컴포넌트 미리보기</h1>
        <p className="text-body text-foreground-muted">
          공통 디자인 토큰을 적용한 컴포넌트의 크기와 상태를 확인합니다.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-panel-gap desktop:grid-cols-2">
        <Card aria-labelledby="button-preview">
          <CardHeader>
            <CardTitle id="button-preview">Button</CardTitle>
            <CardDescription>종류 · 크기 · 비활성 · 로딩</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-panel-gap">
            <div className="flex flex-wrap items-center gap-control-gap">
              <Button>기본</Button>
              <Button variant="secondary">보조</Button>
              <Button variant="ghost">고스트</Button>
              <Button variant="danger">위험</Button>
            </div>
            <div className="flex flex-wrap items-center gap-control-gap">
              <Button controlSize="sm">Small</Button>
              <Button controlSize="md">Medium</Button>
              <Button controlSize="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-control-gap">
              <Button disabled>비활성</Button>
              <Button loading loadingLabel="저장 중…">
                저장
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card aria-labelledby="badge-preview">
          <CardHeader>
            <CardTitle id="badge-preview">Badge</CardTitle>
            <CardDescription>상태별 색상과 텍스트</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-control-gap">
            <Badge>준비</Badge>
            <Badge tone="primary">실행 중</Badge>
            <Badge tone="success">완료</Badge>
            <Badge tone="warning">검토 필요</Badge>
            <Badge tone="danger">실패</Badge>
            <Badge tone="info">안내</Badge>
          </CardContent>
        </Card>

        <Card aria-labelledby="input-preview">
          <CardHeader>
            <CardTitle id="input-preview">Input</CardTitle>
            <CardDescription>안내 문구 · 오류 · 비활성</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-panel-gap">
            <Input
              label="실험 이름"
              placeholder="EXP-001"
              description="실험을 구분할 이름을 입력하세요."
              required
            />
            <Input
              label="프로젝트 이름"
              placeholder="프로젝트 이름"
              error="프로젝트 이름을 입력하세요."
            />
            <Input label="비활성 입력" defaultValue="기본 설정" disabled />
          </CardContent>
        </Card>

        <Card aria-labelledby="select-preview">
          <CardHeader>
            <CardTitle id="select-preview">Select</CardTitle>
            <CardDescription>기본 선택 · 오류 · 비활성</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-panel-gap">
            <Select
              label="실험 상태"
              defaultValue="draft"
              description="브라우저 기본 선택 메뉴를 사용합니다."
            >
              <option value="draft">설계 중</option>
              <option value="running">실행 중</option>
              <option value="complete">완료</option>
            </Select>
            <Select label="프로젝트 선택" defaultValue="" error="프로젝트를 선택하세요.">
              <option value="">선택하세요</option>
              <option value="example">예시 프로젝트</option>
            </Select>
            <Select label="비활성 선택" defaultValue="default" disabled>
              <option value="default">기본 설정</option>
            </Select>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
