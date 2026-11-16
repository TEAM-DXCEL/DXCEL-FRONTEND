import "server-only";

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cache } from "react";
import { adaptSelectedDelta } from "./replacement";

export function localReplacementDirectory() {
  const directory = process.env.DXCEL_LOCAL_REPLACEMENT_DIR;
  return process.env.NODE_ENV === "development" && directory ? resolve(directory) : null;
}

export const readLocalReplacement = cache(async (file: string): Promise<unknown> => {
  const directory = localReplacementDirectory();
  if (!directory) throw new Error("로컬 교체 데이터가 설정되지 않았습니다.");
  return JSON.parse(await readFile(resolve(directory, file), "utf8"));
});

export const readLocalSelectedDelta = cache(async () =>
  adaptSelectedDelta(await readLocalReplacement("selected_experiments.json")),
);

export const readLocalOriginal = cache(async (file: string) => {
  // The original exports are kept separately from the replacement bundle.
  const directory = localReplacementDirectory();
  if (!directory) throw new Error("로컬 교체 데이터가 설정되지 않았습니다.");
  const legacyDirectory =
    process.env.DXCEL_LOCAL_ORIGINAL_DIR ?? resolve(dirname(directory), "../..");
  return readFile(resolve(legacyDirectory, file));
});
