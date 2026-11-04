# 공통 UI 컴포넌트

`src/components/ui`에서 필요한 파일을 직접 import한다. 컬러·타이포·크기는 기존 [디자인 토큰](design-tokens.md)을 사용한다.

## Button

```tsx
import { Button } from "@/components/ui/button";

<Button type="submit" loading={saving} loadingLabel="저장 중…">저장</Button>
<Button variant="secondary" controlSize="sm">취소</Button>
```

- `variant`: primary / secondary / ghost / danger. 기본값은 primary.
- `controlSize`: sm / md / lg. 최소 높이는 32 / 40 / 44px, 기본값은 md.
- 기본 `type`은 button이다. 폼 제출은 명시적으로 submit을 지정한다.
- `loading`은 버튼을 비활성화하고 `aria-busy`와 처리 중 텍스트를 적용한다. 비동기 작업 상태는 사용하는 화면에서 관리한다.
- 추가 포커스 외곽선 없이 배경색 변화로 키보드 포커스를 표시한다.
- `ref`, native button props와 이벤트를 전달한다. 이벤트를 넘기는 화면은 Client Component여야 한다.
- 아이콘만 넣는 버튼에는 `aria-label`을 지정한다. 이동은 버튼 대신 링크를 사용한다.

## Input · Select

```tsx
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

<Input label="실험 이름" name="name" required description="팀에서 구분할 이름" error={errors.name} />
<Select label="상태" name="status" defaultValue="draft" options={[
  { value: "draft", label: "설계 중" },
  { value: "complete", label: "완료" },
]} />
```

- `label`은 필수다. `id` 생략 시 고유 ID를 생성해 label과 연결한다.
- `description`, `error`를 해당 컨트롤의 `aria-describedby`와 연결하며 외부 설명 ID도 보존한다. error가 있으면 `aria-invalid`를 적용한다.
- Input은 native `required`·`disabled`·`name`·`value`·`defaultValue`·`onChange`·`ref`를 지원한다.
- Input은 텍스트·검색·이메일·비밀번호·숫자·URL·전화·날짜·시간 입력용이다. checkbox/radio/file은 별도 컴포넌트로 구현한다.
- Select는 Radix Select 기반 단일 선택 드롭다운이다. `options`는 `{ value, label, disabled? }[]`이며 value는 비어 있지 않은 고유 문자열이어야 한다. 선택 전 문구는 빈 option 대신 `placeholder`로 지정한다.
- Select의 controlled 입력은 `value`/`onValueChange`를 사용한다. 기존 native `onChange`와 `<option>` children은 사용하지 않는다. `ref`는 실제 trigger인 HTMLButtonElement를 가리킨다.
- `name`·`form`·`required`·`disabled`를 지원하고, 폼 값 전달에는 Radix가 제공하는 숨겨진 native select를 사용한다. `autoComplete`도 Root에 전달한다.
- 패널은 trigger 폭에 맞춰 portal로 열리며 사용 가능한 화면 높이와 320px 중 작은 값으로 제한한다. 선택 항목은 회색 배경과 체크 표시로, 이동 중인 항목은 배경 변화로 구분한다.
- 방향키·Enter/Space·Escape·문자 검색을 지원한다. Escape/선택 후에는 trigger로 포커스가 돌아온다. 검색 입력을 제공하는 콤보박스는 아니다.
- `className`은 실제 컨트롤, `fieldClassName`은 label·안내·오류를 포함한 전체 필드에 적용한다.
- `controlSize`는 Button과 같다. Input의 native `size` 속성과 구분한다.
- Input·Select 포커스는 추가 외곽선 없이 `control-focus` 배경으로 표시한다.
- 검증 시점과 오류 내용은 화면에서 결정한다. 필드 자체는 값을 검사하거나 요청을 전송하지 않는다.

## Badge · Card

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card aria-labelledby="experiment-summary">
  <CardHeader>
    <CardTitle id="experiment-summary">실험 요약</CardTitle>
    <CardDescription>동일 조건의 확정 결과</CardDescription>
  </CardHeader>
  <CardContent><Badge tone="success">완료</Badge></CardContent>
</Card>
```

Badge의 `tone`은 neutral / primary / success / warning / danger / info이며 기본값은 neutral이다. 상태는 색상과 함께 텍스트로 표시한다. 클릭 동작이나 자동 live announcement를 추가하지 않는다.

Card는 section, CardTitle은 기본 h2다. 화면의 제목 계층에 맞춰 `as="h3"` 또는 `as="h4"`를 지정할 수 있다. Card 자체에 내부 여백과 영역 간 간격이 적용된다. 정적 Badge·Card는 Client Component 지시문 없이 사용한다.

`className`은 배치·폭 등 추가 스타일에 사용한다. 충돌하는 Tailwind 클래스를 자동 병합하지 않으므로 색상·컨트롤 높이는 제공된 variant/size API를 우선 사용한다.

## 테마와 검사

메인 페이지의 미리보기 섹션은 `ThemeScope theme="light"`로 흰색 배경과 읽기 쉬운 글자색을 적용한다. 기본 페이지 배경은 검정으로 유지한다. Select의 portal 패널에도 같은 테마를 전달한다.

선택된 옵션은 `select-selected` 회색 배경과 체크 표시로 구분한다. 옵션 사이 4px, 패널 안쪽 8px, trigger와 패널 사이 8px 간격을 토큰으로 관리한다.

`pnpm check`로 포맷·린트·타입을 검사하고 `pnpm build`로 정적 export를 검증한다. 단순 테스트 추가 기준은 README의 작업 규칙을 따른다.
