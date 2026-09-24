# C1–C3. 실행 검증

**한 줄 결론:** 전체 빌드와 새 DB 기동은 통과했다. LOT 재고 생성은 런타임에 `lotId`를 전송하지만 공용 타입에는 선언이 빠져 있다.

## 한 것 / 못 한 것

- C1: 최신 작업 트리에서 `gradlew.bat test build --no-daemon --rerun-tasks` 통과(47 suites, 319 tests, 실패 0). V18 마이그레이션이 다른 작업자에 의해 수정되는 중 한 차례 prod 프로필 테스트가 `demo-owner` UUID 변환 오류로 실패했으나, 현재 파일로 해당 단독 테스트와 전체 테스트를 다시 실행해 모두 통과했다. 첫 시도의 공유 `build/test-results/test/binary/output.bin` 삭제 충돌도 단독 재시도로 해소했다. 프론트 `typecheck`·`lint`·`build`와 Vitest 178건 통과.
- C2: 별도 임시 `postgres:16` 컨테이너(`flowmat-c2-audit-20260924`, 포트 57799)에 빈 DB를 만들고 Spring Boot jar를 dev + `ddl-auto=validate`로 18080 포트에서 기동했다. Flyway V1~V17 모두 성공(17행, migration 2.120초, 첫 앱 시작 16.252초). 데모 로그인 성공; `/api/projects`, `/api/items?projectId=prj_demo_main`, `/api/workflows?projectId=prj_demo_main` 각각 데이터 1건을 확인했다. 임시 백엔드와 DB 컨테이너는 종료했다. 로그는 작업 공간 밖 임시 폴더에 있다. 기존 개발/운영 DB에는 접속하거나 `repair`하지 않았다.
- C3: BOM 생성·라인, LOT 등록, 생산 시작, 작업지시 생성, 재고 거래, 재고 생성 프론트 요청 타입을 대응 Java request record와 대조했다. 전체 API 자동 대조 도구는 없으므로 이 범위 외의 무불일치는 보증하지 않는다.

## C3 요청 필드 대조

| 프론트 요청 | 서버 요청 | 결과 |
|---|---|---|
| `BomCreateInput` + `projectId` | `BomCreateRequest` | 필수 5개 일치, `note` 선택 |
| `BomLineInput` | `BomLineCreateRequest` | 필수 3개 일치 |
| LOT 생성 `{itemId, lotNo, expiryDate?}` + `projectId` | `LotCreateRequest` | 필수 3개 일치; `serialNo`, `receivedAt`는 서버만 선택 |
| `StartRunInput` | `ProductionRunStartRequest` | 필수 3개 일치; 선택 `bomId`, `workOrderId` 일치 |
| `WorkOrderInput` + `projectId` | `WorkOrderCreateRequest` | 필수 `workOrderTitle`, `projectId` 일치 |
| `StockMovementInput` + `requestId` | `InventoryTransactionCreateRequest` | 필수 `inventoryId`, `transactionType`, `requestId` 일치 |
| `InventoryInput` | `InventoryAdjustRequest` | 공용 TS 타입에 `lotId` 선언이 없으나 `StockPanel.tsx`는 payload 변수에 `lotId`를 넣어 실제 요청에는 전송한다. 기능 실패는 재현되지 않았고 타입 표현만 불완전하다. 서버의 `availableQuantity`는 선택이며 화면에서 미전송. |

## 사람 결정이 필요한 것

- 기존 DB 체크섬 처리와 운영 반영은 G 보고서에 따라 결정해야 한다.

## 다른 담당에게 넘길 것

- **재고 프론트 담당:** `InventoryInput`에 선택적 `lotId`를 선언해 실제 `StockPanel` 요청과 타입을 일치시킨다. 현재 소유 경로라 여기서는 수정하지 않았다.
- **CI 담당:** 실 API 브라우저 검증의 로그인 대기 경합은 F 보고서에 따로 기록했다.
