# ADR-005: Port 계측 필드와 범용 실행 검증 수준

작성일: 2026-10-05

## 상태

**Accepted.** 사용자 첨부의 최종 결정에 따른 후속 ADR. [결정 기록](../../status/DECISIONS-2026-10-05.md) §8. ADR-003의 기존 확정 원칙은 유지하고, 미결 항목만 보완한다. 구현 완료를 뜻하지 않는다.

## 결정

1. Core Port의 quantity/unit은 nullable. Data/File/API에 제조용 더미 수량·단위를 요구하지 않는다. 제조 재료 등은 필요한 도메인 검증으로 수량·단위를 요구할 수 있고, Energy는 계획량이 있을 때 계측값을 둔다.
2. labor/equipment/compute/skill/capacity는 Execution Requirement다. 현재 설비는 설비 도메인에서 처리하며, 추가 사례가 생기기 전 generic requirement 슈퍼테이블을 만들지 않는다.
3. Generic Execution Core는 기존 DataFlowRunIntegrationTest 근거로 backend integration 수준 VALIDATED. Generic Data Flow Product는 PARTIALLY VALIDATED. data-ports E2E만으로 실행 전체 검증 완료라고 하지 않는다.
4. 제품 vertical slice는 REAL_API_E2E에서 새 빈 프로젝트에 Workflow → File/Data Port → Publish → FlowRun → 각 Step → output 확인이 이어져야 VALIDATED다. 실제 변환은 기존 외부 보고 모델에 따르며 자동 실행기를 이 결정으로 도입하지 않는다.

## 구현·검증

현재 quantity/unit 필수 코드와 DB를 선택으로 전환할 일은 남아 있다. 신규 마이그레이션 번호를 직전에 확인하며 적용된 migration은 수정하지 않는다. 제조 필수값 거절·비제조 값 생략·기존 발행 revision 호환을 검증한다. 새 테스트의 개발 DB BOM 삽입은 금지한다.
