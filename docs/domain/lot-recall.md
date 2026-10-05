# LOT 리콜 (영향 범위와 일괄 격리)

상태: **구현(2026-09-25).** 새 테이블·마이그레이션 없음. 기존 LOT 계보(`lot_trace`)와 LOT 격리(계약서 §6)를 씁니다.

## 목적

원료 LOT에 문제가 알려졌을 때(공급사 리콜, 불합격 등) 그 LOT로 만든 모든 LOT를 찾아 **지금 어디에 얼마 있는지, 이미 얼마 나갔는지**를 보고, 한 번에 격리합니다.

## API

| 요청 | 권한 | 내용 |
|---|---|---|
| `GET /lots/{lotId}/recall` | 읽기 | 그 LOT(깊이 0)와 정방향 계보의 모든 LOT |
| `POST /lots/{lotId}/recall/quarantine` | 쓰기 | `{ "reason": "…" }`(필수, 300자까지). 모두 한 트랜잭션 |

줄마다: LOT 번호, 품목, 깊이, 바로 앞 LOT(`viaLotNo`), LOT 상태, 보유량(모든 재고 행 합), 재고가 있는 곳(`"WH-A 4"`), **출고량**(`issue` 합, 역분개된 것은 뺌).

## 규칙

| # | 규칙 | 이유 |
|---|---|---|
| R1 | 계보는 기존 정방향 추적(`GET /lots/{id}/trace?direction=forward`, 최대 깊이 그대로)을 씀 | 추적 규칙을 한 곳에만 둠 |
| R2 | "나간 양"은 출고(`issue`)만 셈. 생산 투입은 다음 LOT로 이어지므로 계보에 이미 나타남 | 현장 밖으로 나간 양을 따로 보려고 |
| R3 | 격리는 LOT마다 평소 LOT 격리 이동 하나(그 LOT의 모든 재고 행이 함께 격리). 참조는 `lot_recall` / 시작 LOT ID, 메모는 `Recall of LOT <번호>: <사유>` | 재고 이력에서 리콜로 격리된 것을 찾을 수 있게 |
| R4 | 이미 격리된 LOT, 종료된 LOT, 재고 행이 없는 LOT는 건너뛰고 이유와 함께 알려 줌 | 다시 눌러도 안전하게 |
| R5 | 해제는 따로 함(Stock 탭의 격리 해제) | 해제는 품목별로 판단할 일 |

## 화면

재고 → LOTs 탭 → LOT 선택 → **Recall report**(누를 때만 불러옴)
- 요약: LOT 수, 재고가 남은 LOT 수, 이미 내보낸 LOT 수(빨강), 격리된 LOT 수
- 표: 깊이만큼 들여 쓴 LOT·품목, 상태, 보유량(툴팁에 위치별), `out N`(출고량)
- **Quarantine all (N)**: 사유를 적어야 켜지고, 확인 창 뒤 격리합니다. 결과("Quarantined 3; left …")를 보여 주고 목록을 새로 고칩니다.
- **Download CSV**: `recall-<LOT>.csv`, 열 `depth,lot,item_code,item_name,status,on_hand,unit,where,issued,made_from`

## 검증

- `LotRecallIntegrationTest` 1건: 원료 LOT 20 → 1차 실행(5 투입, 중간재 4 산출) → 2차 실행(중간재 2 투입, 제품 3 산출) → 제품 1 출고
  - 리콜: 3개 LOT, 원료 깊이 0·보유 15·위치 표시, 중간재 깊이 1·앞 LOT 원료·보유 2, 제품 깊이 2·보유 2·출고 1
  - 빈 사유 400. 격리: 3개 모두, 제품 재고 행 격리 상태, 원료 이력에 `quarantine`/`lot_recall`/원료 LOT ID
  - 다시 격리: 0개, `already quarantined`로 건너뜀. 외부인 403
- `recallModel.test.ts` 2건: 요약 수, CSV
- 실 화면(2026-09-25): 같은 계보를 API로 만든 뒤 LOTs 탭에서 원료 LOT → Recall report → `3 LOTs · 3 still holding stock · 1 already sent some out · 0 quarantined`, 제품 줄 `out 1` → Quarantine all → `Quarantined 3.`, 요약 `3 quarantined`. 콘솔 오류 0
