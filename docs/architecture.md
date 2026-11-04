# DXCEL 웹 대시보드 구조

## 목적

실험별 성능과 baseline을 비교하고, 변경 이유와 개선 과정을 보존하는 팀 대시보드를 만든다.
실험 결과를 덮어쓰지 않고 개별 실행, 비교 기준, 연구 노트를 버전으로 관리한다.

이 문서는 웹 애플리케이션과 DB의 설계만 다룬다.

## 구성

| 영역 | 기술 | 역할 |
| --- | --- | --- |
| 화면 | Next.js App Router, React, TypeScript | 실험 탐색·비교·노트 작성 |
| 스타일 | Tailwind CSS | 공통 화면 스타일 |
| 인증·저장 | Supabase Auth, Postgres | 팀원 권한과 연구 기록 관리 |
| API | Supabase Edge Functions, DB RPC | 입력 검증과 원자적 변경 |
| 정적 배포 | Cloudflare Pages | 빌드된 웹 파일 제공 |

프론트는 `output: "export"`를 사용한다. 비공개 데이터는 빌드 파일에 넣지 않고 인증 후 조회한다.
브라우저에는 publishable key만 사용하고, 관리 권한의 키를 전달하지 않는다.
Next.js 런타임 API Route, Server Actions, ISR에 의존하지 않는다.

## 페이지

| 경로 | 기능 |
| --- | --- |
| /login | 로그인과 접근 권한 안내 |
| /auth/callback | 인증 세션 처리 |
| /overview | 프로젝트 현황과 최근 변경 |
| /experiments | 실험 검색·필터·정렬 |
| /experiments/view?id=… | 설계 버전·실행 목록·결론 |
| /runs/view?id=… | 개별 결과·설정·재평가 관계 |
| /compare | baseline 대비 지표와 설정 차이 |
| /baselines | 비교 기준의 버전과 선정 이유 |
| /activity | 변경 이력 |
| /settings | 구성원과 프로젝트 설정 |

정적 페이지는 query ID로 데이터를 조회한다. 필터와 비교 대상을 URL에 남겨 같은 화면을 공유한다.
새로운 기록이 추가돼도 웹을 다시 빌드할 필요가 없어야 한다.

## 기록 구조

- 실험: 연구 질문, 담당자, 이전 실험과의 연결.
- 설계 버전: 가설, 변경 사항, 변경 이유와 평가 계획.
- 실행 묶음: 동일 비교 조건의 반복 결과와 확정된 선택 목록.
- 개별 실행: 결과 지표, 설정, 코드·데이터 버전, 평가 상태.
- Baseline 버전: 선정한 비교 기준과 당시 포함 결과.
- 연구 노트: 해석, 한계, 다음 행동과 수정 이력.

일부 결과만 재평가하면 새 평가를 추가하고 이전 결과를 참조해 새 비교 묶음을 확정한다.
기존 결과와 과거 baseline 비교는 변경하지 않는다.

## 비교 규칙

1. 데이터셋·분할·평가 방법·지표 버전이 같은 결과끼리 차이를 계산한다.
2. 평균, 표본 표준편차, 표본 수와 포함 반복 목록을 함께 표시한다.
3. 실패·결측은 0으로 바꾸지 않는다. 표본이 하나면 표준편차는 미정이다.
4. 동일 생성 결과의 재평가를 독립 표본으로 중복 집계하지 않는다.
5. 반복 번호만으로 대응 관계를 추정하지 않는다.
6. baseline이 0이면 상대 변화율은 미정으로 표시한다.
7. 지표의 단위와 개선 방향을 보존한다.
8. 기존 보고값은 출처와 알려진 통계만 기록한다. 조건 미확인 값은 참고로 표시한다.
9. 수치 차이와 연구자의 원인 해석을 구분한다.

## 접근 권한과 조회

프로젝트 membership과 DB RLS로 열람을 제한한다. 화면 숨김만으로 접근을 통제하지 않는다.
복합 변경은 권한을 검사하는 transaction RPC로 처리하고 작성자·수정 이력을 함께 기록한다.
프로젝트 전환과 로그아웃 시 비공개 조회 캐시를 분리하거나 제거한다.

목록은 cursor pagination을 사용하고, 비교 시 선택한 지표와 묶음만 조회한다.
초기에는 영구 브라우저 데이터 캐시와 전체 테이블 실시간 구독을 사용하지 않는다.

## 개발·배포

현재 개발 기반과 최소 시작 화면만 구현돼 있다. 실제 기능은 DB 권한과 데이터 규약부터 구현한다.
설치·검사·빌드 명령은 README를 따른다. Cloudflare Pages의 빌드 결과 디렉터리는 `out`이다.

무료 요금제의 DB 용량·전송량·함수 호출 한도를 확인하고 필요한 집계 정보만 저장한다.
장기 보존을 위해 DB와 첨부파일의 별도 백업·복원 절차를 마련한다.

DB 변경은 호환성을 먼저 확보하고 화면을 전환한 뒤 구버전을 제거한다.

## 공식 문서

- [Next.js 정적 export](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Pages 정적 Next.js 배포](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase 요금제](https://supabase.com/pricing)
