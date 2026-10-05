# 2026-10-05 사용자 결정 확정 기록

상태: **Accepted — 사용자 첨부의 마지막 결정 부분 기준. 구현 완료를 뜻하지 않는다.**

근거: 사용자가 제공한 의사결정 문서의 마지막 부분(코드 기준 `aa5c2948ef06d220b7caf7d6a0ed956636ee208f`). 앞부분의 ADR-001 Proposed·D2 9/15 유지 안내는 이후 최종 결정으로 대체됐다. 운영 인증값은 기록하지 않는다.

## 1. 실행 원가 D+

- 진행 중은 현재 단가, 완료 실행은 `actualEndAt` 시각의 단가로 조회 때 계산한다.
- 완료 실행 보정은 원래 마감 단가 × 보정된 사용량이다. 생산량 보정도 단위 원가에 반영한다.
- `actual_end_at`은 마감 때 한 번 기록하고 보정으로 바꾸지 않는다. `total_material_cost`·`cost_per_unit`을 authoritative 값으로 저장하지 않는다.
- 원본은 사용량 이력 + 단가 이력 + 마감 시각이다. 저장 금액은 향후 캐시로만 사용할 수 있다.
- 과거 단가를 정확히 알 수 없으면 가능한 과거 단가를 추정하고, 불가능하면 현재 단가를 사용한다. 추정은 `estimated=true`로 표시한다. 마감 시각 자체가 없는 기록의 시각을 만들어 내지 않는다.
- 응답에 `costBasisAt`, `costBasis = CURRENT | HISTORICAL | ESTIMATED`로 기준을 구분한다. 이 결정으로 실사 금액 정책까지 자동 변경하지 않는다.

## 2. 생산·창고·실사·첨부

| 항목 | 확정 정책 |
|---|---|
| 작업지시 일정 | C. 초안은 기존 수정, 승인 뒤는 owner 전용 reschedule. 시작 전 시작·종료 변경, 시작 후 종료만 변경. 사유·이전/새 날짜·변경자·시각 보존 |
| 할당 피킹 | B. inventory가 이동을 지휘하고 production 공개 AllocationCommand 호출. 예약 유지, 부분 이동 시 할당 분할, 재고·할당 갱신 한 트랜잭션 |
| 블라인드 실사 | A. 시작 시 서버 수량 snapshot, 재고 변동 행 재실사, 계획별 blind 선택. blind 기준 수량 열람은 Project owner만 |
| 첨부 | 메타데이터 DB + StorageService 추상화. 개발/단일 서버 Local, 운영/다중 서버 S3-compatible를 설정으로 선택. 기본 10MB 설정 가능. 다운로드 Project read, 업로드 Project write. released/retired 지침에서 참조한 파일 보존 |

## 3. 프로젝트 시간대

B 승인. `Project.timeZone`은 IANA Zone ID. 기존 프로젝트는 `Asia/Seoul`로 backfill, timestamp 저장은 UTC. LOT 만료·FEFO·NCR 기한·작업지시 날짜·설비 달력·실사 날짜·BOM 유효일은 프로젝트 시간대로 해석한다. 향후 조직 시간대는 프로젝트 생성 기본값으로만 사용한다.

## 4. Setup·비용·부산물

- 단일 `item.setup_group` 문자열은 승인하지 않는다. 색상·금형·재질·세척등급 등을 동시에 표현하는 다차원 setup attributes를 사용한다.
- 전환 규칙 우선순위: 품목 쌍 > setup attribute 쌍 > default.
- setupCost는 setup 시간 × 설비 시간당 원가. Material Cost에 합치지 않는다. 계획은 현재 설비 원가의 estimate, 실제 원가는 실제 시간·비용 snapshot이 필요하다.
- 부산물 가치는 별도 표시하고 재료비에서 자동 차감하지 않는다. 폐기 처리비는 Item.unitCost를 재사용하지 않고 별도 Waste Disposal Cost로 설계한다.
- 배출량은 BOM line type으로 추가하지 않는다. 별도 EmissionFactor 모델로 보류한다.

## 5. 유효일 BOM·팬텀

- 유효기간이 겹치지 않는 여러 approved revision 허용. overlap이면 승인 거절. 새 승인으로 이전 BOM을 자동 retire하지 않는다.
- 기간 조정은 명시적 사용자 동작. 작업지시는 `plannedStartAt` 기준으로 revision을 선택·저장하고, 실행은 그 revision을 물려받는다. 실행 중 날짜 변경으로 revision을 바꾸지 않는다.
- 여러 draft 허용. 초기에는 품목당 pending approval 하나만 허용한다.
- 팬텀은 `BomLine.phantom`에 둔다. 같은 반제품을 어떤 BOM에서는 팬텀, 다른 BOM에서는 stocked로 쓸 수 있다. Item 기본값이 생겨도 최종 판단은 BOM 사용 맥락이다.

## 6. D2·LOT·보정

- 새 LOT는 검사/Release가 필요 없는 품목이면 AVAILABLE, 필요하면 QUARANTINE / INSPECTION_PENDING. 호환 기본값 AVAILABLE.
- 완료 실행 보정: editor 요청, Project owner 승인. 재고·실적·계보 한 트랜잭션 반영, 원기록 삭제/수정 없음.
- LOT 종료·재개는 Project owner만. Organization OWNER/ADMIN만으로 허용하지 않는다.
- LOT 계보는 runId 필수, stepId/processId 선택. 기존 실행 단위 기록도 계속 유효하다.
- **집계 정정:** 사용자는 D2 15/15 종료를 지시했지만, 이전 보고가 원문 §4의 품목 삭제 방어(재고 행/활성 BOM 참조가 남으면 409)를 완료 실행 보정으로 잘못 바꿔 집계했다. 실제 원문 15건 중 명시적으로 확인된 결정은 14건(조건부 승인 포함)이다. 품목 삭제 방어 한 건은 별도로 사용자 확인 중이며, 확인 전 임의 승인하지 않는다. 기존 방어 코드는 유지한다.
- 기존 CHECK `NOT VALID` 승인 조건인 운영 데이터 정리·VALIDATE 계획은 유지한다.

## 7. 조직·권한

ADR-001 Accepted. 조직 멤버십은 프로젝트 멤버십이 아니다. cross-project 기본 DENY. Org OWNER/ADMIN의 프로젝트 내용 접근 override 없음. Org MEMBER는 모든 프로젝트 목록을 보지 못한다. Org OWNER/ADMIN은 이름·ID·상태·owner의 관리 metadata만 조회 가능하며 업무 데이터는 ProjectMember여야 한다.

조직 탈퇴/제거 시 해당 조직의 ProjectMember를 비활성화한다. 프로젝트 소유자이면 ownership 이전 전까지 탈퇴/제거 거절. Project owner와 Organization owner가 달라도 된다. 조직 도입 전후 기존 프로젝트 접근 결과는 동일해야 한다.

초기 역할: viewer 읽기, editor 정상 작성·실행·재고 명령·보정 요청·실사, owner 승인·권한 관리·고위험 변경. BOM/작업지시 승인·승인 후 일정 변경·완료 실행 보정 승인·LOT 종료/재개·프로젝트 멤버 관리는 owner다.

## 8. Core·실행·협업

- ADR-002 Accepted 유지. 다른 도메인 Repository 대신 공개 application API, 고치는 파일에서 Stage B.
- ADR-003 원칙 Accepted·registry Experimental 유지. [ADR-005](../architecture/adr/ADR-005-port-measurement-and-validation.md)에 계측 필드·검증 수준 후속 결정 기록.
- 비제조 Port quantity/unit은 선택. 제조 재료 등 필요한 도메인에서 검증한다. 노동·설비·CPU/GPU·memory·skill·capacity는 포트 자원이 아니라 실행 요건. 공통 거대 테이블은 만들지 않고 두 번째·세 번째 사례 뒤 공통 계약 추출.
- ADR-004 수정 승인. 노드 실행 정책, 연결 failure_policy 유지. TIMEOUT → failed → 연결 정책. alert-only 없음. 지연 재시도는 planned + scheduledAt 뒤 외부 start, 서버 자동 실행·대기열 없음. 동시성은 **workflowRevision + node** 단위, 물리 설비 capacity와 분리.
- 협업은 요소별 patch + optimistic version. 같은 요소 충돌은 409/명시적 해결. CRDT·Outbox·Microservices는 Deferred.
- Generic Execution Core는 backend integration 수준 VALIDATED. Generic Data Flow Product는 PARTIALLY VALIDATED. 실제 API 브라우저에서 생성 → 포트 → Publish → 실행 → 각 Step 처리 → output 확인 전체가 통과한 뒤 vertical slice를 VALIDATED로 올린다.

## 9. 구현 순서와 계속 남는 확인

1. D+ 실행 원가
2. 프로젝트 시간대
3. 승인 작업지시 reschedule
4. reserved stock picking
5. blind count plan
6. effective-dated BOM
7. phantom BOM line
8. setup attributes / cost
9. attachment storage
10. 실제 API 브라우저 Data Flow 전체 흐름

승인은 구현·마이그레이션 적용·운영 검증 완료를 뜻하지 않는다. 품목 삭제 방어 한 건, 기존 BOM 기록 정리, 기존 DB validate와 보안·부하·실사용 검증은 별도 확인한다. 커밋·푸시·브랜치·기존 Flyway 수정·repair·개발 DB BOM 삽입 금지는 계속 적용한다.
