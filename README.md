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

## 교체 실험 데이터 로컬 확인

운영 Supabase 데이터로 확인하려면 `DXCEL_COMPARISON_SUPABASE_URL`과
`DXCEL_COMPARISON_SUPABASE_SECRET_KEY`를 개발 서버에 설정하고 `pnpm dev`를 실행합니다.
`DXCEL_LOCAL_REPLACEMENT_DIR`를 지정하지 않으면 현재 등록된 비교 버전을 Supabase에서 읽습니다.

검증된 `dashboard-baselines.json`과 `selected_experiments.json`(schema version 2)을
`.local/results/dashboard_export/replacement_audit_20261117/`에 둡니다. 기존 버전 1
선정 실험과 기록은 각각 `.local/selected_experiments.json`, `.local/dashboard.json`에서
읽습니다. 기존 파일이 다른 디렉터리에 있으면 `DXCEL_LOCAL_ORIGINAL_DIR`로 지정합니다.

```bash
DXCEL_LOCAL_REPLACEMENT_DIR=.local/results/dashboard_export/replacement_audit_20261117 pnpm dev
```

이 모드는 Next.js 개발 서버에서만 활성화됩니다. 공식 기준과 선정 실험의 변경은
`/baselines`, `/compare`, `/results`, `/overview`에서 확인할 수 있습니다.
`/experiments`는 선정 비교 제외 조건의 원래 실험 이력도 유지합니다.
로컬 파일은 Git에서 제외하며 원격 등록 실행을 조회하지 않습니다.

### EXP-165 추가 데이터 로컬 확인

전달받은 네 파일을 `.local/results/dashboard_export/exp165_addition_20261120/`에
보존하고 다음 명령으로 운영 기록 위에 추가해 확인합니다.

```bash
DXCEL_LOCAL_SELECTED_DELTA_DIR=.local/results/dashboard_export/exp165_addition_20261120 pnpm dev --port 3017
```

이 환경 변수는 개발 서버에서만 적용됩니다. 파일 해시와 기존 Baseline 참조를 검증한 뒤
EXP-165를 추가하며, 기존 제외 이력은 유지합니다. 서버용 Supabase 환경 변수도 필요합니다.
EXP-165의 독립 DP 부모는 35개이고, 두 decoder의 복원 출력·평가는 70개입니다.
보조 PT_MID는 참고용이며 Overview의 자동 개선 판정과 목록에서 제외합니다.
운영 DB에 등록한 이후에는 위 환경 변수를 설정하지 않고 `pnpm dev`로 실행합니다.
이미 등록한 실험을 로컬 delta로 다시 추가하면 중복 방지를 위해 오류를 표시합니다.

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
