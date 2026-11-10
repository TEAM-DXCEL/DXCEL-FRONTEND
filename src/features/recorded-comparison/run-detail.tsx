import type { ReactNode } from "react";
import { TableViewport } from "@/components/layout/table-viewport";
import { Select } from "@/components/ui/select";
import type { RecordedBaseline } from "./baseline-loader";
import { conditionName } from "./condition-chart";
import type { RecordedCondition, RecordedDataset, RecordedRun } from "./loader";
import {
  baselineComparisonNote,
  baselineDifference,
  directionLabel,
  formatChange,
  rawValue,
  recordedMetricName,
  scopeLabels,
  statusLabels,
  type RecordedMetricDefinition,
} from "./model";
import styles from "@/features/comparison/comparison.module.css";

function factsValue(value: string | number | boolean | null | undefined) {
  return value == null
    ? "미확인"
    : typeof value === "boolean"
      ? value
        ? "예"
        : "아니요"
      : String(value);
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-control-gap text-meta">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(6rem,1fr)_minmax(0,3fr)] gap-control-gap"
        >
          <dt className="text-foreground-muted">{label}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value ?? "미확인"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Evidence({
  source,
}: {
  source: { path: string; field?: string | null; contains?: string; linked_metadata?: string };
}) {
  return (
    <span className="font-mono text-caption [overflow-wrap:anywhere]">
      {source.path}
      {source.field && ` · ${source.field}`}
      {source.contains && ` · ${source.contains}`}
      {source.linked_metadata && ` · 연결 ${source.linked_metadata}`}
    </span>
  );
}

function UnknownFields({ entries }: { entries: { field: string; reason: string }[] }) {
  if (!entries.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-meta">
      {entries.map(({ field, reason }) => (
        <li key={field}>
          {field} · 미확인 · {reason}
        </li>
      ))}
    </ul>
  );
}

const ownershipLabels: Record<RecordedRun["ownership_status"], string> = {
  confirmed: "소속 확인",
  resolved_documented_source_mismatch: "원본 소속 불일치 · 근거로 확인",
  unresolved: "소속 미확인",
};

const changeLabels: Record<string, string> = {
  pre_measurement_share: "사전 측정 비율",
  budget_reserve_without_TA: "TA 없이 남겨 둔 예산 비율",
};

const lineageLabels: Record<string, string> = {
  followup: "이전 실험",
  reuses_configuration: "설정을 가져온 실험",
};

const percent = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 4 });

function changeValue(parameter: string, value: number | null) {
  return Object.hasOwn(changeLabels, parameter) && value !== null
    ? percent.format(value)
    : factsValue(value);
}

export function ConditionDetail({
  condition,
  metric,
  baseline,
  run,
  data,
  metricByKey,
  onRunChange,
}: {
  condition: RecordedCondition;
  metric: RecordedMetricDefinition | undefined;
  baseline: RecordedBaseline | undefined;
  run: RecordedRun;
  data: RecordedDataset;
  metricByKey: ReadonlyMap<string, RecordedMetricDefinition>;
  onRunChange: (id: string) => void;
}) {
  const experiment = data.experiments.find(({ id }) => id === condition.experimentId);
  const changes = experiment?.changes.filter(
    ({ condition_id }) => condition_id === condition.condition,
  );
  const previousIds = experiment?.previous_experiment_ids?.filter(
    (id) =>
      !experiment.lineage.some(
        (item) => item.experiment_id === id && item.relation_type === "followup",
      ),
  );
  const reuse = data.reuse.filter(
    (relation) => relation.consumer_experiment_id === condition.experimentId,
  );
  const stat = metric && condition.metrics[metric.key];
  const delta = metric ? baselineDifference(metric, stat, baseline?.metrics[metric.key]) : null;

  return (
    <div className="grid gap-panel-gap">
      <h3 className="text-label">{conditionName(condition)}</h3>
      <div className="grid gap-panel-gap desktop:grid-cols-3">
        <section className="grid content-start gap-control-gap">
          <h4 className="text-label">평가 결과</h4>
          {metric && (
            <p className="text-meta text-foreground-muted">
              {recordedMetricName(metric)} · {scopeLabels[metric.reference_scope]} ·{" "}
              {directionLabel(metric)}
            </p>
          )}
          {stat?.mean != null ? (
            <>
              <p className="break-words font-mono text-body">
                {rawValue(stat.mean)}
                {stat.sampleSd !== null && ` ± ${rawValue(stat.sampleSd)}`}
              </p>
              <p className="text-meta text-foreground-muted">
                {stat.sampleSd === null ? "평균" : "평균 ± 표본 표준편차"} · 유효 생성 반복 {stat.n}
                회
              </p>
            </>
          ) : (
            <p className="text-meta text-foreground-muted">
              {stat?.statuses.map((status) => statusLabels[status]).join(" · ") || "미측정"}
            </p>
          )}
          {baseline && metric && (
            <p className="text-meta">
              {delta === null
                ? `Baseline 대비 · ${baselineComparisonNote(baseline, metric.key, condition.dataset)}`
                : `Baseline 대비 변화량 ${formatChange(delta)}`}
            </p>
          )}
        </section>
        <section className="grid content-start gap-control-gap text-meta">
          <h4 className="text-label">변경 조건</h4>
          {changes?.length ? (
            <ul className="grid gap-control-gap">
              {changes.map((change) => (
                <li key={change.parameter}>
                  <p>
                    {changeLabels[change.parameter] ?? change.parameter} ·{" "}
                    {changeValue(change.parameter, change.before)} →{" "}
                    {changeValue(change.parameter, change.after)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">변경 기록 미확인</p>
          )}
        </section>
        <section className="grid content-start gap-control-gap text-meta">
          <h4 className="text-label">연관 실험</h4>
          {previousIds?.length || experiment?.lineage.length || reuse.length ? (
            <ul className="grid gap-control-gap">
              {previousIds?.map((id) => (
                <li key={id}>{id} · 이전 실험</li>
              ))}
              {experiment?.lineage.map((item) => (
                <li key={item.evidence_ref}>
                  {item.experiment_id} · {lineageLabels[item.relation_type] ?? item.relation_type}
                </li>
              ))}
              {reuse.map((relation) => (
                <li key={relation.evidence_ref.path + relation.evidence_ref.field}>
                  {relation.owner_experiment_id} Phase {relation.phase}{" "}
                  {relation.conditions.join("·")} 출력 재사용 · {relation.generation_ids.length}건
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">연관 실험 기록 미확인</p>
          )}
        </section>
      </div>
      <details className="rounded-control border-thin border-border p-control-inset">
        <summary className="cursor-pointer text-label">원본 실행·평가 근거 보기</summary>
        {stat?.mean != null && (
          <p className="mt-control-inset text-meta text-foreground-muted">
            {stat.summarySource ? (
              <>
                원본 요약 · <Evidence source={stat.summarySource} />
              </>
            ) : (
              "측정된 생성 반복에서 평균과 표본 표준편차 계산"
            )}
          </p>
        )}
        <RunDetail
          condition={condition}
          run={run}
          data={data}
          metricByKey={metricByKey}
          onRunChange={onRunChange}
        />
      </details>
    </div>
  );
}

function RunDetail({
  condition,
  run,
  data,
  metricByKey,
  onRunChange,
}: {
  condition: RecordedCondition;
  run: RecordedRun;
  data: RecordedDataset;
  metricByKey: ReadonlyMap<string, RecordedMetricDefinition>;
  onRunChange: (id: string) => void;
}) {
  const experiment = data.experiments.find(({ id }) => id === condition.experimentId);
  const evaluation = data.evaluations[run.evaluation_id]!;
  const split = evaluation.split[run.dataset_id]!;
  const artifact = data.artifacts[run.artifact_id]!;
  const reuse = data.reuse.filter(({ generation_ids }) => generation_ids.includes(run.id));
  const dp = run.dp;
  const configuration = run.configuration;

  return (
    <div className="mt-panel-gap grid gap-panel-gap">
      <Select
        label="생성 실행"
        value={run.id}
        options={condition.runIds.map((id) => ({ value: id, label: data.runs[id]!.source_run_id }))}
        onValueChange={onRunChange}
        controlSize="sm"
        fieldClassName="w-field-sm max-w-full"
      />
      <div className="grid gap-panel-gap desktop:grid-cols-2">
        <section className="grid content-start gap-control-inset">
          <h3 className="text-label">실험 소속과 생성 실행</h3>
          <Facts
            rows={[
              ["원본 실행 ID", run.source_run_id],
              ["생성 실행 ID", run.id],
              ["확인된 실험", condition.experimentId],
              ["원본 실험 ID", run.source_experiment_id],
              [
                "소속 확인 상태",
                <span key="owner" title={run.ownership_status}>
                  {ownershipLabels[run.ownership_status]}
                </span>,
              ],
              ["수행자", experiment?.performer],
              ["Phase · 조건", `Phase ${run.phase} · ${run.condition_id} · ${run.source_label}`],
              [
                "반복 번호 · 생성량",
                `${run.repetition_index} · ${run.synthetic_rows.toLocaleString("ko-KR")}행`,
              ],
              ["생성 상태", run.status],
              ["시작 · 종료", `${factsValue(run.started_kst)} · ${factsValue(run.finished_kst)}`],
              ["표현 방식", run.representation],
              ["원본 표현 기록", run.source_representation],
              ["실행 코드 커밋", run.execution_code_commit],
            ]}
          />
          <details className="grid gap-control-gap text-meta">
            <summary className="cursor-pointer text-label">소속 확인 근거</summary>
            <ul className="grid gap-control-gap">
              {run.ownership_evidence_refs.map((source, index) => (
                <li key={index}>
                  <Evidence source={source} />
                </li>
              ))}
            </ul>
          </details>
          <UnknownFields entries={run.unknown_fields} />
        </section>
        <section className="grid content-start gap-control-inset">
          <h3 className="text-label">평가 실행과 조건</h3>
          <Facts
            rows={[
              ["평가 실행 ID", run.evaluation_id],
              ["평가 버전", evaluation.version],
              ["평가 프로토콜", evaluation.protocol],
              ["프로토콜 해시", evaluation.protocol_sha256],
              [
                "평가 시작 · 종료",
                `${factsValue(evaluation.started_utc)} · ${factsValue(evaluation.finished_utc)}`,
              ],
              ["데이터셋 · 분할", `${run.dataset_id} · ${split.id}`],
              [
                "공통 N",
                `${factsValue(run.common_n_target)}행 · 계획 추출 ${evaluation.planned_common_n_draws}회`,
              ],
              ["평가 기록", evaluation.source_ref],
              ["평가 조건 원본", evaluation.protocol_ref],
            ]}
          />
          <details className="text-meta">
            <summary className="cursor-pointer text-label">분할 파일 해시</summary>
            <Facts rows={Object.entries(split.files)} />
          </details>
        </section>
        <section className="grid content-start gap-control-inset">
          <h3 className="text-label">생성 설정과 DP 기록</h3>
          <Facts
            rows={[
              ["모델", configuration.model],
              [
                "하이퍼파라미터",
                Object.entries(configuration.actual_hyperparameters)
                  .map(([key, value]) => `${key} ${factsValue(value)}`)
                  .join(" · "),
              ],
              [
                "배분 비율",
                configuration.fractions
                  ? Object.entries(configuration.fractions)
                      .map(([key, value]) => `${key} ${value}`)
                      .join(" · ")
                  : "미확인",
              ],
              ["예약 예산 비율", factsValue(configuration.rho_reserved_unspent_fraction)],
              ["생성 프로토콜 해시", configuration.protocol_sha256],
              ["학습 입력 해시", configuration.train_input_sha256],
              ["목표 ε · δ", `${factsValue(dp.epsilon_target)} · ${factsValue(dp.delta_target)}`],
              [
                "기록 ε · δ",
                `${factsValue(dp.epsilon_total_recorded)} · ${factsValue(dp.delta_total)}`,
              ],
              ["계산된 ε 상한", factsValue(dp.epsilon_total_upper_bound)],
              ["인접성 · 적용 범위", `${factsValue(dp.adjacency)} · ${factsValue(dp.scope)}`],
              ["회계 검증 통과", factsValue(dp.accounting_passed)],
              ["원본 DP 주장", factsValue(dp.source_formal_dp_claim)],
              [
                "ρ 예산 · 사용 · 미사용",
                `${factsValue(dp.rho_budget)} · ${factsValue(dp.rho_total)} · ${factsValue(dp.rho_reserved_unspent)}`,
              ],
              [
                "ρ 단계별 기록",
                Object.entries(dp.rho_by_phase)
                  .filter(([, value]) => value !== undefined)
                  .map(([key, value]) => `${key} ${value}`)
                  .join(" · ") || "미확인",
              ],
              ["회계 근거", dp.evidence_ref],
            ]}
          />
        </section>
        <section className="grid content-start gap-control-inset">
          <h3 className="text-label">산출물과 계보</h3>
          <Facts
            rows={[
              ["생성물 해시", run.artifact_id],
              ["해시 알고리즘 · 대상", `${artifact.hash_algorithm} · ${artifact.hashes}`],
              ["해시 검증", factsValue(run.artifact_hash_verified)],
              ["생성물 경로", artifact.source_refs.join(" · ")],
              ["생성 메타데이터", run.source_refs.generation_metadata],
              ["실행 평가 원본", run.source_refs.evaluation_result],
              ["실행 코드 기록", run.execution_frozen_sources_ref],
              ["이전 실험", experiment?.previous_experiment_ids?.join(", ") || "미확인"],
              [
                "이 결과를 재사용한 실험",
                reuse.length
                  ? reuse.map((relation) => relation.consumer_experiment_id).join(", ")
                  : "기록 없음",
              ],
            ]}
          />
          {experiment && (
            <details className="text-meta">
              <summary className="cursor-pointer text-label">변경 조건과 계보 근거</summary>
              <p>{experiment.objective}</p>
              <ul className="grid gap-control-gap">
                {experiment.lineage.map((item) => (
                  <li key={item.evidence_ref}>
                    {item.experiment_id} · {item.relation_type} · {item.evidence_ref}
                  </li>
                ))}
                {experiment.changes
                  .filter((change) => change.condition_id === run.condition_id)
                  .map((change) => (
                    <li key={change.parameter}>
                      {change.parameter} · {factsValue(change.before)} → {factsValue(change.after)}{" "}
                      · {change.reason} · {change.evidence_ref}
                    </li>
                  ))}
                {experiment.evidence_refs.map((source, index) => (
                  <li key={index}>
                    <Evidence source={source} />
                  </li>
                ))}
                {reuse.map((relation) => (
                  <li key={relation.consumer_experiment_id}>
                    <Evidence source={relation.evidence_ref} />
                  </li>
                ))}
              </ul>
              <UnknownFields entries={experiment.unknown_fields} />
            </details>
          )}
        </section>
      </div>
      <section>
        <h3 className="mb-control-gap text-label">실행별 원본 지표 · {run.metrics.length}개</h3>
        <TableViewport label="실행별 원본 지표">
          <table className={styles.archiveTable}>
            <thead>
              <tr>
                <th scope="col">지표 · 평가 범위</th>
                <th scope="col">원본값</th>
                <th scope="col">상태와 근거</th>
              </tr>
            </thead>
            <tbody>
              {run.metrics.map((metric) => {
                const definition = metricByKey.get(metric.key)!;
                const detail = data.metricDetails[metric.detailId]!;
                return (
                  <tr key={metric.key}>
                    <th scope="row">
                      {recordedMetricName(definition)} · {scopeLabels[definition.reference_scope]}
                      <small>{directionLabel(definition)}</small>
                    </th>
                    <td>{rawValue(metric.value)}</td>
                    <td>
                      <details className="max-w-xl whitespace-normal [overflow-wrap:anywhere]">
                        <summary className="cursor-pointer">
                          {statusLabels[metric.status]}
                          {metric.missing_reason && ` · ${metric.missing_reason}`}
                        </summary>
                        <Facts
                          rows={[
                            ["단위", definition.unit],
                            [
                              "참조 데이터 · 표본 수",
                              `${detail.reference_data} · ${factsValue(detail.reference_sample_rows)}`,
                            ],
                            ["합성 표본 수", factsValue(detail.synthetic_sample_rows)],
                            [
                              "공통 N 목표 · 충족",
                              `${factsValue(detail.common_n_target)} · ${factsValue(detail.common_n_satisfied)}`,
                            ],
                            ["표본 규칙", detail.sampling],
                            [
                              "MIA 질의 표본",
                              detail.mia_member_query_rows === null
                                ? "미확인"
                                : `회원 ${detail.mia_member_query_rows} · 비회원 ${factsValue(detail.mia_nonmember_query_rows)}`,
                            ],
                            [
                              "평가 반복 수 · 단위",
                              `${detail.valid_replicate_count} · ${factsValue(detail.replicate_unit)}`,
                            ],
                            [
                              "공격 · 통계량",
                              `${factsValue(definition.attack)} · ${factsValue(definition.statistic)}`,
                            ],
                            [
                              "FPR · 동점 처리",
                              `${factsValue(definition.fpr)} · ${factsValue(definition.tie_handling)}`,
                            ],
                            [
                              "실행 지표 집계",
                              detail.aggregation === "mean_of_per_draw_max_attack_auc"
                                ? "각 추출에서 공격별 최대 AUC를 구한 뒤 평균"
                                : detail.aggregation,
                            ],
                            [
                              "원본 값 위치",
                              <Evidence
                                key="source"
                                source={{
                                  path: detail.sourcePath ?? run.source_refs.evaluation_result,
                                  field: detail.sourceField,
                                }}
                              />,
                            ],
                            [
                              "미측정 사유",
                              metric.status === "measured"
                                ? "해당 없음"
                                : (metric.missing_reason ?? "미확인"),
                            ],
                            [
                              "미측정 근거",
                              detail.missingEvidence ? (
                                <Evidence
                                  key="missing"
                                  source={{
                                    path:
                                      detail.missingEvidence.path ??
                                      run.source_refs.evaluation_result,
                                    field: detail.missingEvidence.field,
                                  }}
                                />
                              ) : metric.status === "measured" ? (
                                "해당 없음"
                              ) : (
                                "미확인"
                              ),
                            ],
                          ]}
                        />
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableViewport>
      </section>
    </div>
  );
}
