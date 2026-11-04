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
현재 시작 화면은 Supabase 연결 없이 실행됩니다.
백엔드가 실행되면 `.env.local`에 로컬 publishable/anon key를 입력합니다.
관리자 키와 수집 token은 `NEXT_PUBLIC_*`에 넣지 않습니다.

## 검사와 정적 빌드

```bash
pnpm check
pnpm build
pnpm preview
```

- `check`: 포맷·ESLint·TypeScript 검사
- `format`: 소스와 개발 설정 포맷
- `build`: Cloudflare Pages용 `out/` 정적 파일 생성
- `preview`: 빌드 결과를 로컬 3000 포트에서 확인. 개발 프로세스와 동시에 사용하지 않습니다.

`output: "export"`를 사용하므로 `next start`, 런타임 API Route, Server Actions를 사용하지 않습니다.
비공개 연구 데이터는 빌드 산출물에 포함하지 않습니다. 외부 폰트 다운로드 없이 빌드됩니다.
Cloudflare Pages 연결 시 build command는 `pnpm build`, output directory는 `out`,
`NODE_VERSION`은 `.nvmrc`와 동일하게 설정합니다. 아직 호스팅 프로젝트는 생성하지 않았습니다.

## 작업 규칙

- 기능·수정·개발 도구·문서 변경을 목적별 커밋으로 나눕니다.
- 커밋 메시지는 `feat:`, `fix:`, `chore:`, `docs:`, `ci:` 형식을 사용합니다.
- 커밋 전 `pnpm check`, 정적 경로/설정 변경 시 `pnpm build`를 실행합니다.
- 실제 기능을 구현할 때 해당 동작의 테스트를 추가합니다. 초기 시작 화면에는 형식적인 테스트를 두지 않습니다.
- `.env.local`, `node_modules/`, `.next/`, `out/`은 Git에서 제외합니다.
- 기존 설계 문서는 자동 포맷 대상에서 제외해 설계 내용과 코드 스타일 변경을 분리합니다.

초기 설치 검증에서 런타임 의존성의 `pnpm audit --omit=dev`는 0건입니다.
ESLint 9는 현재 Next.js 린트 플러그인의 peer 범위에 맞춰 고정했습니다.
개발용 린트 의존성에는 upstream `minimatch` 관련 moderate 경고가 남아 있으며,
지원되지 않는 메이저 강제 override는 적용하지 않습니다.
호환되는 upstream 수정 버전이 나오면 별도 의존성 커밋으로 갱신합니다.

PR과 main/작업 브랜치 push에 CI가 실행되도록 설정했습니다. 원격에 push한 뒤 실제 Actions 실행 결과를 확인해야 합니다.

## 설계 문서

- [데스크톱 타이포·간격·크기·효과 토큰](docs/design-tokens.md)
- [컬러 토큰과 사용 규칙](docs/color-tokens.md)
- [전체 구조·페이지·무료 배포 설계 초안](docs/architecture.md)
- DB·수집 API 계약은 `TEAM-DXCEL/DXCEL-BACKEND`의 `docs/database-design.md`에서 관리합니다.

현재는 개발 기반과 최소 시작 화면만 있습니다. 로그인·실험 조회·비교 기능은 후속 구현 범위입니다.
