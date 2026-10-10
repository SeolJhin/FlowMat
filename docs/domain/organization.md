# 조직(Organization) Phase 1–3 구현 설계

상태: **구현(2026-10-10, 세션 1 리드, §2 2cj) — 로컬 격리 검증만.** 새 마이그레이션 **V64**(테이블·NULL 허용 `project.organization_id`)·**V65**(개인 조직 backfill), 개발 DB(5434) 미적용. 근거: [ADR-001](../architecture/adr/ADR-001-organization-project-boundary.md)(Accepted 2026-10-05)와 [DECISIONS-2026-10-05](../status/DECISIONS-2026-10-05.md) §7. 아래 OR1–OR10은 ADR의 Phase 1–3을 코드·마이그레이션·검증으로 옮긴 리드의 구현 계약이다. 새 프로젝트의 기본 조직(OR6)은 ADR이 "Phase 1 구현 때 제안하고 사용자 확인을 받는다"고 남긴 항목이며, **2026-10-10 사용자가 리드 제안(만든 사람의 개인 조직)을 확인했다.**

## 바뀌지 않는 것 (불변식)

- 업무 데이터 접근은 지금처럼 `ProjectAccessService`가 `project.owner_id`·활성 `project_member`·`PROJECT_VIEW_ALL`로만 판정한다. 조직 멤버십은 프로젝트 접근을 주지 않는다(ADR 결정 1·3).
- 조직 도입·backfill 전후로 모든 사용자의 `listAccessibleProjects` 결과와 read·write·owner 판정이 같다(수용 기준 4).
- `project_id`는 그대로다. 데이터의 조직은 `데이터 → Project → Organization`으로 찾는다.

## 규칙

| # | 규칙 | Phase |
|---|---|---|
| OR1 | 새 테이블 `organization(organization_id PK, organization_name varchar(100) NOT NULL, organization_type varchar(20) NOT NULL CHECK IN ('personal','team'), owner_user_id FK users NOT NULL, created_at, updated_at, deleted_yn)`와 `organization_member(organization_member_id PK, organization_id FK, user_id FK, org_role CHECK IN ('owner','admin','member'), member_status CHECK IN ('active','left','removed'), joined_at, left_at)`. 활성 멤버는 (organization, user)당 하나(부분 UNIQUE). `project.organization_id`는 NULL 허용 FK로 추가 | 1 |
| OR2 | 조직 API: `POST /organizations`(로그인 사용자 누구나, 만든 사람이 owner), `GET /organizations`(내가 활성 멤버인 조직만), `GET /organizations/{id}`·`/members`(활성 멤버만), `POST /organizations/{id}/members`(owner·admin, 기존 사용자 ID로 추가), `PUT …/members/{memberId}`(역할 변경: owner만, 마지막 owner 강등 409) | 1 |
| OR3 | **관리 metadata 목록** `GET /organizations/{id}/projects`: 조직 owner·admin만. 응답은 `projectId·projectName·projectStatus·ownerId`뿐이고 업무 데이터 링크·카운트를 넣지 않는다. member는 403(조직 전체 프로젝트를 보지 못함). 이 목록은 프로젝트 접근 판정에 쓰이지 않는다 | 1 |
| OR4 | **탈퇴·제거** `POST /organizations/{id}/members/{memberId}/leave`(본인)·`/remove`(owner·admin): 그 사용자가 이 조직 프로젝트 중 하나라도 `project.owner_id`이면 409(소유권 이전 먼저). 아니면 한 트랜잭션에서 조직 멤버를 `left/removed`로 바꾸고, **이 조직에 속한 프로젝트의 그 사용자 `project_member`를 `removed`로**(기존 멤버 제거와 같은 값) 바꾼다. 다른 조직 프로젝트의 멤버십은 건드리지 않는다. 마지막 owner는 탈퇴 불가 | 1 |
| OR5 | Phase 1 동안 기존 프로젝트의 `organization_id`는 NULL. NULL인 프로젝트는 OR3 목록에 나오지 않고 OR4의 영향도 받지 않는다(아무 조직의 프로젝트가 아님) | 1 |
| OR6 | **[사용자 확인 2026-10-10] 새 프로젝트의 조직 기본값.** 확정: 요청에 `organizationId`가 없으면 만든 사람의 **개인 조직**(OR7로 생성, 없으면 그때 만든다). 있으면 요청자가 그 조직의 활성 owner·admin·member여야 한다(member도 자기 프로젝트는 만들 수 있게). 어느 경우든 프로젝트 접근은 지금처럼 owner_id·ProjectMember로만 정해진다 | 1(확인 뒤) |
| OR7 | Phase 2 backfill(새 마이그레이션 1개, 멱등): 사용자마다 `organization_type='personal'` 조직 하나(이름 `<user_name>의 작업 공간`, owner = 그 사용자)를 만들고, 기존 프로젝트를 `owner_id`의 개인 조직에 연결한다. 이미 연결된 행은 건드리지 않는다. 기존 `project_member`는 바꾸지 않는다(다른 사람의 개인 조직에 그 멤버가 생기지 않음) | 2 |
| OR8 | Phase 3: backfill 뒤 `organization_id IS NULL`인 프로젝트 0건을 확인하는 점검 쿼리·리포트만 만든다. NOT NULL 전환은 ADR이 미정으로 남겼으므로 하지 않는다 | 3 |
| OR9 | 조직 삭제·이름 외 수정·조직 간 프로젝트 이동·소유권 이전·권한 상속·Site·Partner는 범위 밖(ADR "결정하지 않은 것") | — |
| OR10 | 개발 DB(5434)는 V51에 멈춰 있다. Phase 1·2 마이그레이션은 Testcontainers와 전용 컨테이너 BEGIN/ROLLBACK 리허설로만 검증하고, 개발 DB 적용은 사용자 승인 뒤 | — |

## 구현 메모 (2026-10-10)

- **위치:** 조직 코드는 `domain/project` 컨텍스트 안에 둔다(`Organization`·`OrganizationMember`·`OrganizationService`·`OrganizationController`). Phase 1–3은 프로젝트 소유·멤버십과 함께 움직이므로, 별도 컨텍스트로 두면 project ↔ organization 공개 API가 서로를 부르는 순환이 생긴다. 별도 컨텍스트 분리는 Site·Partner(Phase 4) 때 다시 본다.
- **사용자 확인:** 조직 멤버 추가는 사용자 컨텍스트 저장소를 읽지 않고, `organization_member.user_id` 외래 키가 없는 사용자를 거절하게 한다(400). 실행 중 만드는 개인 조직 이름은 사용자 ID로 짓는다(backfill은 `user_name`).
- **잠금:** 멤버 추가·역할 변경·탈퇴·제거는 조직 행 잠금 아래에서 한다. 개인 조직 생성은 사용자별 advisory lock으로 하나만 만든다(부분 UNIQUE 인덱스도 막는다).
- **화면(2026-10-10, §2 2co):** `/organizations`(홈 머리글 **Organizations** 링크)에서 내 조직 목록·팀 조직 만들기·멤버 표(owner는 역할 변경, owner·admin은 서버 규칙대로 제거, 본인은 탈퇴)·멤버 추가(사용자 ID, admin은 admin·member만)·owner/admin에게만 프로젝트 metadata 목록(링크 없음, "보여도 열리지 않음" 안내). 마지막 owner의 강등·탈퇴·제거는 보내기 전에 막고 이유를 보인다. 프로젝트 소유자 탈퇴 409 등 나머지는 서버 메시지. member는 프로젝트 목록을 요청하지 않는다. 홈 새 프로젝트 폼은 팀 조직이 있을 때만 **조직** 선택(기본 "개인 작업 공간")을 보이고 고른 조직 ID를 보낸다(OR6). 만들기는 재시도 안전하지 않아 응답 유실 시 목록을 다시 읽고 확인을 안내한다. 검증: 모델 단위 4, 모의 E2E `e2e/organizations.spec.ts` 3(만들기·추가·실패 메시지·소유권 넘김·탈퇴 / 새 프로젝트 조직 선택 / member 읽기 전용), 프런트 전체 611·타입·lint, 전체 모의 E2E 127 통과·17 의도적 제외. 실제 API 브라우저 검증은 V64·V65가 적용된 전용 환경에서 오류·테스트 담당이 한다.

## 검증 계획 (ADR "검증" 그대로 고정)

- **호환성 회귀**: Phase 1·2 적용 전 모든 시드 사용자(owner·editor·viewer·외부인·`PROJECT_VIEW_ALL`)의 `listAccessibleProjects`와 각 프로젝트 read·write·owner 판정 표를 만들고, 적용 뒤 같은 표와 완전히 같아야 한다.
- 조직 owner·admin이지만 프로젝트 owner도 멤버도 아닌 사용자의 그 프로젝트 읽기 403(override 없음), OR3 목록에는 이름·상태만 보임.
- 같은 조직의 다른 프로젝트 멤버가 그 프로젝트를 읽으면 403(cross-project deny).
- 조직 member의 OR3 호출 403.
- 탈퇴: 그 조직 프로젝트 멤버십만 inactive, 다른 조직 것은 유지. 프로젝트 owner의 탈퇴 409. 마지막 owner 탈퇴 409. 탈퇴·제거·역할 변경 동시 실행에서 owner 0명이 되지 않음(조직 행 잠금).
- backfill 멱등: 두 번 실행해도 개인 조직·연결 수가 같음.

## 작업 나눔

- 리드: OR1–OR8 구현(사용자가 OR6를 확인한 뒤 시작), 문서.
- 오류·보안 담당 Agent: 호환성 회귀 표 테스트와 권한 경계(OR3·OR4) 보안 검토.
- 인증 구역(로그인·사용자) 코드는 건드리지 않는다. 사용자 조회는 기존 공개 경로로 한다.
