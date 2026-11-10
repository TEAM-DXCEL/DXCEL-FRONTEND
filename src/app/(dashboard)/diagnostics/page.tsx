import { notFound } from "next/navigation";
import { DashboardPage } from "@/components/layout/dashboard-page";
import styles from "@/features/comparison/comparison.module.css";
import { loadSelectedExport } from "@/features/selected-experiments/source";

export const metadata = { title: "진단 | DXCEL" };

const titles: Record<string, string> = {
  "EXP-119": "구간화에 따른 정보 손실",
  "EXP-120": "AIM 관계 선택 누락",
};

export default async function DiagnosticsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const data = await loadSelectedExport();
  return (
    <DashboardPage
      title="연구 진단"
      description="EXP-119·120의 비DP 진단 결과입니다. 로컬 검토용으로 원본 관측값과 해석 범위를 표시합니다."
    >
      {data ? (
        data.diagnostics
          .filter(({ experiment_id }) => Object.hasOwn(titles, experiment_id))
          .map((experiment) => (
            <section
              key={experiment.experiment_id}
              className={`${styles.recordedPanel} mb-panel-gap`}
            >
              <h2 className="text-heading-sm">
                {experiment.experiment_id} · {titles[experiment.experiment_id]}
              </h2>
              <p className="text-meta">{experiment.limitation}</p>
              <ul className="my-control-inset list-disc pl-5 text-meta">
                {experiment.additional_limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
              {experiment.tables.map((table) => {
                const columns = [
                  ...new Set(table.records.flatMap(({ observation }) => Object.keys(observation))),
                ];
                return (
                  <details
                    key={table.name}
                    className="mt-control-inset rounded-control border-thin border-border p-control-inset"
                  >
                    <summary className="cursor-pointer text-label">
                      {table.name} · {table.records.length}건
                    </summary>
                    <div className={styles.archiveScroll}>
                      <table className={styles.archiveTable}>
                        <thead>
                          <tr>
                            {columns.map((column) => (
                              <th scope="col" key={column}>
                                {column}
                              </th>
                            ))}
                            <th scope="col">원본</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.records.map(({ observation, source }, index) => (
                            <tr key={index}>
                              {columns.map((column) => (
                                <td key={column}>
                                  {observation[column] == null ? "—" : String(observation[column])}
                                </td>
                              ))}
                              <td>
                                {source.path} {source.field}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </section>
          ))
      ) : (
        <p>선정 실험 로컬 검토 파일을 확인하세요.</p>
      )}
    </DashboardPage>
  );
}
