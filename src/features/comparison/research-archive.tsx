"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useInfiniteWindow } from "@/hooks/use-infinite-window";
import {
  conditionLabels,
  findSample,
  sampleAuthors,
  sampleExperiments,
  sampleObjectives,
  type SampleExperiment,
} from "./sample-data";
import styles from "./comparison.module.css";

export type ArchiveFilters = { query: string; author: string; objective: string };
export const emptyArchiveFilters: ArchiveFilters = { query: "", author: "all", objective: "all" };

export function ResearchArchive({
  selectedIds,
  onToggle,
  filters,
  onFilter,
}: {
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  filters: ArchiveFilters;
  onFilter: (value: ArchiveFilters) => void;
}) {
  const query = filters.query.trim().toLocaleLowerCase("ko-KR");
  const entries = sampleExperiments
    .filter((item) => {
      const author = sampleAuthors.find((a) => a.id === item.authorId)!;
      const objective = sampleObjectives.find((g) => g.id === item.objectiveId)!;
      const text = [
        item.label,
        item.title,
        author.name,
        objective.label,
        findSample(item.previousId)?.label,
        conditionLabels[item.changedFactor],
        item.change,
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");
      return (
        (filters.author === "all" || item.authorId === filters.author) &&
        (filters.objective === "all" || item.objectiveId === filters.objective) &&
        text.includes(query)
      );
    })
    .toReversed();
  return (
    <section
      className={styles.archiveSection}
      id="research-archive"
      aria-labelledby="archive-title"
    >
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionIndex}>01 / EXPERIMENT SELECTION</span>
          <h2 id="archive-title">비교할 실험 선택</h2>
        </div>
        <span className={styles.archiveCount}>
          {entries.length} / {sampleExperiments.length}
        </span>
      </div>
      <div className={styles.archiveFilters}>
        <Input
          type="search"
          label="실험 검색"
          placeholder="EXP-100, 이전 실험, 변경 조건…"
          value={filters.query}
          onChange={(event) => onFilter({ ...filters, query: event.target.value })}
          fieldClassName="min-w-0 flex-1"
        />
        <Select
          label="실험자"
          value={filters.author}
          onValueChange={(author) => onFilter({ ...filters, author })}
          options={[
            { value: "all", label: "전체 실험자" },
            ...sampleAuthors.map((a) => ({ value: a.id, label: a.name })),
          ]}
          fieldClassName="w-field-sm"
        />
        <Select
          label="개선 목적"
          value={filters.objective}
          onValueChange={(objective) => onFilter({ ...filters, objective })}
          options={[
            { value: "all", label: "전체 개선 목적" },
            ...sampleObjectives.map((g) => ({ value: g.id, label: g.label })),
          ]}
          fieldClassName="w-field-sm"
        />
        <button
          type="button"
          className={styles.pathToggle}
          disabled={Object.values(filters).every((v) => v === "" || v === "all")}
          onClick={() => onFilter(emptyArchiveFilters)}
        >
          초기화
        </button>
      </div>
      <ArchiveRows
        key={JSON.stringify(filters)}
        entries={entries}
        selectedIds={selectedIds}
        onToggle={onToggle}
      />
    </section>
  );
}
function ArchiveRows({
  entries,
  selectedIds,
  onToggle,
}: {
  entries: readonly SampleExperiment[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}) {
  const { rootRef, sentinelRef, limit, hasMore, loadMoreWithFocus } = useInfiniteWindow(
    entries.length,
  );
  return (
    <>
      <p className={styles.archiveHelp} role="status">
        {entries.length
          ? `${limit} / ${entries.length}개 표시 · 아래로 스크롤하면 이어서 불러옵니다.`
          : "조건에 맞는 실험이 없습니다."}
      </p>
      <div
        ref={rootRef}
        className={`${styles.archiveScroll} ${styles.pickerScroll}`}
        tabIndex={0}
        role="region"
        aria-label="무한 스크롤 실험 아카이브"
      >
        <table className={styles.archiveTable}>
          <caption className="sr-only">
            샘플 실험의 실험자, 개선 목적, 이전 실험과 변경 조건
          </caption>
          <thead>
            <tr>
              {["실험 / 변경 내용", "실험자", "개선 목적", "이전 실험", "변경 조건"].map(
                (label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, limit).map((item) => {
              const author = sampleAuthors.find((a) => a.id === item.authorId)!;
              const goal = sampleObjectives.find((g) => g.id === item.objectiveId)!;
              const previous = findSample(item.previousId);
              return (
                <tr key={item.id} data-selected={selectedIds.includes(item.id)}>
                  <th scope="row">
                    <label className={`${styles.archiveExperiment} ${styles.pickerChoice}`}>
                      <input
                        type="checkbox"
                        aria-label={`${item.label} 비교에 추가`}
                        checked={selectedIds.includes(item.id)}
                        onChange={() => onToggle(item.id)}
                      />
                      <strong>{item.label}</strong>
                      <span>{item.title}</span>
                    </label>
                  </th>
                  <td>
                    <span className={styles.authorInitial} style={{ background: author.color }}>
                      {author.initial}
                    </span>
                    {author.name}
                  </td>
                  <td>
                    <span className={styles.goalTag}>{goal.label}</span>
                  </td>
                  <td>{previous ? `↳ ${previous.label}` : "시작 실험"}</td>
                  <td>
                    <span>{conditionLabels[item.changedFactor]}</span>
                    <small>
                      {previous
                        ? `${String(previous.conditions[item.changedFactor])} → ${String(item.conditions[item.changedFactor])}`
                        : "초기 조건"}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div ref={sentinelRef} className={styles.scrollEnd}>
          {hasMore ? (
            <button type="button" onClick={loadMoreWithFocus}>
              더 불러오기 <span>↓</span>
            </button>
          ) : (
            <span>
              {entries.length ? "모든 실험을 확인했습니다." : "검색어와 분류 조건을 변경해 보세요."}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export function ResearchClassification({
  filters,
  onFilter,
}: {
  filters: ArchiveFilters;
  onFilter: (value: ArchiveFilters) => void;
}) {
  return (
    <section className={styles.classificationPanel} aria-labelledby="classification-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionIndex}>03 / RESEARCH MAP</span>
          <h2 id="classification-title">누가, 무엇을 개선하려 했는가</h2>
        </div>
      </div>
      <p className={styles.panelSubtitle}>셀을 선택하면 해당 실험자·목적의 기록을 필터합니다.</p>
      <div className={styles.researchMatrix} role="group" aria-label="실험자별 개선 목적 분류">
        <span />
        <span>Privacy</span>
        <span>Utility</span>
        <span>Fidelity</span>
        <span>안정성</span>
        {sampleAuthors.map((author) => (
          <div className={styles.matrixRow} key={author.id}>
            <span>
              <i style={{ background: author.color }} />
              {author.name}
            </span>
            {sampleObjectives.map((goal) => {
              const count = sampleExperiments.filter(
                (item) => item.authorId === author.id && item.objectiveId === goal.id,
              ).length;
              return (
                <button
                  key={goal.id}
                  type="button"
                  aria-label={`${author.name}, ${goal.label}, ${count}개 필터`}
                  aria-pressed={filters.author === author.id && filters.objective === goal.id}
                  style={{
                    background: `color-mix(in srgb, var(--color-green-500) ${count * 5}%, var(--surface))`,
                  }}
                  onClick={() => onFilter({ ...filters, author: author.id, objective: goal.id })}
                >
                  {count}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.goalBars}>
        {sampleObjectives.map((goal) => {
          const count = sampleExperiments.filter((item) => item.objectiveId === goal.id).length;
          return (
            <button
              type="button"
              key={goal.id}
              className={styles.goalBar}
              aria-pressed={filters.objective === goal.id}
              onClick={() =>
                onFilter({ ...filters, objective: filters.objective === goal.id ? "all" : goal.id })
              }
            >
              <span>{goal.label}</span>
              <i>
                <b
                  style={{
                    width: `${(count / sampleExperiments.length) * 100}%`,
                    background: goal.color,
                  }}
                />
              </i>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
