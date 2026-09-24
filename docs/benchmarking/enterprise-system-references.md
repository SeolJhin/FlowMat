# Enterprise System References

이 문서는 외부 프로젝트를 복사하기 위한 목록이 아니라,
FlowMat에 적용할 설계 패턴을 찾기 위한 벤치마킹 가이드입니다.

확인 기준일: 2026-09-24.

## 핵심 레퍼런스

| Repository | FlowMat에서 볼 영역 | 가져올 패턴 | 그대로 복사하지 않을 것 |
| --- | --- | --- | --- |
| `flowable/flowable-engine` | BPM / Workflow | Definition vs Instance, task/state, history | BPMN 전체 규격 |
| `conductor-oss/conductor` | Orchestration | task graph, retry, fork/join, execution state | 분산 오케스트레이터 전체 인프라 |
| `bpmn-io/bpmn-js` | Editor | graph modeling UX, element/connection separation | FlowMat editor core 교체 |
| `openwms/org.openwms` | WMS | material flow, warehouse execution boundary | WMS 전체 도메인 |
| `frePPLe/frepple` | SCM Planning | demand/supply/constraint 사고방식 | 고급 APS 최적화 전체 |
| `metasfresh/metasfresh` | ERP | master data와 업무 모듈 경계 | 회계/전표 등 전사 ERP 전체 |

현재 확인 결과 위 저장소들은 public이며 archived 상태가 아닙니다.

---

## 1. Flowable

### 볼 것

- process definition과 runtime instance의 분리
- history가 runtime object와 별도로 존재하는 방식
- task/state transition
- versioned definition

### FlowMat 적용

```
Workflow + WorkflowRevision
        ↓
ProductionRun
        ↓
RunStateSnapshot
```

특히 이미 시작된 실행이 최신 Workflow 수정에 의해 의미가 바뀌지 않도록 하는 구조를 참고합니다.

---

## 2. Conductor

### 볼 것

- task definition
- workflow definition
- workflow execution
- input/output
- retry
- failure state
- fork/join
- sub workflow

### FlowMat 적용

FlowMat의 Process와 ProcessConnection은 장기적으로 단순 그림이 아니라
실행 그래프가 될 수 있습니다.

다만 처음부터 Conductor 수준의 분산 실행 엔진을 만들지 않습니다.

우선 필요한 것은:

- 실행 가능한 node 정의
- 실행 상태
- input/output
- 실패 기록
- 재시도 정책의 확장 지점

---

## 3. bpmn-js

### 볼 것

- 모델과 렌더링의 분리
- element registry
- command/undo 구조
- connection
- selection
- modeling interaction

### FlowMat 적용

현재 `flowmat_frontend/src/lib/flowmat-editor`를 유지하면서
editor core가 domain model과 직접 결합하지 않도록 경계를 검토합니다.

bpmn-js를 새 의존성으로 추가한다는 의미가 아닙니다.

---

## 4. OpenWMS

### 볼 것

- inventory와 warehouse execution의 경계
- material flow
- transport order
- location
- 외부 ERP와 실행 시스템 간 책임 분리

### FlowMat 적용

현재 Inventory/InventoryTransaction에
warehouse/location 개념을 추가할 때 참고합니다.

---

## 5. frePPLe

### 볼 것

- demand
- supply
- inventory
- operation
- resource
- capacity
- constraint

### FlowMat 적용

사용자가 그린 Process 그래프에
향후 생산능력, 부족량, 리드타임을 계산할 때 개념을 참고합니다.

최적화 알고리즘보다 **입력 데이터 모델이 무엇인지**를 우선 연구합니다.

---

## 6. metasfresh

### 볼 것

- 품목/조직/재고/주문 등 master data 분리
- Java 기반 대규모 업무 시스템 모듈화
- persistence와 application service의 경계

### FlowMat 적용

FlowMat의 catalog/inventory/production 모듈이 커질 때
패키지와 서비스 경계의 참고점으로 사용합니다.

---

## 벤치마킹 규칙

외부 레포를 조사할 때 반드시 다음 순서로 기록합니다.

1. FlowMat의 현재 문제
2. 외부 레포의 대응 개념
3. 외부 레포가 해결한 방식
4. FlowMat과 다른 전제
5. 적용 가능한 최소 패턴
6. 현재 파일/도메인에 들어갈 위치
7. migration 필요 여부
8. API 변경 여부
9. 테스트 전략

'좋아 보여서 가져온다'는 이유로 라이브러리나 모델을 추가하지 않습니다.

---

## 현재 최우선 비교 대상

```
FlowMat WorkflowRevision  ↔ Flowable process definition version
FlowMat Process           ↔ workflow task/node
FlowMat ProcessIo         ↔ task input/output
FlowMat ProductionRun     ↔ runtime workflow instance
FlowMat RunStateSnapshot  ↔ runtime/history state
FlowMat InventoryTxn      ↔ material movement ledger
FlowMat LotTrace          ↔ genealogy/traceability
```

이 비교가 끝난 뒤에만 실제 runtime 모델 변경을 제안합니다.
