# 데스크톱 공통 레이아웃

`src/app/(dashboard)/layout.tsx`에서 `DashboardShell`을 사용한다. `(dashboard)`는 URL에 나타나지 않는 route group이며, `/ui-preview`는 이 레이아웃 바깥의 독립 페이지다.

| 경로 | 화면 |
| --- | --- |
| `/`, `/overview` | Overview |
| `/experiments` | 실험 목록의 레이아웃과 표 영역 |
| `/compare` | 비교 화면의 기본 영역 |
| `/baselines` | Baseline 화면의 기본 영역 |
| `/ui-preview` | 공통 UI 컴포넌트 미리보기 |

현재 범위는 공통 레이아웃이다. 실험 데이터 조회·검색·필터·정렬·비교 동작은 아직 연결하지 않았으며, 임의의 실험 수치나 사용자 정보를 표시하지 않는다.

## 구성

- `DashboardSidebar`: 메뉴 이동과 활성 메뉴 표시. `aria-current`로 현재 위치를 알린다.
- `DashboardHeader`: 현재 페이지와 워크스페이스 영역. 실제 사용자 UI는 `DashboardShell`의 `userArea`로 전달한다.
- `WorkspaceBrand`: 제공받은 로고와 DXCEL 텍스트를 표시한다.
- `DashboardPage`: 페이지 제목·설명·콘텐츠의 공통 여백과 흰색 섹션 테마.
- `TableViewport`: 가로·세로 스크롤을 표 영역으로 제한하는 이름 있는 region.

네비게이션 경로와 이름은 `navigation.ts`에서 관리한다. `/`도 Overview 메뉴를 활성화하며, 하위 경로에서도 해당 상위 메뉴가 활성화된다.

## 로고

로고 파일은 `public/brand/`에 저장한다. 기본 로고는 `dxcel-logo.svg`, 어두운 배경용 밝은 버전은 `dxcel-logo-light.svg`, 심볼 버전은 `dxcel-symbol.svg`를 권장한다. 필요한 파일만 추가한다. URL에서는 `/brand/dxcel-logo.svg`처럼 참조한다.

`WorkspaceBrand`가 `dxcel-logo.svg`를 사용한다. 넓은 화면에서는 텍스트와 함께, 좁은 rail에서는 로고만 표시한다. 원본 SVG는 그대로 보존한다.

## 크기와 스크롤

1024px 이상에서 사이드바는 240px, 그보다 좁은 창에서는 64px rail로 표시한다. 숨겨지는 메뉴 이름은 접근 가능한 label과 title로 유지한다. 헤더는 64px, 본문 여백은 32px, 최대 폭은 1600px이며 기존 토큰을 사용한다.

사이드바와 헤더는 스크롤 중에도 유지한다. 페이지는 브라우저의 기본 세로 스크롤을 사용하고, 넓은 표에는 본문 전체의 가로 넘침 대신 표 안쪽 스크롤을 제공한다. 표 헤더는 해당 스크롤 영역 안에서 sticky로 유지한다.

표 영역의 최대 높이는 `table-region-max` 토큰인 `min(36rem, 60dvh)`다. 키보드로 표 스크롤 영역에 진입할 수 있으며, 본문 건너뛰기 링크도 제공한다. 포커스 외곽선 대신 배경색 변화로 포커스를 표시한다.

컴포넌트 미리보기 링크는 개발 중 사이드바 하단에만 표시한다. 정적 배포에서도 `/ui-preview` URL은 직접 접근할 수 있다.
