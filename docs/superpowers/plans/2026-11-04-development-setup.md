# DXCEL Development Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 두 저장소를 목적별 작은 커밋으로 초기화하고 로컬 실행·정적 빌드·백엔드 개발 도구·CI를 준비한다.

**Architecture:** 기존 두 checkout에서 전용 작업 브랜치를 사용한다. 프론트는 Next.js 정적 export, 백엔드는 Supabase CLI와 Deno 개발 설정을 사용하며 실제 연구 기능과 외부 배포는 제외한다.

**Tech Stack:** Node.js 26.3.1, npm 11.16.0, Next.js 16.4.5, React, TypeScript, Tailwind CSS, ESLint, Prettier, Supabase CLI 3.0.0, Deno 2.9.6.

**Spec:** ../../architecture.md 및 DXCEL-BACKEND/docs/database-design.md, docs/server-integration.md.

## Global Constraints

- DXCEL-FRONTEND / DXCEL-BACKEND 저장소를 유지한다.
- 실제 실험 데이터·인증 토큰·개발 환경 파일은 커밋하지 않는다.
- 정적 export와 호환되는 시작 페이지를 제공하고 빌드 중 외부 폰트에 의존하지 않는다.
- 기존 학교 서버 코드는 변경하지 않는다. DB 도메인 migration, 결과 API, 업로더 기능 구현은 이번 범위에서 제외한다.
- npm lockfile과 정확한 dependency 버전으로 재설치 가능하게 한다.
- 사용자 요청에 따라 로컬 커밋을 목적별로 나누고 원격 push는 수행하지 않는다.

## Review Focus

- 환경변수 없는 clone에서도 시작 페이지·빌드 가능: 환경 미설정 상태 production build와 HTTP smoke 확인.
- 비밀/생성 파일 유출: git check-ignore와 staged file 검토.
- 정적 export와 Next.js 설정 충돌: production build의 out/index.html 생성 확인.
- Deno/Node 언어 서버 충돌: VS Code의 enablePaths와 Deno 검사 범위 확인.
- 로컬 DB 필수 도구 부재: 컨테이너 런타임 설치/기동을 확인하고, 불가능하면 이유와 미검증 범위를 README/결과에 남긴다.

---

## Task 1: 설계 기준점과 저장소 규칙

Files: 두 저장소의 README.md, docs/*.md, .gitignore, .editorconfig, .gitattributes, .npmrc, .nvmrc.

- [ ] 기존 설계 문서와 README를 각 저장소의 독립 docs 커밋으로 보존한다.
- [ ] 저장소별 ignore, 줄바꿈/들여쓰기, Node/npm 버전 기준을 추가한다.
- [ ] git diff --check와 환경파일 ignore를 확인하고 저장소별 chore 커밋을 만든다.

## Task 2: 프론트 개발 기반

Files: FRONTEND/package.json, package-lock.json, next.config.ts, tsconfig.json, next-env.d.ts, eslint.config.mjs, postcss.config.mjs, src/app/{layout.tsx,page.tsx,globals.css}.

- [ ] Next.js/React/TypeScript/Tailwind/ESLint와 정적 export의 최소 시작 페이지를 구성한다.
- [ ] npm run lint, npm run typecheck, npm run build를 실행한다.
- [ ] 로컬 HTTP로 시작 페이지 응답을 확인하고 chore 커밋을 만든다.
- [ ] 환경 예시, Prettier, 팀 실행 문서, CI를 추가하고 별도 chore/ci 커밋으로 기록한다.

## Task 3: 백엔드 개발 기반

Files: BACKEND/package.json, package-lock.json, supabase/config.toml, supabase/seed.sql, supabase/functions/deno.json, .vscode/settings.json.

- [ ] 프로젝트 로컬 Supabase CLI와 Deno 버전을 고정해 설치한다.
- [ ] supabase init으로 로컬 설정을 생성하고 localhost 개발 주소로 구성한다.
- [ ] migrations/functions/tests/contracts/uploader의 역할을 README로 명시하고 가짜 API나 빈 도메인 테이블은 만들지 않는다.
- [ ] CLI version, Deno lint/fmt, 설정 파싱을 검증하고 chore 커밋을 만든다.
- [ ] 컨테이너 런타임을 준비해 로컬 Supabase 기동과 초기 스키마 상태를 검증한다.
- [ ] 환경 예시, 실행 안내, 생성 타입 명령, CI를 별도 chore/ci 커밋으로 만든다.

## Task 4: 최종 검증과 기록

- [ ] 양 저장소의 npm ci 재현성, 모든 check, 프론트 production build를 확인한다.
- [ ] 백엔드 runtime 가능 범위·로컬 자원·비밀 미추적·의도된 변경 파일을 점검한다.
- [ ] 전체 변경을 별도 리뷰하고 중요한 문제는 수정·검증한다.
- [ ] 계획 체크 상태, 최종 커밋과 실행 명령을 정리한다.

## 실행 기록

- 개발 환경 초기화 요청을 이 범위의 실행 승인으로 해석하고 같은 세션에서 직접 진행한다.
- 두 기존 경로에 미커밋 설계 문서가 있어 경로를 보존하는 작업 브랜치를 선택했다. 별도 worktree는 생성하지 않는다.
- 설정/최소 시작 화면에는 구현을 그대로 따라가는 단위 테스트 대신 lint·타입 검사·production build·HTTP smoke를 사용한다. 실제 기능 구현 시 해당 동작의 테스트를 추가한다.
