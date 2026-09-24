# C6. V16·V17 DB 전환과 복구 실행서 초안

**한 줄 결론:** 기존 DB의 Flyway 체크섬 문제를 먼저 풀고, 데이터 위반을 조회한 뒤 V16·V17을 적용해야 한다. 데이터 변환을 포함하므로 복구 기준은 백업/PITR이다.

## 한 것 / 못 한 것

- V16·V17 SQL을 읽고 실행 순서, 사전 조회, 검증·되돌리기 절차를 작성했다. 기존·운영 DB에 어떤 SQL도 실행하지 않았다.

## 실행 전 점검 SQL — 읽기 전용

```sql
-- 음수 재고 / 예약 초과 / 가용 수량 불일치
SELECT inventory_id, quantity, reserved_quantity, available_quantity
FROM inventory
WHERE quantity < 0
   OR COALESCE(reserved_quantity, 0) < 0
   OR COALESCE(reserved_quantity, 0) > quantity
   OR (available_quantity IS NOT NULL
       AND available_quantity <> quantity - COALESCE(reserved_quantity, 0));

SELECT project_id, lot_no, count(*)
FROM lot_master GROUP BY project_id, lot_no HAVING count(*) > 1;

SELECT project_id, target_item_id, bom_version, count(*)
FROM bom_header WHERE deleted_yn = 'N'
GROUP BY project_id, target_item_id, bom_version HAVING count(*) > 1;

SELECT project_id, item_id, COALESCE(location, ''), lot_id, count(*)
FROM inventory WHERE lot_id IS NOT NULL AND deleted_yn = 'N'
GROUP BY project_id, item_id, COALESCE(location, ''), lot_id HAVING count(*) > 1;

SELECT project_id, request_id, count(*)
FROM inventory_transaction WHERE request_id IS NOT NULL
GROUP BY project_id, request_id HAVING count(*) > 1;

SELECT reference_id, count(*)
FROM inventory_transaction WHERE transaction_type = 'reversal'
GROUP BY reference_id HAVING count(*) > 1;
```

## 사람 승인 후 적용 순서

1. 쓰기 중지, DB 백업과 복구 시험, 스키마 이력·행 수·예외 목록 저장. G의 V2/V4/V5 해결 방식을 확정하고 대상 DB의 Flyway validate 상태를 복구한다.
2. 위 조회가 0행인지 확인한다. 위반 데이터는 소유자가 원인과 수정 방식을 승인한 후 별도 이력으로 처리한다. V17의 unique index 생성은 중복이 있으면 실패한다.
3. 검증된 앱 배포본으로 V16, V17 순서 적용. V16은 `inventory.version`을 추가한다. V17은 3개 CHECK, 5개 unique index, `request_id`·`bom_base_quantity`·`conversion_rate` 컬럼, 거래 유형과 생산 투입원 값의 데이터 변환을 수행한다.
4. Flyway history의 V16·V17 `success=true`, `ddl-auto=validate`, 스모크 API/재고 거래/LOT/BOM 테스트를 확인한다.
5. 기존 행까지 3개 CHECK를 검증할 시점에 아래를 **각각** 실행한다. 오류가 나면 원인 행을 먼저 정리하고 재시도한다.

```sql
ALTER TABLE inventory VALIDATE CONSTRAINT ck_inventory_quantity_non_negative;
ALTER TABLE inventory VALIDATE CONSTRAINT ck_inventory_reserved_within_quantity;
ALTER TABLE inventory VALIDATE CONSTRAINT ck_inventory_available_consistent;
```

## 중단·되돌리기 초안

적용 중 오류가 나면 쓰기를 계속 막고 백업/PITR 복원과 이전 앱 버전을 한 쌍으로 사용한다. V17은 기존 `inventory_transaction.transaction_type`과 `production_run_item.quantity_source` 값을 덮어써서 원래 값의 구별이 사라진다. **아래 DDL만 실행하는 것은 완전한 rollback이 아니다.** 백업으로 복원할 수 없는 임시 테스트 DB에서만, 새 컬럼에 새 업무 데이터가 없는지 확인한 후 DDL 철거에 참고한다.

```sql
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS ck_inventory_available_consistent;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS ck_inventory_reserved_within_quantity;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS ck_inventory_quantity_non_negative;
DROP INDEX IF EXISTS uq_inventory_item_location_lot;
DROP INDEX IF EXISTS uq_inventory_transaction_request;
DROP INDEX IF EXISTS uq_inventory_transaction_single_reversal;
DROP INDEX IF EXISTS uq_lot_master_project_lot_no;
DROP INDEX IF EXISTS uq_bom_header_revision;
-- 아래 컬럼 제거는 새 데이터·이전 앱 호환성 확인 뒤에만 허용
-- ALTER TABLE production_run_item DROP COLUMN conversion_rate;
-- ALTER TABLE production_run DROP COLUMN bom_base_quantity;
-- ALTER TABLE inventory_transaction DROP COLUMN request_id;
-- ALTER TABLE inventory DROP COLUMN version;
```

## 사람 결정이 필요한 것

- D4: 체크섬 방식, 대상 DB, 백업/PITR 복구점, CHECK 검증 시각과 데이터 정리 승인.

## 다른 담당에게 넘길 것

- **DB 운영 담당:** 운영 데이터의 사전 조회/복구 훈련을 수행하고, V17 데이터 변환의 역방향 매핑 가능성을 별도 평가한다.
