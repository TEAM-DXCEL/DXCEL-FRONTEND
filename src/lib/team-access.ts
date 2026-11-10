import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function teamAccess(authorization: string | null) {
  const password = process.env.DXCEL_TEAM_PASSWORD;
  if (!password) return process.env.NODE_ENV === "development" ? "allowed" : "unconfigured";

  const expected = Buffer.from(`team:${password}`, "utf8").toString("base64");
  const supplied = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(authorization ?? "")?.[1];
  if (!supplied) return "denied";

  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(supplied), hash(expected)) ? "allowed" : "denied";
}
