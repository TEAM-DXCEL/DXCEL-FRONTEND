# 데스크톱 디자인 토큰

진입점은 `src/styles/tokens.css`다. 컬러는 `colors.css`, 타이포는 `typography.css`, 간격·크기·테두리·효과는 `foundations.css`에서 관리한다. [컬러 사용 규칙](color-tokens.md)과 함께 사용한다.

데스크톱 대시보드의 기본값이며, 개별 화면 설계가 확정되면 토큰에서 조정한다. 시스템 한글 sans와 monospace를 사용하므로 폰트 다운로드는 필요 없다.

## 타이포

`text-*` 하나로 크기·행간·굵기·자간을 함께 적용한다. 표의 숫자에는 `tabular-nums`, ID·설정값·코드에는 `font-mono`를 추가한다. 제목 역할은 시각 스타일과 별개로 올바른 HTML heading을 사용한다.

| 클래스 | 크기 / 행간 | 굵기 | 용도 |
| --- | --- | --- | --- |
| `text-caption` | 12 / 16px | 400 | 캡션·축 보조 정보 |
| `text-meta` | 13 / 20px | 400 | 날짜·담당자 |
| `text-label` | 13 / 20px | 500 | 폼·탭·버튼 |
| `text-body` | 14 / 24px | 400 | 기본 본문 |
| `text-body-lg` | 16 / 28px | 400 | 소개·긴 설명 |
| `text-table` | 14 / 20px | 400 | 표 데이터 |
| `text-table-head` | 12 / 16px | 600 | 표 헤더 |
| `text-heading-sm` | 18 / 28px | 600 | 카드·섹션 제목 |
| `text-heading-md` | 24 / 32px | 600 | 페이지 부제목 |
| `text-heading-lg` | 32 / 40px | 600 | 페이지 제목 |
| `text-display` | 48 / 56px | 700 | 소개 화면 제목 |
| `text-metric` | 32 / 40px | 600 | 요약 지표 |

크기와 행간은 rem으로 정의했다. 표의 px 값은 기본 16px 환경 기준이다. `font-regular/medium/semibold/bold`, `leading-tight/normal/relaxed`, `tracking-tight/normal/wide`로 필요한 역할만 명시적으로 조정한다. 제목·지표는 기본 자간 -0.02em, 그 외는 0이다. `tracking-wide`는 영문 소제목용이다.

## 간격과 데스크톱 레이아웃

기본 간격 단위는 4px이다. `gap-1`=4px, `gap-2`=8px, `gap-3`=12px, `gap-4`=16px, `gap-6`=24px, `gap-8`=32px처럼 사용한다. 역할이 있는 간격·크기는 아래 이름을 우선 사용한다.

| 토큰 접미사 | 기본값 | 사용 예 |
| --- | --- | --- |
| `page-gutter`, `page-block` | 32px | `px-page-gutter py-page-block` |
| `section-gap` | 32px | `gap-section-gap` |
| `panel-gap`, `card-inset` | 24px | `gap-panel-gap p-card-inset` |
| `control-gap`, `control-inset` | 8px / 12px | `gap-control-gap px-control-inset` |
| `control-sm/md/lg` | 32 / 40 / 44px | `min-h-control-md` |
| `field-sm/md`, `search` | 160 / 256 / 320px | `w-field-md w-search` |
| `icon-sm/md/lg` | 16 / 20 / 24px | `size-icon-md` |
| `sidebar`, `sidebar-rail` | 240 / 64px | `w-sidebar shrink-0` |
| `header` | 64px | `min-h-header` |
| `table-cell-x/y` | 16 / 12px | `px-table-cell-x py-table-cell-y` |
| `table-cell-y-compact` | 8px | `py-table-cell-y-compact` |
| `table-row`, `table-row-compact` | 48 / 40px | `h-table-row` |
| `table-header` | 44px | `h-table-header` |
| `table-min` | 1024px | 스크롤 영역 안의 표에 `min-w-table-min` |
| `chart-min` | 256px | `min-h-chart-min` |

| 레이아웃 토큰 | 기본값 | 클래스 |
| --- | --- | --- |
| 페이지 최대 폭 | 1600px | `max-w-page` |
| 긴 글 최대 폭 | 640px | `max-w-reading` |
| 다이얼로그 최대 폭 | 384 / 576 / 768px | `max-w-dialog-sm/md/lg` |
| Desktop breakpoint | 1024px | `desktop:*` |
| Wide breakpoint | 1440px | `wide:*` |

화면 전체에 최소 폭을 강제하지 않는다. `min-w-0`, `w-full`, 필요 영역의 `overflow-x-auto`를 사용한다. 비교표의 `min-w-table-min`은 여러 열이 있을 때 선택적으로 적용한다. 컨트롤 높이는 최소 높이로 사용해 글자 확대나 줄바꿈을 허용한다. 데스크톱 토큰이며 모바일 전용 화면은 아직 설계하지 않았다.

## 테두리·라운드·그림자

| 용도 | 토큰 / 클래스 |
| --- | --- |
| 기본 테두리 | `--border-width-default: 1px` / `border-thin` |
| 강조 테두리 | `--border-width-emphasis: 2px` / `border-thick` |
| 포커스 | 2px outline + 2px offset / `focus-visible:focus-outline` |
| 기본 라운드 | `rounded-none/xs/sm/md/lg/xl/full`: 0 / 2 / 4 / 6 / 8 / 12px / pill |
| 용도별 라운드 | `rounded-control/card/badge/dialog`: 6 / 8 / 4 / 12px |
| 그림자 | `shadow-none/card/dropdown/dialog` |
| 안쪽 하이라이트 | `inset-shadow-surface` |

테두리 **두께**와 **색상**은 분리한다. 예: `border-thin border-border`, 입력은 `border-thin border-border-strong`. 다크 배경에서 그림자만으로 영역을 구분하지 않고 테두리를 함께 사용한다.

## 레이어와 모션

레이어는 `--z-base/sticky/dropdown/overlay/dialog/popover/toast/tooltip`이며 값은 순서대로 0 / 10 / 20 / 30 / 40 / 50 / 60 / 70이다. `z-(--z-dialog)`처럼 사용한다. 실제 컴포넌트는 부모 stacking context와 portal 위치도 함께 관리해야 한다.

`--duration-instant/fast/normal/slow`는 0 / 120 / 180 / 240ms다. 기본 transition은 normal과 `ease-standard`를 사용한다. `ease-enter`, `ease-exit`도 제공한다. 예: `transition-colors duration-(--duration-fast) ease-standard`. reduced-motion 환경에서는 fast·normal·slow를 0ms로 바꾼다. 별도 keyframe을 추가할 때는 컴포넌트에도 `motion-reduce` 대응을 적용한다.

차트 선·격자·마커는 각각 `--chart-stroke-width: 2px`, `--chart-grid-width: 1px`, `--chart-marker-radius: 4px`로 제공한다. SVG/CSS에서는 변수로, Canvas에서는 브라우저에서 해석한 값을 사용한다.

## 조합 예시

```tsx
<section className="rounded-card border-thin border-border bg-surface p-card-inset shadow-card">
  <h2 className="text-heading-sm">실험 비교</h2>
  <p className="mt-2 text-body text-foreground-muted">같은 평가 조건의 결과를 비교합니다.</p>
  <button className="mt-panel-gap inline-flex min-h-control-md items-center justify-center gap-control-gap rounded-control bg-primary px-control-inset text-label text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary-hover focus-visible:focus-outline">
    비교하기
  </button>
</section>
```

새 수치를 컴포넌트에 반복해서 넣지 않는다. 역할이 생기면 해당 토큰 파일에 추가하고 이 문서에 용도를 남긴다.
