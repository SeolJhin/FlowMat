# 아키텍처 결정 기록 (ADR)

| ADR | 제목 | 상태 | 요약 |
|---|---|---|---|
| [ADR-001](ADR-001-organization-project-boundary.md) | Organization / Project 경계 | **Accepted** 2026-10-05 | 멤버십 분리·cross-project DENY·업무 데이터 override 없음. 조직 관리자 metadata만 허용, 탈퇴 시 프로젝트 멤버 비활성화·소유권 이전 보호 |
| [ADR-002](ADR-002-module-dependency.md) | 모듈 의존 규칙 | **Accepted** 2026-10-02 | 다른 도메인의 repository는 쓰지 않고 `application.publicapi`로만 접근한다. 기존 위반은 동결하고 손댈 때 고친다 |
| [ADR-003](ADR-003-resource-port-contract.md) | Resource·Port 계약과 실행 Core | **Accepted(원칙)** 2026-10-02 + Registry **Experimental** | ProcessIo는 Port Contract, `itemId`는 선택적 binding, `schemaJson`은 정의 시점 계약, 실행값은 FlowRunStep snapshot, Resource 슈퍼테이블 없음. 정확한 `resourceType` 값 목록은 Experimental registry. 후속 ADR-005에서 backend VALIDATED / 제품 PARTIALLY VALIDATED와 계측 필드 선택 정책을 분리 |
| [ADR-004](ADR-004-flow-run-execution-policy.md) | Flow Run 실행 정책(FM-RUN-005) | **Accepted** 2026-10-05 | 노드 정책·연결 실패 정책, TIMEOUT 실패, 외부 executor 지연 start, workflowRevision + node 동시성 |
| [ADR-005](ADR-005-port-measurement-and-validation.md) | Port 계측·검증 수준 후속 결정 | **Accepted** 2026-10-05 | 비제조 quantity/unit 선택, 실행 요건 분리, backend VALIDATED / 제품 PARTIALLY VALIDATED |
| [editor ADR-0001](../../editor/adr-0001-flowmat-editor-core-boundary.md) | 에디터 Core 경계 | Accepted 2026-08-12 | 순수 TypeScript editor core를 React Flow와 분리한다 |

## 규칙

- 결정의 요약, 보류 항목, 다음 작업 순서는 [결정 인계](../decision-handoff.md)에 있다. 상세 근거는 [원문](../../reference/architecture/FlowMat_Architecture_refactoring_Handoff.md)에 있다.
- 상태는 Proposed, Accepted, Superseded 중 하나다. 원칙은 Accepted이고 세부 목록만 실증 대상이면 그 부분을 별도 절로 떼어 Experimental로 표시한다(예: ADR-003 Resource Type Registry).
- Proposed ADR에는 수용 기준(체크리스트)을 둔다. 모두 닫히면 Accepted로 올리고 상태 이력에 날짜를 남긴다. Proposed ADR의 결정에 기대는 구현(예: 조직 마이그레이션)은 Accepted 전에 시작하지 않는다.
- 상태와 구현은 별개다. 코드가 이미 있다고 결정이 승인된 것은 아니고, 승인됐다고 구현된 것도 아니다.
- Accepted ADR의 결정을 바꿀 때는 기존 ADR을 고치지 않고 새 ADR을 쓴다. 기존 ADR의 상태는 `Superseded by ADR-xxx`로 바꾼다. 오타와 링크 수정은 예외다.
- 번호는 세 자리로 이어서 매긴다. 파일 이름에 주제를 넣는다.
- 각 ADR의 "결정하지 않은 것"은 별도 ADR이나 사용자 결정 없이 정하지 않는다.
