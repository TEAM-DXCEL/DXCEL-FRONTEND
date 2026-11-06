"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ExperimentTable } from "./experiment-table";
import { readListQuery, sortOptions, statusLabels } from "./list-query";
import { listExperiments } from "./repository";
import type { ExperimentListResult } from "./types";

type LoadState =
  { key: string; state: "ready"; result: ExperimentListResult } | { key: string; state: "error" };

export function ExperimentListLoading() {
  return (
    <p role="status" className="py-section-gap text-body text-foreground-muted">
      실험 목록을 불러오는 중…
    </p>
  );
}

export function ExperimentList() {
  const searchParams = useSearchParams();
  const query = readListQuery(new URLSearchParams(searchParams.toString()));
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const key = JSON.stringify([query, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const [requestQuery] = JSON.parse(key) as [typeof query, number];
    listExperiments(requestQuery, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setLoaded({ key, state: "ready", result });
      },
      () => {
        if (!controller.signal.aborted) setLoaded({ key, state: "error" });
      },
    );
    return () => controller.abort();
  }, [key]);

  function updateQuery(values: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [name, value] of Object.entries(values)) {
      if (
        !value ||
        (name === "status" && value === "all") ||
        (name === "sort" && value === "updated_desc") ||
        (name === "page" && value === "1")
      )
        params.delete(name);
      else params.set(name, value);
    }
    const url = `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`;
    window.history.pushState(null, "", url);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim() });
  }

  const current = loaded?.key === key ? loaded : null;
  const result = current?.state === "ready" ? current.result : null;
  const hasFilters = Boolean(query.search || query.status !== "all");
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-control-gap">
          <CardTitle>실험 기록</CardTitle>
          <Badge tone="warning">샘플 데이터</Badge>
        </div>
        <CardDescription>
          화면 확인용 가상 기록입니다. 실제 연구 데이터는 연결되지 않았습니다.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-end gap-control-inset">
        <form onSubmit={search} className="flex items-end gap-control-gap">
          <Input
            key={query.search}
            name="q"
            type="search"
            label="실험 검색"
            defaultValue={query.search}
            placeholder="번호, 제목, 담당자, 변경 이유"
            fieldClassName="w-search max-w-full"
          />
          <Button type="submit" variant="secondary">
            검색
          </Button>
        </form>
        <Select
          label="최신 실행 상태"
          value={query.status}
          onValueChange={(status) => updateQuery({ status })}
          options={[
            { value: "all", label: "전체 상태" },
            ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
          ]}
          fieldClassName="w-field-sm"
        />
        <Select
          label="정렬"
          value={query.sort}
          onValueChange={(sort) => updateQuery({ sort })}
          options={sortOptions}
          fieldClassName="w-field-md"
        />
        {(hasFilters || query.sort !== "updated_desc") && (
          <Button
            variant="ghost"
            onClick={() => updateQuery({ q: null, status: null, sort: null })}
          >
            초기화
          </Button>
        )}
      </div>
      <div aria-busy={!current}>
        {!current && <ExperimentListLoading />}
        {current?.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-control-inset py-section-gap">
            <p className="text-body text-danger">실험 목록을 불러오지 못했습니다.</p>
            <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
              다시 시도
            </Button>
          </div>
        )}
        {result && (
          <div className="flex flex-col gap-control-inset">
            <p role="status" className="text-meta text-foreground-muted">
              {hasFilters ? "검색 결과" : "전체"} {result.total}개 · 최신 실행 상태는 실험의 최종
              평가를 의미하지 않습니다.
            </p>
            {result.items.length ? (
              <ExperimentTable items={result.items} />
            ) : (
              <div className="flex flex-col items-center gap-control-inset rounded-card border-thin border-border py-section-gap text-center">
                <p className="text-label">
                  {hasFilters ? "조건에 맞는 실험이 없습니다." : "아직 등록된 실험이 없습니다."}
                </p>
                <p className="text-body text-foreground-muted">
                  {hasFilters
                    ? "검색어나 실행 상태를 변경해 보세요."
                    : "실험이 등록되면 이곳에서 설계와 실행 이력을 확인할 수 있습니다."}
                </p>
                {hasFilters && (
                  <Button
                    variant="secondary"
                    onClick={() => updateQuery({ q: null, status: null })}
                  >
                    검색 조건 초기화
                  </Button>
                )}
              </div>
            )}
            {result.total > 0 && (
              <nav
                aria-label="실험 목록 페이지"
                className="flex items-center justify-between gap-panel-gap pt-2"
              >
                <p className="text-meta text-foreground-muted">
                  {(result.page - 1) * result.pageSize + 1}–
                  {Math.min(result.page * result.pageSize, result.total)} / {result.total}개
                </p>
                <div className="flex items-center gap-control-inset">
                  <Button
                    variant="secondary"
                    controlSize="sm"
                    disabled={result.page <= 1}
                    onClick={() => updateQuery({ page: String(result.page - 1) })}
                  >
                    이전
                  </Button>
                  <span className="text-meta tabular-nums">
                    {result.page} / {pages}
                  </span>
                  <Button
                    variant="secondary"
                    controlSize="sm"
                    disabled={result.page >= pages}
                    onClick={() => updateQuery({ page: String(result.page + 1) })}
                  >
                    다음
                  </Button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
