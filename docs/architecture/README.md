# FlowMat Enterprise Architecture

이 디렉터리는 FlowMat의 기업용 공정/자원 관리 아키텍처에 대한 현재 기준 문서입니다.

## 목적

FlowMat은 ERP, MES, SCM, WMS, BPM 제품을 각각 복제하는 프로젝트가 아닙니다.
기존의 `workflow`, `production`, `inventory`, `catalog`, `bom`, `rule` 도메인을 유지하면서
각 시스템에서 검증된 개념을 FlowMat의 범용 공정 모델에 필요한 만큼만 흡수합니다.

특히 다음 원칙을 지킵니다.

1. **기존 도메인 우선**: `erp/`, `mes/`, `scm/`, `wms/` 같은 거대한 신규 패키지를 만들지 않습니다.
2. **Definition과 Execution 분리**: 설계도와 실행 기록을 같은 모델로 취급하지 않습니다.
3. **Resource Flow 명시**: 품목/자원은 공정을 따라 이동하며, 이동은 이력으로 남습니다.
4. **Domain Core와 Extension 분리**: 제조 특화 기능은 범용 그래프/실행 코어를 오염시키지 않습니다.
5. **계약 우선**: 스키마/API/불변식을 문서와 계약으로 먼저 확정한 후 구현합니다.
6. **기존 계약 존중**: 재고·BOM·LOT의 세부 정책은 `docs/domain/inventory-bom-lot-contract.md`가 우선합니다.

## 문서

- [enterprise-domain-map.md](./enterprise-domain-map.md)
  - ERP / MES / SCM / WMS / Workflow 개념을 현재 FlowMat 도메인에 매핑합니다.
- [execution-model.md](./execution-model.md)
  - 공정 정의, 작업지시, 실행, 자원 흐름, 이력의 관계를 정의합니다.
- [domain-roadmap.md](./domain-roadmap.md)
  - 현재 코드 기준으로 무엇을 추가하고 무엇을 보류할지 단계별로 정리합니다.
- [../benchmarking/enterprise-system-references.md](../benchmarking/enterprise-system-references.md)
  - 외부 오픈소스에서 어떤 패턴을 참고할지 정리합니다.

## 기존 문서와의 우선순위

충돌할 경우 다음 순서를 사용합니다.

1. 실제 DB migration 및 실행 코드
2. 도메인별 확정 계약 문서
3. 최신 감사 문서
4. 이 디렉터리의 장기 아키텍처 문서
5. 과거 backlog / relay / legacy 문서

현재 확인된 주요 문서:

- `docs/domain/inventory-bom-lot-contract.md`
- `docs/flowmat-audit-2026-09-24.md`
- `docs/editor/current-state.md`
- `docs/editor/flowmat_architecture_improvement_plan.md`

## 현재 canonical 애플리케이션

- Backend: `flowmat_backend`
- Frontend: `flowmat_frontend`
- `legacy`는 참고용이며 신규 구현 대상이 아닙니다.

새 기능은 특별한 이유가 없는 한 canonical 애플리케이션에만 추가합니다.
