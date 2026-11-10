# DXCEL-FRONTEND

합성 데이터 연구의 실험 비교·아카이빙 대시보드입니다.

## 개발 환경

- Node.js `26.3.1`, pnpm `10.34.9` (`.nvmrc`, `packageManager` 기준)
- Next.js App Router, React, TypeScript, Tailwind CSS
- pnpm을 사용하며 `pnpm-lock.yaml`을 함께 커밋합니다.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

개발 주소는 [http://127.0.0.1:3000](http://127.0.0.1:3000)입니다.
현재 대시보드 레이아웃은 Supabase 연결 없이 실행됩니다. 컴포넌트 미리보기는 `/ui-preview`에서 확인합니다.
백엔드가 실행되면 `.env.local`에 로컬 publishable/anon key를 입력합니다.
관리자 키와 수집 token은 `NEXT_PUBLIC_*`에 넣지 않습니다.

## 팀 공유 서버

```bash
pnpm check
pnpm build
pnpm preview
```

배포 호스트의 서버 환경 변수에 다음 값을 설정합니다.

| 변수                                   | 값                                   |
| -------------------------------------- | ------------------------------------ |
| `DXCEL_TEAM_PASSWORD`                  | 팀 공용 비밀번호                     |
| `DXCEL_COMPARISON_SUPABASE_URL`        | 연구 기록이 있는 Supabase URL        |
| `DXCEL_COMPARISON_SUPABASE_SECRET_KEY` | Supabase 서버용 비밀 키              |
| `DXCEL_COMPARISON_RUN_ID`              | 실험 목록·비교에 표시할 등록 실행 ID |

HTTPS 배포 주소를 열면 브라우저에서 사용자 이름 `team`과 공용 비밀번호를 입력합니다. 로컬에서 같은 방식으로 확인하려면 위 변수를 설정한 뒤 `pnpm preview`를 실행합니다. 기본 포트는 3000이므로 개발 서버와 동시에 사용하려면 다른 포트를 지정합니다.

## 작업 규칙

- 기능·수정·개발 도구·문서 변경을 목적별 커밋으로 나눕니다.
- 커밋 메시지는 `feat:`, `fix:`, `chore:`, `docs:`, `ci:` 형식을 사용합니다.
- 커밋 전 `pnpm check`, 서버 경로/설정 변경 시 `pnpm build`를 실행합니다.
- 단순 UI·스타일·props 전달 및 구현을 그대로 반복하는 로직 테스트는 추가하지 않습니다. 포맷·린트·타입 검사와 빌드 검증은 유지합니다.
- `.env.local`, `node_modules/`, `.next/`, `out/`은 Git에서 제외합니다.
- 기존 설계 문서는 자동 포맷 대상에서 제외해 설계 내용과 코드 스타일 변경을 분리합니다.

초기 설치 검증에서 런타임 의존성의 `pnpm audit --omit=dev`는 0건입니다.
ESLint 9는 현재 Next.js 린트 플러그인의 peer 범위에 맞춰 고정했습니다.
개발용 린트 의존성에는 upstream `minimatch` 관련 moderate 경고가 남아 있으며,
지원되지 않는 메이저 강제 override는 적용하지 않습니다.
호환되는 upstream 수정 버전이 나오면 별도 의존성 커밋으로 갱신합니다.

PR과 main/develop/작업 브랜치 push에 CI가 실행됩니다.

## 설계 문서

- [실험 목록과 도메인 타입](docs/experiments.md)
- [데스크톱 공통 레이아웃과 페이지 경로](docs/dashboard-layout.md)
- [공통 UI 컴포넌트 사용법](docs/ui-components.md)
- [데스크톱 타이포·간격·크기·효과 토큰](docs/design-tokens.md)
- [컬러 토큰과 사용 규칙](docs/color-tokens.md)
- [전체 구조·페이지·무료 배포 설계 초안](docs/architecture.md)
- DB·수집 API 계약은 `TEAM-DXCEL/DXCEL-BACKEND`의 `docs/database-design.md`에서 관리합니다.
