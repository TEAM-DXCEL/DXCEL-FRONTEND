import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, basename, delimiter } from "node:path";
import { cache } from "react";
import { appendSelectedDelta } from "./addition";
import type { SelectedDelta } from "./replacement";

function localAdditionDirectories() {
  if (process.env.NODE_ENV !== "development") return [];
  const directories =
    process.env.DXCEL_LOCAL_SELECTED_DELTA_DIRS ?? process.env.DXCEL_LOCAL_SELECTED_DELTA_DIR;
  return directories
    ? directories
        .split(delimiter)
        .filter(Boolean)
        .map((directory) => resolve(directory))
    : [];
}

export function localAdditionDirectory() {
  return localAdditionDirectories()[0] ?? null;
}

const readValidatedAddition = cache(async (directory: string) => {
  const validation = JSON.parse(
    await readFile(/* turbopackIgnore: true */ resolve(directory, "validation.json"), "utf8"),
  ) as {
    passed: boolean;
    output_sha256: Record<string, string>;
  };
  if (!validation.passed) throw new Error("추가 데이터의 검증 완료 상태를 확인할 수 없습니다.");
  let input: unknown;
  const hashes = validation.output_sha256;
  for (const required of ["selected_experiments.json", "source_manifest.json", "README.md"]) {
    if (!hashes[required]) throw new Error(`추가 파일의 검증 해시가 없습니다 (${required}).`);
  }
  for (const name of Object.keys(hashes)) {
    if (basename(name) !== name) throw new Error("검증 파일은 전달본 내부 파일이어야 합니다.");
    const bytes = await readFile(/* turbopackIgnore: true */ resolve(directory, name));
    if (createHash("sha256").update(bytes).digest("hex") !== validation.output_sha256[name]) {
      throw new Error(`추가 파일의 검증 해시가 다릅니다 (${name}).`);
    }
    if (name === "selected_experiments.json") input = JSON.parse(bytes.toString("utf8"));
  }
  return input as SelectedDelta & { baseline_catalog_sha256: string };
});

async function appendDirectory(current: SelectedDelta, baseline: unknown, directory: string) {
  const input = await readValidatedAddition(directory);
  if (
    basename(input.baseline_catalog_ref) !== "dashboard-baselines.json" ||
    input.baseline_catalog_ref.includes("://")
  ) {
    throw new Error("추가 데이터가 기존 Baseline 카탈로그를 참조하지 않습니다.");
  }
  const referenceBytes = await readFile(
    /* turbopackIgnore: true */ process.env.DXCEL_LOCAL_REPLACEMENT_DIR
      ? resolve(process.env.DXCEL_LOCAL_REPLACEMENT_DIR, "dashboard-baselines.json")
      : resolve(directory, input.baseline_catalog_ref),
  );
  if (createHash("sha256").update(referenceBytes).digest("hex") !== input.baseline_catalog_sha256) {
    throw new Error("기존 Baseline 참조 파일의 해시가 다릅니다.");
  }
  type Catalog = {
    baselines: {
      id: string;
      summaries: {
        key: string;
        mean: number | null;
        sample_sd: number | null;
        n_valid: number;
        n_expected: number;
      }[];
    }[];
  };
  const expected = JSON.parse(referenceBytes.toString("utf8")) as Catalog;
  const registered = baseline as Catalog;
  const signature = (catalog: Catalog) =>
    JSON.stringify(
      catalog.baselines
        .map((group) => [
          group.id,
          group.summaries
            .map(({ key, mean, sample_sd, n_valid, n_expected }) => [
              key,
              mean,
              sample_sd,
              n_valid,
              n_expected,
            ])
            .toSorted((a, b) => String(a[0]).localeCompare(String(b[0]))),
        ])
        .toSorted((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
  if (signature(expected) !== signature(registered)) {
    throw new Error("등록된 Baseline의 수치 또는 그룹이 추가 데이터의 카탈로그 참조와 다릅니다.");
  }
  return appendSelectedDelta(current, input);
}

export async function appendLocalAddition(current: SelectedDelta, baseline: unknown) {
  let result = current;
  for (const directory of localAdditionDirectories()) {
    result = await appendDirectory(result, baseline, directory);
  }
  return result;
}
