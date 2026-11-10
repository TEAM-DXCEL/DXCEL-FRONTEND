import { NextResponse, type NextRequest } from "next/server";
import { teamAccess } from "@/lib/team-access";

export function proxy(request: NextRequest) {
  const access = teamAccess(request.headers.get("authorization"));
  const cacheControl = "private, no-store";
  if (access === "unconfigured") {
    return new NextResponse("팀 공유 설정이 필요합니다.", {
      status: 503,
      headers: { "Cache-Control": cacheControl },
    });
  }
  if (access === "denied") {
    return new NextResponse("팀 공용 비밀번호가 필요합니다.", {
      status: 401,
      headers: { "Cache-Control": cacheControl, "WWW-Authenticate": 'Basic realm="DXCEL"' },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", cacheControl);
  return response;
}

export const config = { matcher: ["/((?!_next/static/).*)"] };
