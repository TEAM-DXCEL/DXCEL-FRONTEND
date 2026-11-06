import {
  conditionLabels,
  findSample,
  sampleAuthors,
  sampleLineage,
  sampleObjectives,
  type SampleConditions,
  type SampleExperiment,
} from "./sample-data";
import styles from "./comparison.module.css";

export function ExperimentLineage({
  selected,
  onSelect,
}: {
  selected: SampleExperiment;
  onSelect: (id: string) => void;
}) {
  const previous = findSample(selected.previousId);
  const lineage = sampleLineage(selected);
  const recent = lineage.slice(-3);
  const objective = sampleObjectives.find((goal) => goal.id === selected.objectiveId)!;
  const changed = (Object.keys(conditionLabels) as (keyof SampleConditions)[]).filter(
    (key) => previous && previous.conditions[key] !== selected.conditions[key],
  );
  return (
    <section className={styles.lineagePanel} aria-labelledby="lineage-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionIndex}>02 / EXPERIMENT LINEAGE</span>
          <h2 id="lineage-title">어떤 실험의, 무엇을 바꿨는가</h2>
        </div>
        <span className={styles.chartTag}>계보 {lineage.length}단계</span>
      </div>
      <div className={styles.lineageFlow}>
        {recent.map((item, index) => {
          const author = sampleAuthors.find((a) => a.id === item.authorId)!;
          return (
            <div key={item.id}>
              {index > 0 && <span className={styles.flowArrow}>→</span>}
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-pressed={selected.id === item.id}
              >
                <span>
                  {item.id === selected.id
                    ? "선택한 실험"
                    : item.id === previous?.id
                      ? "직접 이전 실험"
                      : "이전 계보"}
                </span>
                <strong>{item.label}</strong>
                <small>
                  <i style={{ background: author.color }} />
                  {author.name}
                </small>
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.intentNote}>
        <span>{objective.label}</span>
        <p>{selected.change}</p>
      </div>
      <div className={styles.conditionHeading}>
        <strong>실험 조건 비교</strong>
        <span>
          {previous
            ? `${changed.length}개 변경 · ${Object.keys(conditionLabels).length - changed.length}개 유지`
            : "시작 실험의 초기 조건"}
        </span>
      </div>
      <div className={styles.conditionTable}>
        <table>
          <caption className="sr-only">이전 실험과 선택한 실험의 조건 차이</caption>
          <thead>
            <tr>
              <th scope="col">조건</th>
              <th scope="col">{previous?.label ?? "이전 실험 없음"}</th>
              <th scope="col">{selected.label}</th>
              <th scope="col">변경</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(conditionLabels) as (keyof SampleConditions)[]).map((key) => (
              <tr key={key} data-changed={changed.includes(key)}>
                <th scope="row">{conditionLabels[key]}</th>
                <td>{previous ? String(previous.conditions[key]) : "—"}</td>
                <td>{String(selected.conditions[key])}</td>
                <td>{changed.includes(key) ? "변경됨" : previous ? "유지" : "초기"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.panelSubtitle}>
        평가 조건은 샘플 조건 A로 동일합니다. 위 표는 생성·학습 조건의 차이입니다.
      </p>
    </section>
  );
}
