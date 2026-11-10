import "server-only";

import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const decompress = promisify(gunzip);

export function createResearchClient() {
  if (process.env.NODE_ENV !== "development") return null;
  const url = process.env.DXCEL_COMPARISON_SUPABASE_URL;
  const key = process.env.DXCEL_COMPARISON_SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readResearchArchive(
  object: "dashboard.json.gz" | "dashboard-baselines.json.gz",
) {
  const client = createResearchClient();
  if (!client) return null;

  const { data, error } = await client.storage
    .from("dxcel-research-archive")
    .download(object, {}, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (error) throw new Error("Supabase에서 연구 기록을 읽을 수 없습니다.");

  return decompress(Buffer.from(await data.arrayBuffer()), { maxOutputLength: 32 * 1024 * 1024 });
}
