# 컬러 토큰

[BBDW25 레퍼런스](https://www.behance.net/gallery/244169557/Bilbao-Bizkaia-Design-Week-2025-BBDW25)의 화면 이미지를 바탕으로 구성했다. 아래 HEX는 이미지에서 얻은 근사값이며 공식 브랜드 컬러 규격이 아니다. 명도 단계와 상태 색상은 대시보드에 맞춰 확장했다.

## 핵심 팔레트

| 색상 | 기준 토큰 | 값 | 역할 |
| --- | --- | --- | --- |
| 그린 | `green-500` | `#47D465` | Primary, 주요 액션 |
| 오렌지 | `orange-500` | `#FF743D` | Accent, 보조 강조 |
| 옐로 | `yellow-400` | `#FCFC54` | Highlight, 선택 강조 |
| 웜 그레이 | `neutral-400` | `#C1B7AF` | 중립 팔레트의 기준 |
| 잉크 브라운 | `neutral-950` | `#281412` | 카드 배경·네온 위 글자 |

`src/styles/colors.css`가 색상의 단일 원본이다. Green·orange·yellow·neutral은 각각 50–950의 11단계다. 오류와 정보 표시는 보조 red·blue 팔레트를 같은 단계로 제공한다. Red·blue는 레퍼런스에서 추출한 브랜드 색상이 아니다.

## 용도별 토큰

| 용도 | Tailwind 이름 |
| --- | --- |
| 페이지 | `background`, `foreground` |
| 카드·영역 | `surface`, `surface-muted`, `surface-hover` |
| 역상 영역 | `surface-inverse`, `foreground-inverse` |
| 보조 글자 | `foreground-muted`, `foreground-subtle` |
| 테두리 | `border`, `border-strong` |
| 주요 액션 | `primary`, `primary-hover`, `primary-active`, `primary-foreground` |
| 주요 액션의 배경 영역 | `primary-subtle`, `primary-text`, `primary-border` |
| 보조 강조 | `accent`, `accent-hover`, `accent-active`, `accent-foreground` |
| 보조 강조의 배경 영역 | `accent-subtle`, `accent-text`, `accent-border` |
| 선택 강조 | `highlight`, `highlight-subtle`, `highlight-foreground` |
| 상태 | `success`, `warning`, `danger`, `info`와 각각의 `-subtle`, `-foreground`, `-border` |
| 위험 액션 | `danger-hover`, `danger-active` |
| 링크 | `link`, `link-hover` |
| 키보드 포커스 | `focus-ring` |
| 텍스트 선택 | `selection`, `selection-foreground` |
| 비활성 | `disabled`, `disabled-foreground` |
| 모달 딤 | `overlay` |
| 차트 시리즈 | `chart-1`–`chart-6` |
| 차트 구성 | `chart-grid`, `chart-axis`, `chart-baseline` |
| 개선·악화·동일 | `chart-positive`, `chart-negative`, `chart-neutral` |

## 사용

```tsx
<section className="border-thin border-border bg-surface text-foreground">
  <p className="text-foreground-muted">실험 설명</p>
  <button
    className="bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active focus-visible:focus-outline disabled:bg-disabled disabled:text-disabled-foreground"
  >
    실험 등록
  </button>
  <span className="border-thin border-success-border bg-success-subtle text-success">완료</span>
</section>
```

색상 HEX, Tailwind 기본 색상, `bg-[#…]`를 컴포넌트마다 추가하지 않는다. 필요한 역할이 생기면 먼저 토큰을 추가한다. 기본 색상 namespace를 재설정했으므로 정의하지 않은 `violet-500` 같은 기본 팔레트는 제공하지 않는다.

Tailwind 바깥에서는 CSS 변수로 사용한다. 예: SVG의 `stroke="var(--chart-1)"`, CSS의 `background: var(--primary)`. Canvas처럼 실제 색상 문자열이 필요한 라이브러리에는 브라우저에서 `getComputedStyle(document.documentElement).getPropertyValue("--chart-1").trim()`으로 해석된 값을 전달한다. Canvas에 `"var(--chart-1)"` 문자열을 그대로 전달하지 않는다.

## 조합 규칙

- 현재는 검정 배경의 다크 테마다. 카드는 짙은 웜 뉴트럴, 본문은 밝은 웜 뉴트럴, 네온은 주요 액션과 강조에 사용한다.
- 밝은 primary·accent·highlight 배경에는 짙은 `-foreground`를 사용한다. 흰 글자를 사용하지 않는다.
- 상태색으로 채운 배경에는 `-foreground`, 어두운 `-subtle` 배경에는 기본 상태색을 글자로 사용한다.
- `border`는 구획용이다. 입력 경계처럼 식별이 필요한 요소에는 `border-strong`을 사용한다.
- 포커스 링에는 offset을 둔다. 컴포넌트 구현 시 실제 주변 배경과 함께 확인한다.
- 차트는 색상과 함께 범례·텍스트·선 모양·마커로 시리즈를 구분한다. 색상만으로 상태나 순위를 전달하지 않는다.
- `chart-positive`는 원시 수치 증가가 아니라 지표의 개선 방향에 따라 사용한다. 비교 조건이 다르면 개선색을 적용하지 않는다.
