# Data Flow 실제 API 브라우저 전체 흐름 — 수용 시나리오

상태: **설계(2026-10-10, 세션 1 리드). 스펙은 아직 없다.** [결정](../status/DECISIONS-2026-10-05.md) §8 "Generic Data Flow Product는 PARTIALLY VALIDATED. 실제 API 브라우저에서 생성 → 포트 → Publish → 실행 → 각 Step 처리 → output 확인 전체가 통과한 뒤 vertical slice를 VALIDATED로 올린다"와 §9 구현 순서 10의 수용 기준을 단계로 풀었다. 스펙 작성·실행은 오류·테스트 담당 Agent가, 시나리오·판정 기준은 리드가 맡는다. 백엔드 수준 증거는 [`DataFlowRunIntegrationTest`](../../flowmat_backend/src/test/java/org/myweb/flowmat/DataFlowRunIntegrationTest.java)(File → Transform → Data, 제조 행 0)에 이미 있다.

## 원칙

- **화면으로 한다.** 프로젝트·워크플로·노드·포트·연결·Publish·실행·Step 처리·종료를 모두 브라우저 UI로 한다. API 직접 호출은 로그인 토큰 확보와 **끝난 뒤 정리**에만 쓴다. 화면이 없는 단계가 나오면 API로 우회하지 말고 "제품 공백"으로 기록한다(그 단계는 VALIDATED 근거가 될 수 없다).
- **새 프로젝트 하나.** 이름 `DF-E2E-<timestamp>`. 다른 스펙·데모 데이터와 섞이지 않게 하고, 실패해도 이름으로 찾아 지울 수 있게 한다.
- **제조 데이터를 만들지 않는다.** 품목·재고·LOT·BOM·작업지시·생산 실행 없이 끝까지 간다(포트는 품목 없음, ADR-003/005). BOM 삽입 금지 규칙과도 맞는다.
- **로그인 한 번.** demo-owner 로그인 제한(10분 8회)을 넘지 않게 storageState를 재사용한다. `REAL_API_E2E`일 때 workers=1(기존 설정).

## 단계

| # | 화면 동작 | 확인 |
|---|---|---|
| DF1 | demo-owner로 로그인 | 홈의 인사말 |
| DF2 | 홈에서 새 프로젝트 `DF-E2E-<ts>` 생성 | 프로젝트 목록에 보이고 들어갈 수 있음 |
| DF3 | 새 워크플로 `CSV import` 생성, 캔버스에 노드 3개: **Read CSV**(File), **Validate rows**(Transform), **Store rows**(Data) | 노드 3개가 캔버스·검증 패널에 보임 |
| DF4 | 포트(품목 없음): Read CSV 출력 `rows`, Validate rows 입력 `rows`·출력 `valid rows`(속성 계약: `rows` 수 > 0, `valid` = true), Store rows 입력 `valid rows` | 포트 목록, 품목 칸 "No item"([data-ports.spec](../../flowmat_frontend/e2e/data-ports.spec.ts)와 같은 화면) |
| DF5 | 캔버스에서 출력 핸들 → 입력 핸들로 끌어 연결 2개 | 연결 2개, 검증 패널 오류 0 |
| DF6 | Runs → **Publish current workflow** | revision v1이 목록에 보임 |
| DF7 | Flow Runs → v1으로 **Start Flow Run**(그래프 실행) | 루트 Step `#1 Read CSV`만 계획됨 |
| DF8 | #1 Start → 출력 `{"attrs":{"path":"in.csv","rows":3}}` → Complete | #2 Validate rows가 #1을 출처로 계획됨 |
| DF9 | #2 Start → **잘못된 출력** `{"attrs":{"rows":"3","valid":true}}` → Complete | 계약 오류 메시지, Step은 running 그대로, 시도 기록 늘지 않음 |
| DF10 | #2 올바른 출력 `{"attrs":{"rows":3,"valid":true}}` → Complete | #3 Store rows가 #2를 출처로 계획됨 |
| DF11 | #3 Start → `{"attrs":{"stored":3}}` → Complete → **Finish Flow Run** | Run finished, Step 3개 모두 completed |
| DF12 | output 확인: Step별 시도(각 1건)와 출력 값, 이벤트 목록 | #3 출력 `stored: 3`, 이벤트에 start·complete·finish |
| DF13 | 제조 행 없음: 새 프로젝트의 Inventory(품목·재고·LOT)·BOMs·Work orders·생산 Runs가 비어 있음 | 각 목록 0건 |
| DF14 | 정리(API): 만든 프로젝트 삭제. 실패해도 `finally`에서 시도 | 다음 실행에 남지 않음 |

## 판정

- DF1–DF13이 CI browser-e2e(실 API)에서 통과하면 §8의 수용 기준을 충족한다. 그때 리드가 [CURRENT_CAPABILITIES](../status/CURRENT_CAPABILITIES.md)의 범용 Data Flow 행에 근거(스펙·CI 실행)를 붙여 상태를 바꾼다. 통과 전에는 PARTIALLY VALIDATED 그대로 둔다.
- 화면이 없어 API로 우회한 단계가 하나라도 있으면 VALIDATED로 올리지 않는다. 그 공백은 리드에게 기능 작업으로 보고한다.
- 캔버스 끌기(DF5)가 headless에서 불안정하면 재시도·대기 보강은 해도 되지만, 연결을 API로 만드는 것은 우회다.

## 담당

- 스펙 `e2e/data-flow-browser.spec.ts`(REAL_API_E2E 전용) 작성·CI 연결·불안정성 조사: 오류·테스트 담당 Agent.
- 단계·판정 기준 변경, 화면 공백의 기능 작업: 리드.
- flow-run·workspace 코드는 해당 구역 소유자가 있다. 스펙이 드러낸 결함은 재현 테스트와 함께 리드에게 보고하고, 리드가 구역 소유자와 정리한다.
