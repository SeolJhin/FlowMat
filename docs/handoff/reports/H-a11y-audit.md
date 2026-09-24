# H. 화면 접근성 점검

**한 줄 결론:** 캔버스의 포트 선택과 노드 선택 팝업에서 키보드·보조 기술 경로를 보강해야 한다. 규칙 폼의 확인된 필드는 라벨이 연결되어 있다.

## 한 것 / 못 한 것

- 소유 영역 밖인 workspace/canvas, Rules, 프로젝트 설정·초대 화면의 JSX를 정적 점검했다. 화면 수정은 하지 않았다. 실제 키보드/스크린리더/대비 측정은 하지 않았으므로 대비 불량 여부는 확정하지 않았다.

| 우선 | 파일·줄 | 관찰 | 제안 |
|---|---|---|---|
| 높음 | `flowmat_frontend/src/pages/workspace/ui/CanvasNode.tsx:108`, `:144` | React Flow `Handle`의 `onClick`로 포트를 선택한다. 별도 키보드 활성화·접근 가능한 이름이 이 컴포넌트에 없다. | 포트 선택용 포커스 가능한 버튼/키보드 동작과 이름 제공, 연결 드래그 외 선택 경로 시험. |
| 중간 | `flowmat_frontend/src/pages/workspace/ui/NodePickerPopup.tsx:33` | 배경 `div`가 클릭으로 닫힌다. Escape 핸들러는 있지만 팝업 역할·포커스 이동·복귀가 없다. | dialog/listbox 의미와 초기 포커스·닫은 뒤 포커스 복귀 제공. |
| 중간 | `flowmat_frontend/src/pages/workspace/ui/WorkflowCanvasPage.tsx:1429` | 캔버스 상단 select는 레이블 관계를 브라우저에서 확인해야 한다. | 접근성 트리에서 이름을 확인하고 필요 시 명시적 label 연결. |

`RulesRoute.tsx`의 확인한 form 입력·select는 대체로 감싸는 `<label>`을 사용한다. 아이콘 버튼 일부도 `aria-label`이 있다. 색 대비는 토큰·상태별 실제 렌더링 계측이 필요하다.

## 사람 결정이 필요한 것

- D6 사용성 검증 범위에 키보드만 사용한 생성·편집·삭제, 스크린리더 이름, 대비 측정을 포함할지 정한다.

## 다른 담당에게 넘길 것

- **프론트 접근성 담당:** 위 3곳의 실제 접근성 트리와 키보드 경로를 재현하고 우선순위대로 수정한다.
