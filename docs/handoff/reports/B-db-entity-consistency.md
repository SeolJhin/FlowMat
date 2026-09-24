# B. DB·엔티티 정합성

**한 줄 결론:** 새 V17 DB는 Hibernate `ddl-auto=validate`로 기동했으며 필수 컬럼 누락은 발견되지 않았다. 기존 데이터의 제약 검증과 일부 조회 성능은 별도 점검이 필요하다.

## 한 것 / 못 한 것

- V1~V17을 새 임시 DB에 적용하고 ORM 스키마 검증 기동을 확인했다. 인계 기준으로 `NOT NULL`·기본값 없는 누락 엔티티 필드 0건이며, 엔티티 없는 테이블 17개는 예약 구조다.
- V16·V17 SQL, 관련 repository 메서드, `BaseTimeEntity`·`SoftDeleteEntity`·`CreatedUpdatedAuditEntity`의 상속 필드를 점검했다. V17 임시 DB의 `information_schema`와 `pg_constraint`·`pg_indexes`를 읽기 전용으로 조회했다. 모든 테이블의 컬럼별 length/precision/scale 자동 비교는 실행하지 않았다. 아래 표는 검증한 범위이며 포괄적 무불일치를 뜻하지 않는다.

## 비교표와 위험

| 범위 | 엔티티/조회 측 | DB 측 | 평가·담당 |
|---|---|---|---|
| 재고 버전 | `Inventory.version`과 오래된 값 충돌 검사 | V16 `version bigint NOT NULL DEFAULT 0` | 일치. 재고 담당 |
| 재고 수량 정밀도 | `Inventory.quantity/reservedQuantity/availableQuantity`는 `BigDecimal`이며 명시적 precision/scale 없음 | 모두 `numeric(14,4)` | **중간:** ORM validate는 통과하지만 엔티티가 DB 자릿수 한계를 표현하지 않는다. 경계값·반올림 규칙 확인. 재고 담당 |
| 재고 수량 | quantity, reserved, available | V17 CHECK 3개 `NOT VALID` | **높음:** 새 쓰기에는 적용되나 기존 행은 검증 전. DB 담당 |
| LOT 번호 길이 | `LotMaster.lotNo`에 `@Column(length)` 없음; 등록 API는 최대 100자 검증 | `varchar(100) NOT NULL` | API 경로는 제한되지만 엔티티가 100자를 표현하지 않는다. 중간, LOT 담당 |
| 생산 BOM 계수 | `ProductionRunItem.conversionRate`는 `BigDecimal` 기본 매핑 | `numeric(24,12)` | 정밀도 선언 부재. 계산·저장 경계 확인. 중간, 생산 담당 |
| 상속 공통 필드 | `SoftDeleteEntity.deletedYn`은 `@JdbcTypeCode(CHAR)`·`length=1`; 감사 시간·작성자 상속 | 조회한 주요 테이블의 `deleted_yn`은 `character(1)` | 조회 범위 내 매핑 일치. 기존 일부 테이블의 nullable 차이는 별도 전수 대조 필요 |
| LOT 재고 고유성 | project/item/location/lot 기준 | V17 partial unique index `lot_id IS NOT NULL AND deleted_yn='N'` | LOT 재고는 보장. `lot_id IS NULL`인 일반 재고의 중복은 이 인덱스가 막지 않는다. 중간, 재고 담당 |
| 거래 멱등성·역분개 | `projectId`+`requestId`, 원거래 `referenceId` | V17 unique 인덱스 2개 | 일치. 기존 중복 행은 마이그레이션 사전 점검 필요. 재고 담당 |
| LOT 번호 | project/lotNo | V17 `uq_lot_master_project_lot_no` | 같은 프로젝트의 품목이 달라도 번호 중복 불가. 계약 의도와 비교 필요. LOT 담당 |
| BOM revision | project/targetItem/bomVersion, active row | V17 partial unique `deleted_yn='N'` | 일치. 삭제 행 중복 허용 의도 확인. BOM 담당 |
| LOT trace 조회 | parent/child lot 탐색 | V1 양방향 단일 컬럼 인덱스 | 기본 탐색 인덱스 있음. 규모별 실행계획 확인 필요. DB 담당 |
| 재고 거래 목록 | `projectId` + `createdAt DESC` | V1 단일 `project_id` 인덱스 | 대량 데이터에서는 정렬 비용 가능. 복합 인덱스는 EXPLAIN 후 결정. DB 담당 |

임시 DB에서 V17 CHECK 3개 모두 `convalidated=false`였고, 현재 수량 위반 0행이었다. LOT 번호·BOM revision·requestId 중복과 비 LOT 재고 중복도 각각 0그룹이었다. 이는 **임시 DB 결과**로 기존 dev/운영 데이터의 상태를 뜻하지 않는다. `String` ↔ `character(1)` Y/N 필드와 숫자 precision/scale은 `ddl-auto=validate`만으로 값의 길이·반올림 정책까지 증명되지 않는다. 운영 카탈로그 조회와 경계값 삽입 시험이 남았다. SQL이나 엔티티는 수정하지 않았다.

## 사람 결정이 필요한 것

- 기존 DB에 V17 제약을 검증하는 시점, 일반 재고 중복 허용 정책, LOT 번호 범위와 반올림 정책.

## 다른 담당에게 넘길 것

- **DB/재고 담당:** 기존 데이터 3개 CHECK 검사 및 `VALIDATE CONSTRAINT`, 비 LOT 재고 중복 정책 확인.
- **DB 성능 담당:** 실데이터 `inventory_transaction(project_id, created_at)` 조회 계획 측정.
