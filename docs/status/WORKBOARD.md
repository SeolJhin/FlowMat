# 작업 현황판

> **현행 문서** · 최종 갱신 2026-10-05 · 작업을 시작·끝내거나 결정이 나면 같은 변경에서 고친다. 무엇이 구현됐는지는 [CURRENT_CAPABILITIES](CURRENT_CAPABILITIES.md), 아키텍처 결정은 [결정 인계](../architecture/decision-handoff.md)가 기준이다. 이 판은 "지금 무엇을 하고, 다음에 무엇을 하며, 무엇을 기다리는가"만 모은다.

## 1. 진행 중

| 일 | 상태 | 끝나면 |
|---|---|---|
| 2026-10-05 Codecov CI 실패 수정·결정 수령 | aa5c294 원격 backend tests·coverage gate·build 성공, Codecov v4 CLI 다운로드 TLS handshake 실패만 확인. v5·업로드 한정 continue-on-error·3분 제한·보고서 artifact·경고 추가. 로컬 YAML/필수 gate 유지 확인. 승인 결정 기록, 품목 삭제 집계 1건 별도 확인 | 원격 재실행은 사용자 커밋·푸시 후. 다음 D+ 구현 |
| 2bj 원가 조회·표시 완료 | 전체 백엔드 1,070 실패·오류·건너뜀 0(라인 81.18%·분기 67.52%)·커버리지·빌드, 프런트 469·타입·기존 lint·빌드, 모의 API 원가 3 및 일정 4 재확인 | 2bk 실사 계획 완료. 2bl 예약 유지 이동 완료. 2bm 자동 예약 우선 피킹 완료. 다음 유효일 BOM 구현. actualEndAt 마감 기록과 workflow 공개 API 범위는 답변 대기 |
| 2bi 완료: 승인 일정 변경 | 서버·화면·V52 구현 및 격리 SQL 롤백. 통합 23·브라우저 4·전체 백엔드 1,064 실패 0(라인 81.15%·분기 67.40%)·빌드, 프런트 464·타입·기존 lint·빌드 통과 | 2bj 원가 조회·표시도 구현, 다음 2bk: 서버 실사 계획·블라인드·행별 재실사. actualEndAt 마감 기록을 위한 workflow 공개 Query 수정 범위는 확인 중 |
| 2bh 완료: D+ 과거 단가 Query | 최초 12건 compile RED → GREEN, 단위 15·격리 통합 3 포함 전체 백엔드 1,041건 실패·오류·건너뜀 0, 커버리지 기준 통과(라인 81.07%·분기 67.31%), 새 조회 100%·95%. 격리 build -x test도 통과. 기존 서버·DB·BOM은 건드리지 않음 | 실행 원가 API 연결은 별도 후속 단계, workflow 공개 Query 범위 확인 중. D+ 전체 완료 아님 |
| docs 정리(현행·참고·보관 분리, 현행 문서 내용 갱신) | 끝. docs의 md 전부 스테이징(2026-10-02), 그 뒤 문서 변경도 계속 `git add -u docs`·새 md는 `git add -f`로 스테이징 | 사용자 커밋·푸시 |
| 커밋 전 코드 변경: V42–V51과 아래 §2의 1·2·2a–2al | 로컬 검증 끝(2026-10-03 마지막 전체 실행: 백엔드 994건·커버리지 기준(2aj까지), 프런트 409건·린트·타입 검사·빌드와 브라우저 E2E 34건(2ag까지), 그 뒤 프런트 변경은 관련 테스트·E2E). 코드는 스테이징하지 않음. CI browser-e2e에 새 실 API 스펙 6개를 더함 | 사용자 커밋·푸시, 그다음 CI 확인 |
| 세션 1 Agent 인계(2026-10-03부터 약 5일) | [AGENT_HANDOFF](AGENT_HANDOFF.md)에 맡는 구역·할 일 순서(CI 확인, 매일 전체 회귀, 결정 메모, 결정 없는 작은 개선)·지킬 것·검증·멈추는 조건을 적음. 이어받는 Agent는 하루 끝에 이 표에 한 줄 기록 | 사용자 커밋·푸시 뒤 CI 확인부터 |
| 2026-10-04 위치 변경·창고 작업 회귀 보완 | 동시성·교착 9건과 캐시 2건·가짜 API E2E 1건을 재현 후 수정. 백엔드 전체 1,012건 실패·오류·건너뜀 0·라인 커버리지 81.00%·커버리지 기준 통과, 프런트 전체 417건·타입·린트·빌드 통과. 만료 LOT 준비 수량 수정·통합 3건도 통과. 설비 달력 동시 교체·삭제 4건도 재현 후 수정·통과. BOM은 개발 DB에 넣지 않음 | §2 2am–2ao, 남은 결정은 §3·§4 그대로 |
| 2026-10-04 세션 1 재개(인계 Agent는 사용자가 멈춤) | 재부팅 뒤 이 계정이 E 드라이브 루트를 읽지 못해 E: 경로의 Vite·gradlew가 실패 → `subst X:`로 잡은 X:에서 실행([AGENT_HANDOFF](AGENT_HANDOFF.md) §5). 결정 메모 추가(시간대, setup 묶음·전환 비용, 부산물 가치·배출, 유효일 BOM·팬텀). §2 2ap(넓은 화면 넘침). 프런트 전체 417건·린트·타입·빌드 통과, 실 API·가짜 API E2E 34건(BOM 만드는 `bom-lot-flow` 제외) 통과, 백엔드 전체 1,012건 실패 0·커버리지 기준 통과(스크래치 격리 복사본, 표준 `gradlew test jacocoTestCoverageVerification`) | 사용자 커밋·푸시 |
| 2026-10-05 피킹 준비 수량 회귀 및 격리 환경 전체 검증 | §2 2aq: 계획 후 만료·격리·일부 출고 3개 실패를 재현 후 수정, 준비 수량 통합 7건 통과. 백엔드 전체 1,016건 실패·오류·건너뜀 0·라인 커버리지 81.01%·기준 통과, 프런트 417건·타입·린트·빌드 통과. 최신 코드의 실 API·가짜 API E2E 34건 통과(BOM 생성 스펙 제외). 기존 개발 서버·DB는 건드리지 않고 검증용 서버·컨테이너만 종료 | 결정 대기: 실행 원가 시점, 승인 작업지시 날짜, 할당 피킹, 블라인드 실사, 첨부, 시간대, setup·부산물·유효일 BOM(§3·§4 Proposed 근거 그대로) |
| 2026-10-05 스캐너 보완 및 완료 위치 확인 | §2 2ar–2as 구현. 최신 작업·Enter 포커스·입력 잠금·실제 완료 응답, 잠금 안의 스캔 위치 대조와 409 뒤 최신 목록 복구. 백엔드 전체 1,023건 실패·오류·건너뜀 0·라인 커버리지 81.02%·기준 통과, 프런트 421건·타입·린트·빌드, 관련 가짜 API E2E 7건 통과(신규 스캐너 6 + 위치 캐시 1). 개발 DB는 사용하지 않음. 임시 프런트 종료 | §3·§4 결정 대기 유지, 다음 번호 2at |
| 2026-10-05 실사 화면 갱신 보호 | §2 2at 구현. 프런트 전체 427건·타입·린트·빌드, 실사·CSV 단위 16건, 가짜 API E2E 3건 통과. countModel 라인 100%·분기 97.77%·80% 기준 통과. 서버 변경 없음(앞선 백엔드 1,023건·커버리지 81.02% 기록 유지, 이번에는 재실행하지 않음). 개발 DB는 사용하지 않음 | §3·§4 결정 대기 유지, 다음 번호 2au |
| 2026-10-05 재고 응답 유실 재시도 보호 | §2 2au 구현. 입고·이동의 서로 다른 재시도 키 전송 2건과 저장 중 입력 변경 2건을 재현 후 수정. 프런트 전체 433건·타입·린트·빌드, 관련 가짜 API E2E 2건, 공통 명령 모델 6건·커버리지 100% 통과. 서버·DB·마이그레이션 변경 없음 | 다음 후보: FEFO 출고·예약의 같은 응답 유실 문제, §3·§4 결정 대기 유지 |
| 2026-10-05 FEFO 재시도 보호 및 합동 검증 | §2 2av 구현. FEFO 출고·예약의 키 불일치 2건을 재현 후 수정. 프런트 전체 437건·타입·린트·빌드, 재고·FEFO 가짜 API E2E 4건, 공통 명령·FEFO mutation 10건 및 대상 커버리지 100% 통과. 자동 승인 검토가 사용량 한도로 브라우저 실행을 한 번 거절했으나 제한 시간 후 같은 검토 경로로 재실행·통과. 서버·개발 DB·마이그레이션 변경 없음 | §3·§4 결정 대기 유지, 다음 번호 2aw |
| 2026-10-05 실사 미확인 요청 복구 | §2 2aw 구현. 응답 유실 재시도 409 두 건과 중첩 비교 충돌 두 건을 재현 후 수정. 프런트 전체 443건·타입·린트·빌드, 실사 브라우저 5건, 명령·FEFO·실사 단위 16건·커버리지 기준 통과 | 다음: 만료 폐기 결과가 목록 갱신 뒤 사라지는 문제. 실사 서버의 차이 0 행 재생 한계는 C13 메모 |
| 2026-10-05 폐기 결과 유지·게이트웨이 복구 | §2 2ax–2ay. 프런트 446건·타입·린트·빌드, 관련 브라우저 19건, 명령/mutation 19건·라인 94.73%·분기 84.61% 통과. 폐기 후 재조회 결과 유실·대상 변경 3건, 503 안내 누락 6건을 재현 후 수정 | 다음 번호 2az. 실사 미확인 상태에서 행 삭제 후 복구 경로 점검 |
| 2026-10-05 실사 행 삭제·시트 읽기·포장 입력 | §2 2az–2bb. 프런트 449건·타입·린트·빌드, 실사 브라우저 12건과 포장·재시도 7건 통과. 실사 미확인 원래 요청 재생, CSV 중복 거절·읽기 취소·오류 처리, 빈 포장 입력의 옛 환산 수량 제거 | 서버 변경 없음. 다음 2bc: 일괄 입고의 파일 선택·검사 응답 순서 점검 |
| 2026-10-05 일괄 입고 파일·미확인 저장 방어 | §2 2bc–2bd. 프런트 전체 449건·타입·린트·빌드, 가짜 API 8건 통과. 파일·검사 경합 5건과 저장 후 응답 유실 2건 수정 전 재현. 최신 파일 검사, 취소·읽기 실패 복구, 저장 중 입력 잠금과 미확인 재제출 차단 | 서버 CSV 입고 멱등성은 미구현. 이력 확인 후 Cancel·새 제출은 새 거래. 다음 2be: 중복 CSV 열의 값 덮어쓰기 점검 |
| 2026-10-05 CSV 열 중복 방어 | §2 2be. 모델 8건·화면 2건 수정 전 잘못된 선택을 재현 후 거절 구현. 전체 프런트 457건·타입·린트·빌드, 관련 모의 API 10건, 모델 21건·80% 커버리지 기준 통과 | 다음 2bf: 품목 CSV의 파일·검사 경합과 저장 중 입력 잠금. 서버 변경 없음 |
| 2026-10-05 품목 CSV 파일·검사 방어 | §2 2bf. 가짜 API 6건·프런트 전체 457건·타입·린트·빌드 통과. 최신 파일 이름과 검사·저장 내용을 연결, 취소·읽기 실패·저장 중 잠금 | 다음 2bg: BOM 자재 CSV의 파일·replace 옵션·검사 경합. 실제 DB에는 BOM을 삽입하지 않음 |
| 2026-10-05 BOM 자재 CSV 경합 방어·검증 | §2 2bg. 새 검사 동안 옛 미리보기 제거, 파일·옵션 세대 대조와 저장 중 잠금, 중복 필드 열 거절. 프런트 전체 460건·타입·린트·빌드, 모의 API 8건과 읽기 옵션 1건 재확인, 모델 14건·80% 커버리지 기준 통과 | 다음 번호 2bh. 확인한 실사·입고·품목·BOM CSV 격차는 반영됨. §3·§4의 실행 원가 시점·승인 날짜·할당 피킹·블라인드 실사·첨부·시간대·setup·부산물·유효일 BOM 결정 대기 유지 |

2026-10-04 검증 환경: 개발 서버의 클래스 폴더를 건드리지 않도록 별도 빌드 `E:/projects/git/.flowmat-verification/location-final-20261004/build`와 Testcontainers DB를 사용했습니다. Windows에서 일반 분리 Gradle 테스트 컴파일이 생성된 클래스 탐색에 실패하고 javac의 `toRealPath`가 AccessDenied를 내는 것을 확인했습니다. Gradle이 사용한 클래스 경로·소스를 추출해 같은 JDK 21·라이브러리로 별도 javac 컴파일한 뒤 `test jacocoTestCoverageVerification -x compileJava -x compileTestJava`를 실행했습니다. 표준 명령의 처음부터 끝까지 실행 성공과는 구분합니다. 프런트도 Node의 상위 경로 EPERM을 피해 `--preserve-symlinks --preserve-symlinks-main`으로 동일 CLI를 실행했습니다. 전체 실 API E2E는 다시 돌리지 않았고, 이번 위치 변경 화면은 가짜 API E2E로 확인했습니다.

2026-10-05 검증 환경: 백엔드 소스와 Gradle 입력을 `C:/Users/Public/Documents/ESTsoft/CreatorTemp/flowmat-pick-20261005`에 격리 복사하여 표준 `gradlew --offline --no-daemon test jacocoTestCoverageVerification`(컴파일 생략 없음)과 `bootJar`를 실행했습니다. 소스 929개는 원본과 해시가 모두 일치했습니다. E2E는 독립 PostgreSQL·Redis 컨테이너와 패키지 백엔드 18081, 프런트 4183에서 `REAL_API_E2E=1`, workers 1, `--grep-invert "BOM approval"`로 34건을 실행했습니다. 검증용 서버·컨테이너는 종료했고 결과는 위 격리 경로에 보관했습니다. Node는 상위 경로 접근 문제를 피해 preserve-symlinks 옵션으로 같은 CLI를 실행했습니다. 개발 DB에 BOM을 넣거나 기존 마이그레이션을 수정하지 않았습니다.

2026-10-05 스캐너 추가 검증: 같은 C: 격리 복사본에서 표준 전체 Gradle 테스트·커버리지 기준을 다시 통과했습니다(백엔드 소스 930개, 원본과 해시 불일치 0). 브라우저는 전용 프런트 4184와 전체 API 모킹으로 확인해 실제 DB 요청·실제 로그인을 쓰지 않았습니다. 앞선 전체 E2E 34건은 2aq 시점 기록이고, 이번 2ar–2as 뒤에는 관련 7건을 다시 실행했습니다. 앞선 프런트 종료 때 Volta 실행기만 끝나고 남았던 node 자식은 임시 스크립트·부모 체인·시작 시각을 확인해 종료했습니다. 이번 프런트도 실제 node PID로 확인해 종료했습니다. 기존 개발 서버·컨테이너는 건드리지 않았습니다.

2026-10-05 CSV 보완 검증 정리: 2az–2bg는 가짜 API 브라우저만 사용했고 실제 DB에 BOM·재고를 쓰지 않았습니다. 프런트 전체 마지막 결과는 460건·타입·린트·빌드 통과이며, 백엔드는 이번 CSV 변경에서 수정·재실행하지 않았습니다(앞선 2as 전체 1,023건·81.02% 기록). 40개 변경 파일 UTF-8 BOM 0, 문서 9개 상대 링크 오류 0, diff 공백 오류 0. 4187은 저장한 자기 PID·UTC 시작 시각·스크립트 명령을 대조한 뒤 자기 esbuild 자식과 함께 종료했습니다. 커밋·푸시·브랜치·새 스테이징은 하지 않았습니다. 다음 큰 기능인 실행 원가 기준은 §3의 Proposed 결정에 따라 D(마감 단가 조회·보정 반영), B(저장·보정 때 재계산), A(마감 금액 고정) 중 사용자 선택을 요청해 둔 상태입니다. 결정 전 계산 정책·상태는 바꾸지 않습니다.

2026-10-05 CI 원인 확인: [backend job](https://github.com/SeolJhin/FlowMat/actions/runs/37270508574/job/111636300123)의 Run tests·Verify coverage gate·Build는 success, Codecov만 failure. CLI 다운로드 직후 TLS alert 40으로 종료했다. [v4 구현](https://github.com/codecov/codecov-action/blob/v4/src/index.ts)은 https.get 요청 오류 handler가 없고 업로드 오류 옵션이 이 경로를 보호하지 못한다. TLS를 거절한 외부 측의 세부 원인은 이 로그만으로 확정할 수 없다. 로컬 수정은 v5·해당 업로드 단계만 continue-on-error·3분 제한·JUnit/JaCoCo artifact·실패 경고다. YAML과 필수 gate 유지 확인, 원격 재검증은 커밋·푸시 금지 때문에 실행하지 않았다.

## 2. 다음 작업 (순서대로)

| # | 일 | 조건 | 상세 |
|---|---|---|---|
| 1 | ~~포트의 `itemId`를 선택으로~~ | **완료(2026-10-03, 커밋 전).** V42(`process_io.item_id` NOT NULL 해제, 세션 DB에 적용됨), 생성 API `itemId` 선택, 수정 API `clearItem`, 포트 편집 화면 "No item" 선택지(품목 없는 프로젝트에서도 폼 표시). 실 API E2E `e2e/data-ports.spec.ts`(CI browser-e2e에 추가) | [결정 인계](../architecture/decision-handoff.md) §6-5, [ADR-003](../architecture/adr/ADR-003-resource-port-contract.md) 결정 4 |
| 2 | ~~데이터 흐름 통합 테스트~~ | **완료(2026-10-03, 커밋 전).** `DataFlowRunIntegrationTest`: 새 프로젝트에서 Item 없는 File → Transform → Data를 `actual`로 끝까지, 제조 행 0 | FlowRun 범용성을 "검증됨"으로 바꿀지는 아래 §3 결정 대기 |
| 2a | ~~설비 교대 여러 개(FM-PLAN-003)~~ | **완료(2026-10-03, 커밋 전).** V43(`equipment_calendar` 키를 `shift_id`로, 기존 달력은 교대 하나로, 세션 DB에 적용됨), 설비당 교대 6개·겹침 거절, Schedule 화면 Add shift·Remove shift. 통합 테스트·단위 테스트·실 API E2E `e2e/equipment-schedule.spec.ts` 통과 | [설비 달력](../domain/equipment-schedule.md) "교대" |
| 2b | ~~작업지시 계획 기간 제안(FM-PLAN-002·003)~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. `GET /work-orders/{id}/plan-suggestion`(가장 이른 시작·끝, 승인된 작업지시 비켜 가기, 전환 시간), Work Orders → Readiness의 Plan dates(초안은 그대로 저장). 통합 테스트·단위 테스트·실 API E2E `e2e/work-order-plan.spec.ts` 통과 | [설비 달력](../domain/equipment-schedule.md) "계획 기간 제안" |
| 2c | ~~불량 목록에서 바로 NCR 발행(FM-MFG-004)~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. `GET /nonconformities/defect-links`, 실행·LOT 화면 Defects 목록의 NCR 번호와 **For a new NCR** 체크 → **Raise NCR from defects**(새 NCR 또는 **Add to**로 열린 NCR에 더하기). 통합 테스트·단위 테스트·실 API E2E `e2e/ncr-from-defects.spec.ts` 통과 | [부적합](../domain/nonconformity.md) N11 |
| 2d | ~~실행 종료 시 필수 검사 미완료 경고~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Finish Run 위 경고와 종료 확인창 문장(`finishQualityWarning`). 단위 테스트·실 API E2E `e2e/inspection-standards.spec.ts` 확장 통과 | [검사 기준](../domain/inspection-standard.md) "화면" |
| 2e | ~~LOT 입고 검사 체크리스트~~ | **완료(2026-10-03, 커밋 전).** 프런트만. LOT 상세 Quality 위 Receipt checks(`receiptChecklist`, 실행 체크리스트와 같은 판정 규칙). 단위 테스트·실 API E2E `e2e/receipt-checklist.spec.ts` 통과 | [검사 기준](../domain/inspection-standard.md) "화면" |
| 2f | ~~실행 시작 폼에 작업지시 준비 점검~~ | **완료(2026-10-03, 커밋 전).** 프런트만. 시작 폼에서 작업지시를 고르면 요약과 정상이 아닌 점검(`StartReadiness`). 실 API E2E `e2e/bom-lot-flow.spec.ts`에 확인 추가, 통과 | [준비 점검](../domain/work-order-readiness.md) "화면" |
| 2g | ~~위치 계층별 재고 합계~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Locations 탭 재고 칸에 안쪽 위치까지 합친 행·품목 수(`stockWithin`), Count 탭 **Place** 거르기(`codesWithin`). 단위 테스트·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [보관 위치](../domain/storage-location.md) "화면" |
| 2h | ~~피킹된 재고를 실행 투입 후보로 먼저~~ | **완료(2026-10-03, 커밋 전).** 프런트만. 실행 기록 폼에서 작업지시의 완료 피킹 위치 재고가 맨 앞, `picked for this order`. 단위 테스트 통과. BOM을 dev DB에 넣지 않아 이 흐름의 실 화면 E2E는 없음 | [창고 작업](../domain/warehouse-task.md) "이후" |
| 2i | ~~창고 작업 부분 완료~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. `complete {quantity}`로 일부만 옮기면 새 done 작업, 원래 작업은 나머지로 열림(W6). 같이 `WarehouseTaskService`를 공개 API로(Stage B, 동결 98 → 96, 새 `WorkOrderQuery`). 통합·단위·실 API E2E 통과 | [창고 작업](../domain/warehouse-task.md) W6 |
| 2j | ~~설비 부하 타임라인(간트)~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Load by week 표 아래 설비별 막대(lane 쌓기, 초안 점선, 승인·진행 겹침 빨간 테두리). 단위 테스트·실 API E2E `e2e/equipment-load.spec.ts` 확장 통과 | [설비 부하표](../domain/equipment-load.md) "화면" |
| 2k | ~~Workflow revision 폐기 화면~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Runs 시작 폼 아래 Revisions 목록과 **Retire**(확인창). 단위 테스트·실 API E2E `e2e/revision-retire.spec.ts` 통과 | [Workflow Revision](../domain/workflow-revision.md) "화면" |
| 2l | ~~설비 날짜별 교대(설비별 휴일·단축·특근)~~ | **완료(2026-10-03, 커밋 전).** V45 `equipment_day_override`(세션 DB에 적용됨). `PUT/DELETE /equipments/{id}/days/{date}`, 휴일보다 우선, Schedule의 **Change a day**·**Day changes**. 통합·단위·실 API E2E `e2e/equipment-days.spec.ts` 통과 | [설비 달력](../domain/equipment-schedule.md) "날짜별 교대" |
| 2m | ~~작업 지침 확인 취소 기록~~ | **완료(2026-10-03, 커밋 전).** V46(`run_instruction_check.undone_by/at`, 살아 있는 확인만 유일, 세션 DB에 적용됨). 취소해도 지우지 않고 `undone`으로 보여 줌(R6), 실행 상세 **Undone confirmations**. 통합·단위·실 API E2E `e2e/work-instructions.spec.ts` 확장 통과 | [작업 지침](../domain/work-instruction.md) R6 |
| 2n | ~~작업 지침 단계 값 한계~~ | **완료(2026-10-03, 커밋 전).** V47(`work_instruction_step.value_min/max`, 값 기록 단계에만·아래 ≤ 위 CHECK, 세션 DB에 적용됨). 한계 밖 값도 기록하고 `outOfLimits`로 표시(막지 않음, W6·R7), 단계 추가 폼 **Min**·**Max**, 실행 상세 `(outside 200–230)`. 같이 `WorkInstructionService`를 `CatalogQuery`로(Stage B, 동결 96 → 95). 통합·단위·실 API E2E `e2e/work-instructions.spec.ts` 확장 통과. 검사 기준과의 연결은 남음 | [작업 지침](../domain/work-instruction.md) W6·R7 |
| 2o | ~~설비 날짜별 교대 기간·복사~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. 날짜 저장에 `throughDate`(62일까지), 지우기에 `?through=`(D6), `POST /equipments/{id}/days/copy`로 다른 설비에(받는 설비 달력 필요, D7). **Change a day**에 **Through**, **Copy day changes** 폼. 통합·단위·실 API E2E `e2e/equipment-days.spec.ts` 확장 통과 | [설비 일정](../domain/equipment-schedule.md) D6·D7 |
| 2p | ~~입고 검사가 빠지거나 불합격인 LOT 거르기~~ | **완료(2026-10-03, 커밋 전).** 프런트만. LOTs 목록 **Receipt checks** 필터(`missing`·`failed`), 걸린 LOT에 `1 required check missing · 1 failed`. 필터를 고를 때만 기준·검사를 불러옴. 단위·실 API E2E `e2e/receipt-checklist.spec.ts` 확장 통과 | [검사 기준](../domain/inspection-standard.md) 화면 |
| 2q | ~~준비 점검에서 부족한 반제품의 작업지시 채우기~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Readiness 자재 표 **Sub-assembly** 칸 **Make N**(부족 − 다른 열린 작업지시 예정 공급) → 새 작업지시 폼(대상·승인 BOM·수량·계획 끝 = 상위 계획 시작). 서버의 `WorkOrderReadinessService`(동결 위반 6줄)는 손대지 않음. 단위·가짜 API E2E `e2e/sub-assembly-order.spec.ts` | [다단계 BOM](../domain/multi-level-bom.md) |
| 2r | ~~실행 마감 때 덜 기록된 부산물·폐기물 알림~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Finish Run 위 `Not all that comes out is recorded: …`와 확인창, 기대량은 마감 생산량에 맞춰 줄임. 막지 않음. 단위·가짜 API E2E `e2e/byproduct-finish.spec.ts` | [부산물](../domain/bom-by-products.md) 화면 |
| 2s | ~~부적합(NCR) 효과 확인~~ | **완료(2026-10-03, 커밋 전).** V48(`nonconformity.verification_*`, 닫힌 NCR에만·넷 함께 CHECK, 세션 DB에 적용됨). `POST /nonconformities/{id}/verify`, 한 번만, 효과 없으면 메모 필수·후속 NCR 발행 폼 채우기(N12). 같이 `NonconformityService`를 공개 API로(Stage B, 동결 95 → 91, 새 `LotQuery`·`ProductionRunQuery`·`ProjectMemberQuery`). 통합·단위·실 API E2E `e2e/nonconformity.spec.ts` 확장 통과 | [부적합](../domain/nonconformity.md) N12 |
| 2t | ~~창고 작업자 배정~~ | **완료(2026-10-03, 커밋 전).** V49(`warehouse_task.assigned_to`, 세션 DB에 적용됨). `PUT /warehouse-tasks/{id}/assignee`(소유자·활성 구성원만, 비우기 가능, 부분 완료도 같은 사람), 목록 `assignedTo` 거르기, 화면 **Assigned** 선택칸과 **Assigned to**(Mine·Not assigned) 거르기(W7). `ProjectMemberQuery` 재사용. 통합·단위·실 API E2E `e2e/warehouse-tasks.spec.ts` 확장 통과 | [창고 작업](../domain/warehouse-task.md) W7 |
| 2u | ~~입고(재고 추가) 자리에서 바로 입고 검사 기록~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Stock 탭에서 LOT 재고를 넣으면 폼 아래 **Received LOT**(Receipt checks 표와 검사·불량 기록, 입고 기준이 없으면 숨김). 실 API E2E `e2e/receipt-checklist.spec.ts` 확장 통과 | [검사 기준](../domain/inspection-standard.md) 화면 |
| 2v | ~~위치(창고)별 재고 분석~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. `GET /stock-analysis?location=` — 그 위치와 안의 위치 재고 행만(A5), Analysis 탭 **Place** 선택. 같이 `StockMovementAnalysisService`를 `CatalogQuery`로(Stage B, 동결 91 → 89). 통합·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [재고 흐름 분석](../domain/stock-analysis.md) A5 |
| 2w | ~~재고 경보를 위치(창고)별로 보기~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Stock 탭 경보에 **Alerts at place**(그 위치와 안의 위치). 단위·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [재고 경보](../domain/stock-alert.md) 화면 |
| 2x | ~~BOM 자재 CSV의 종류 열~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. 선택 `type` 열(material·by_product·waste), 잘못된 값은 줄 오류, 부산물·폐기물은 순환 검사 제외. 같이 `BomLineImportService`를 `CatalogQuery`로(Stage B, 동결 89 → 88). 통합·단위·가짜 API E2E `e2e/bom-by-products.spec.ts` | [부산물](../domain/bom-by-products.md) |
| 2y | ~~설비 날짜 기간에서 요일 고르기~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. 날짜 저장 `weekDays`(D6), **Days of the week** 체크박스. 통합·단위·실 API E2E `e2e/equipment-days.spec.ts` | [설비 일정](../domain/equipment-schedule.md) D6 |
| 2z | ~~품목 단가 이력~~ | **완료(2026-10-03, 커밋 전).** V50 `item_cost_history`(세션 DB에 적용됨). 모든 품목 저장에서 단가가 바뀌면 남김, `GET /items/{id}/cost-history`, 품목 Details **Unit cost history**. 계산은 아직 현재 단가(§3 "실행 원가 저장 시점"과 함께 정함). 같이 `ItemServiceImpl`·`ItemImportService`를 공개 API로(Stage B, 동결 88 → 86, 새 `StockQuery`). 통합·단위·실 API E2E `e2e/inventory-reports.spec.ts` 확장 통과 | [재료비](../domain/material-cost.md) "단가 이력" |
| 2aa | ~~창고 작업 스캔으로 완료~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Tasks 탭 **Scan to do a task**: 품목 스캔 → 열린 작업 → 도착 위치 스캔이 맞을 때만 완료(W8). 단위·실 API E2E `e2e/warehouse-tasks.spec.ts` | [창고 작업](../domain/warehouse-task.md) W8 |
| 2ab | ~~설비 상태 이력~~ | **완료(2026-10-03, 커밋 전).** V51 `equipment_status_history`(세션 DB에 적용됨). 추가 때 첫 상태, 상태가 바뀔 때만 이전·새 상태·메모·누가·언제. `PUT /equipments/{id}`의 `statusNote`, `GET /equipments/{id}/status-history`, Equipment 수정 폼 **Status note**·**Status history**. 통합·단위·실 API E2E `e2e/equipment-schedule.spec.ts` 확장 통과 | [설비 정보](../domain/equipment.md) "상태 이력" |
| 2ac | ~~부족 예상(열린 작업지시 뒤 안전재고 밑)~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Stock 탭 Open work order needs에 **Left after** 열과 `N left under safety stock`, CSV 끝 세 열. 단위·가짜 API E2E `e2e/multi-level-bom.spec.ts` 확장 통과 | [자재 소요](../domain/material-requirements.md) "주문 뒤 남는 양", [재고 경보](../domain/stock-alert.md) "이후" |
| 2ad | ~~한계 밖 지침 값에서 NCR 제안~~ | **완료(2026-10-03, 커밋 전).** 프런트만. 실행 상세 Work instruction의 한계 밖 값 옆 **Raise NCR**(실행·제품 대상, 발행 뒤 번호). 단위·실 API E2E `e2e/work-instructions.spec.ts` 확장 통과 | [작업 지침](../domain/work-instruction.md) R8 |
| 2ae | ~~끝난 실행의 부산물 차이~~ | **완료(2026-10-03, 커밋 전).** 프런트만. 끝난 실행 상세 **Also comes out**: 만든 양에 맞춘 기대량과 `1.1 kg short`·`over`·`as expected`. 단위·가짜 API E2E `e2e/byproduct-finish.spec.ts` 확장 통과 | [BOM 부산물](../domain/bom-by-products.md) 화면 |
| 2af | ~~위치 간 이동 분석~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. `GET /stock-analysis/transfers`(경로·품목별 이동 수·수량, 창고 작업 포함), Analysis 탭 **Moves between places**(Busiest·경로 표). 새 서비스는 `CatalogQuery`만 씀. 통합·단위·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [재고 흐름 분석](../domain/stock-analysis.md) "위치 간 이동" |
| 2ag | ~~모든 단계 반제품 작업지시 한 번에~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Stock 탭 Open work order needs **Draft N work orders for short sub-assemblies**(승인 BOM, 초안 있으면 건너뜀, 이유 표시). 단위·가짜 API E2E `e2e/multi-level-bom.spec.ts` 확장 통과 | [다단계 BOM](../domain/multi-level-bom.md) "모든 단계 한 번에" |
| 2ah | ~~창고 작업 스캐너 화면~~ | **완료(2026-10-03, 커밋 전).** 프런트만. Tasks 탭 **Scanner view**(`?view=scanner`, 큰 스캔 상자와 내 열린 작업, W9). 같이 재고 화면 탭 줄이 넘치면 줄을 바꿈(전에는 페이지가 가로로 넘침). 단위·실 API E2E `e2e/warehouse-tasks.spec.ts` 확장 통과 | [창고 작업](../domain/warehouse-task.md) W9 |
| 2ai | ~~위치 바코드 라벨~~ | **완료(2026-10-03, 커밋 전).** 프런트만, 새 의존성 없음. Locations 탭 **Print labels**: 활성 위치마다 코드의 Code 128 바코드 라벨(인쇄용 새 창, L10). 단위(참조 구현과 같은 모듈)·zbar 판독·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [보관 위치 목록](../domain/storage-location.md) L10 |
| 2aj | ~~설비 전환 순서 제안~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음. 부하표 줄마다 그 주 전환 합과 더 작은 순서(`changeovers`, 제안만, 진행 중 고정). 같이 `EquipmentLoadService` Stage B(동결 86 → 84). 단위·통합·실 API E2E `e2e/equipment-changeover.spec.ts` 확장 통과 | [설비 부하표](../domain/equipment-load.md) "전환 순서 제안" |
| 2ak | ~~재고 화면 좁은 화면 넘침~~ | **완료(2026-10-03, 커밋 전).** 프런트 CSS만. 760px 이하에서 넓은 탭이 재고 화면 안에서 가로로 스크롤(문서 너비 = 화면). 넓은 화면은 그대로. 375px 13개 탭 측정, 콘솔 오류 0, 재고 실 API E2E 3개 통과 | [창고 작업](../domain/warehouse-task.md) W9 화면 |
| 2al | ~~재고 있는 위치의 코드 바꾸기~~ | **완료(2026-10-03, 커밋 전).** 마이그레이션 없음, inventory만. 코드를 바꾸면 그 위치의 재고 행과 창고 작업이 따라감(L7), 위치 코드별 트랜잭션 잠금을 새 재고·이동·작업 계획과 코드 변경·비활성화·삭제가 같이 잡음. 통합(동시성 포함, 잠금을 빼면 실패 확인)·실 API E2E `e2e/storage-locations.spec.ts` 확장 통과 | [보관 위치](../domain/storage-location.md) L7 |
| 2am | ~~위치 변경의 동시성·창고 교착·화면 캐시~~ | **완료(2026-10-04, 커밋 전).** 위치·작업 프로젝트 ID만 조회해 권한 확인 → 공통 프로젝트 잠금 → 최신 상태 조회 → 코드·재고·작업 행 잠금. 기다리던 이름·설명 변경과 비활성화·삭제·작업 계획의 옛 코드 사용, 전체·부분 완료와 양 끝 위치 변경의 교착을 수정. Stock·Tasks 등 이전 조회 취소와 캐시 갱신. 동시성 통합 9건, 캐시 2건, 가짜 API E2E 1건 통과 | [보관 위치](../domain/storage-location.md) 동시성, [창고 작업](../domain/warehouse-task.md) W5 |
| 2an | ~~만료 LOT의 피킹 준비 수량~~ | **완료(2026-10-04, 커밋 전).** 준비 위치의 만료 LOT가 필요한 피킹 수량을 줄이던 문제를 재현(만료 4kg을 준비됨으로 계산). 준비 수량과 피킹 후보에 같은 LOT 사용 가능 기준 적용. 만료일 전날·당일·다음 날 통합 테스트 3건과 전체 1,008건·커버리지 기준 통과. 마이그레이션·API 형식 변경 없음 | [창고 작업](../domain/warehouse-task.md) W10, [LOT 유효기한](../domain/lot-expiry.md) E1·E6 |
| 2ao | ~~설비 달력 동시 교체·삭제~~ | **완료(2026-10-04, 커밋 전).** 빈 달력의 동시 저장은 교대가 섞이고 삭제는 누락됨, 기존 달력은 뒤 요청이 409로 실패함을 통합 4건으로 재현. 설비별 advisory lock 뒤 현재 교대 조회로 교체·삭제를 직렬 처리. API 형식·마이그레이션 변경 없음. 동시성 통합 4건·전체 백엔드 1,012건 실패 0과 커버리지 기준 통과 | [설비 달력](../domain/equipment-schedule.md) S6 |
| 2ap | ~~재고 화면 넓은 창 넘침~~ | **완료(2026-10-04, 커밋 전).** 프런트만. Stock 탭 왼쪽 칸(표들)이 Add Stock 칸을 화면 밖으로 밀던 것을 `minmax(0, 1fr)`와 칸 안 가로 스크롤로, 검사 기준 추가 폼이 280px 칸보다 넓던 것을 폼 열 `minmax(0, 1fr)`와 재고 화면 select `max-width: 100%`로 고침. 1280·375px에서 13개 탭 모두 문서 너비가 창 너비 이하, 콘솔 오류 0, E2E 34건 통과 | [창고 작업](../domain/warehouse-task.md) W9 화면 |
| 2aq | ~~열린 피킹의 준비 수량 정합성~~ | **완료(2026-10-05, 커밋 전).** 계획 뒤 만료·격리·일부 출고된 출발 재고가 기존 작업 수량 그대로 준비됨으로 계산되는 문제 3건을 재현(수정 전 실패). 출발 행별 작업 수량 합계와 현재 가용량 중 작은 값만 반영하고 사용 불가 LOT·준비 위치 재고의 이중 계산 제외. 정상 LOT·재요청 중복 방지·기존 작업 보존 포함 준비 수량 통합 7건과 전체 1,016건 실패 0·커버리지 기준(81.01%) 통과. API·마이그레이션 변경 없음 | [창고 작업](../domain/warehouse-task.md) W11 |
| 2ar | ~~창고 스캐너 최신 작업·키보드 흐름~~ | **완료(2026-10-05, 커밋 전).** 선택 작업은 복사본 대신 ID로 최신 열린 목록에서 읽음. 위치 변경·부분 완료·취소 반영, Enter로 도착 입력에 포커스·완료 중 입력 잠금·휴대 기기에서 다음 품목 입력 복귀. 완료 알림은 실제 서버 응답 수량 사용. 모델 단위 4건 추가(해당 파일 15건), 가짜 API 브라우저 재현 후 수정 | [창고 작업](../domain/warehouse-task.md) W8·W9 |
| 2as | ~~스캐너 도착 코드 서버 확인~~ | **완료(2026-10-05, 커밋 전).** 완료 요청의 선택 필드 `expectedToLocation`을 프로젝트 잠금 안에서 대조. 변경됐다면 409로 이동 없이 거절, 빈 값·100자 초과는 400. 거절 뒤 화면은 최신 작업을 다시 조회. 통합 7건(수정 전 4건 실패) 통과. 기존 일반 완료·부분 완료 요청 호환, 마이그레이션 없음. 전체 백엔드 1,023건 실패 0·커버리지 81.02%, 프런트 421건·타입·린트·빌드, 관련 가짜 API E2E 7건 통과 | [창고 작업](../domain/warehouse-task.md) W12 |
| 2at | ~~실사 입력 기준 고정·사라진 행 방어~~ | **완료(2026-10-05, 커밋 전).** 입력·CSV 불러오기의 첫 장부 수량을 재조회 뒤에도 유지(0 포함). 입력한 행이 없어지면 전체 요청을 막고 Clear counts로 명시적 재실사. 변경 안내·첫 기준 차이 표시·적용 중 입력 잠금. 모델 6건 추가(실사 13·시트 3), 전체 프런트 427건·타입·린트·빌드·가짜 API E2E 3건 통과. 모델 라인 100%·분기 97.77%, 서버·마이그레이션 없음 | [재고 실사](../domain/stock-count.md) C11·C12 |
| 2au | ~~재고 입고·이동 응답 유실 재시도 보호~~ | **완료(2026-10-05, 커밋 전).** 미확인 요청별 키를 메모리에 유지, 입력 변경은 새 명령, 성공 뒤 같은 내용의 새 거래 허용. 저장 중 입력 잠금·연결 실패 결과 미확인 안내. 공통 명령 단위 6건·커버리지 100%, 가짜 API E2E 2건, 전체 프런트 433건·타입·린트·빌드 통과. 최초 선택자 오류는 바로잡고 수정 전 두 실제 키 불일치 실패를 확인. 페이지 재열기까지 영구 유지하지는 않음 | [재고 계약](../domain/inventory-bom-lot-contract.md) §2, [재고 이동](../domain/stock-transfer.md) T12 |
| 2av | ~~FEFO 출고·예약 응답 유실 재시도 보호~~ | **완료(2026-10-05, 커밋 전).** 프로젝트를 포함한 미확인 요청별 키 유지, 성공 확인 뒤 새 명령, 저장 중 입력 잠금·연결 오류 안내. FEFO mutation 4건(프로젝트 전환·오류 envelope 포함), 공통 명령과 합계 10건·대상 커버리지 100%, 관련 브라우저 2건과 재고 합동 4건 통과. 전체 프런트 437건·타입·린트·빌드 통과. 페이지 재열기 영구 복원·실행 투입·실사·폐기 키 정책은 포함하지 않음 | [LOT 유효기한](../domain/lot-expiry.md) X11·FEFO 화면 재시도 |
| 2aw | ~~실사 미확인 요청 복구·중첩 비교~~ | **완료(2026-10-05, 커밋 전).** 실사 키 유지, ID 순서 전송, 다른 센 수량·기준 수량 구분. 연결 오류에 재시도 안내. 중첩 비교 3건·실사 mutation 3건 추가, 전체 프런트 443건·타입·린트·빌드, 실사 브라우저 5건 통과. 거래 없는 실사 replay 한계는 별도 기록 | [재고 실사](../domain/stock-count.md) C13 |
| 2ax | ~~만료 폐기 결과 유지·원래 요청 복구~~ | **완료(2026-10-05, 커밋 전).** 목록 갱신 뒤 결과·재시도 상태 유지, 원래 LOT 집합·닫기 옵션 고정, 미확인 옵션 잠금, 확인 후 결과 초기화. 폐기 mutation 3건, 가짜 API 4건 통과. 서버·개발 DB·마이그레이션 없음 | [LOT 유효기한](../domain/lot-expiry.md) W6 |
| 2ay | ~~게이트웨이 실패의 저장 미확인 안내~~ | **완료(2026-10-05, 커밋 전).** 재고·FEFO·실사에서 HTTP 500 이상에도 미확인·같은 값 재시도 안내. 업무 400·409는 기존 거절 처리. 503 저장 후 실패 사례 6건을 수정 전 재현. 전체 프런트 446건·타입·린트·빌드, 관련 가짜 API 19건·명령/mutation 19건·80% 커버리지 기준 통과(라인 94.73%, 분기 84.61%) | [재고 계약](../domain/inventory-bom-lot-contract.md) §2, 실사 C13·폐기 W6 |
| 2az | ~~실사 행 삭제 뒤 원래 요청 복구~~ | **완료(2026-10-05, 커밋 전).** 미확인 실사의 원래 줄·메모 재전송, 수량·파일·메모 잠금. 새 실사 누락 거절은 유지. 연결·503 행 삭제 2건 수정 전 실패, 실사 재시도 6 + 기존 갱신 3건 통과 | [재고 실사](../domain/stock-count.md) C14 |
| 2ba | ~~실사 CSV 중복·비동기 읽기 방어~~ | **완료(2026-10-05, 커밋 전).** 중복 센 행 파일 거절, 읽기 중 제출 잠금·취소·오래된 완료 무시, 실패 안내와 입력 보존. 단위 중복 2·브라우저 3 실패 재현 후 수정. 시트 단위 6·관련 브라우저 12, 전체 프런트 449·타입·린트·빌드 통과 | [재고 실사](../domain/stock-count.md) C15 |
| 2bb | ~~빈 포장 입고 입력의 옛 환산량 제거~~ | **완료(2026-10-05, 커밋 전).** 포장 수 비우기·음수에서 Quantity 초기화. 브라우저 2건 수정 전 50 잔류 재현. 직접 수량·분수 포장·잘못된 입력 요청 0 포함 3건, 기존 재시도와 7건 통과 | [품목 상세](../domain/item-details.md) 입고 환산 입력 동기화 |
| 2bc | ~~일괄 입고 파일 선택·검사 경합 방어~~ | **완료(2026-10-05, 커밋 전).** 선택 세대로 늦은 파일·검사 응답 무시, 검사 중 Cancel·읽기 오류 안내·실제 입고 중 파일/메모/취소 잠금. 수정 전 5건 실패, 가짜 API 5건 통과 | [재고 일괄 입고](../domain/stock-import.md) S9 |
| 2bd | ~~일괄 입고 저장 미확인 재제출 차단~~ | **완료(2026-10-05, 커밋 전).** requestId 없는 입고의 연결·503 뒤 재제출 잠금·이력 확인 안내. Cancel은 거래를 취소하지 않음. 업무 409 복구 유지. 수정 전 유실 2건 실패, 3건 및 파일 경합 합계 8건 통과. 프런트 전체 449·타입·린트·빌드 | [재고 일괄 입고](../domain/stock-import.md) S10 |
| 2be | ~~CSV 중복 필드 열 거절~~ | **완료(2026-10-05, 커밋 전).** 실사·품목·입고 CSV의 중복 의미 열(별칭·대소문자 포함)을 파일 오류로 거절. 수량·ID·단가·바코드·위치 잘못 선택 8건 및 화면 2건 수정 전 실패. 모델 21건·라인 100%·분기 80.80% 기준, 가짜 API 10건·전체 프런트 457·타입·린트·빌드 통과 | [실사](../domain/stock-count.md) C16, [입고](../domain/stock-import.md) S11, [품목 가져오기](../domain/item-import.md) I11 |
| 2bf | ~~품목 CSV 파일·검사 경합 방어~~ | **완료(2026-10-05, 커밋 전).** 오래된 읽기·검사·오류 무시, 검사 중 취소, 읽기 오류 안내, 저장 중 파일/취소 잠금과 제출 방어. 테스트 변수명 오류 수정 뒤 실제 업무 5건 실패 재현. 가짜 API 6건·프런트 전체 457·타입·린트·빌드 통과 | [품목 가져오기](../domain/item-import.md) I12 |
| 2bg | ~~BOM 자재 CSV 파일·교체 옵션 경합 방어~~ | **완료(2026-10-05, 커밋 전).** 최신 파일·옵션의 검사만 표시, 읽기 중 현재 옵션 반영·검사 취소·읽기 오류 안내·저장 중 파일/옵션/취소 잠금. 수량·단위·type 별칭 중복 거절. 모델 14건·라인 100%·분기 93.47%, 모의 API 8건·전체 프런트 460·타입·린트·빌드 통과. 실제 BOM 생성·삽입 없음 | [품목·BOM 가져오기](../domain/item-import.md) BOM 자재 CSV 파일·교체 옵션 방어 |
| 2bh | ~~D+ 과거 단가 공개 Query~~ | **완료(2026-10-05, 커밋 전).** 품목·이력 일괄 조회, 프로젝트 격리·삭제 품목 과거 참조, 시각 이하 단가와 추정 구분, 과거 모름 유지·동일 시각 충돌 처리. 단위 15·격리 통합 3, 전체 백엔드 1,041건·커버리지 기준 통과. 실행 API 연결은 다음 단계 | [재료비](../domain/material-cost.md) D+ 1단계 |
| 2bi | ~~승인 작업지시 일정 변경~~ | **완료(2026-10-05, 커밋 전).** owner 명령·V52 이력, 시작일 보호·기존 날짜 대조·재송신·원자적 저장, Schedule 화면. 격리 통합 23·날짜 단위 4·모의 API 브라우저 4, 전체 백엔드 1,064·커버리지·빌드 및 프런트 464·타입·기존 lint·빌드 통과. 개발 DB 적용 없음 | [설비 일정](../domain/equipment-schedule.md) 승인 일정 변경 구현 |
| 2bj | ~~D+ 원가 조회·기준 표시~~ | **조회·화면 단계 완료(2026-10-05, 커밋 전).** V1 종료 시각 열 mapping, 완료 시각 단가/추정 응답·줄별 기준·화면. 기존 저장소 2개 제거(자동 동결 84→82). 신규 통합 6, 전체 백엔드 1,070·커버리지·빌드, 프런트 469·모의 API 브라우저 3·타입·기존 lint·빌드 통과. **새 마감 시각 기록은 미완료** | [재료비](../domain/material-cost.md) D+ 2단계 |
| 2bk | ~~서버 실사 계획·블라인드·행별 재실사~~ | **완료(2026-10-05, 커밋 전).** V53 격리 SQL 롤백, 원본 snapshot·checkpoint·권한 마스킹·행 version·재계수·일괄 저장·동시 키/제출. 통합 14 포함 전체 백엔드 1,084·실패 0·라인 81.29%·분기 67.65%·기준/빌드, 프런트 472·타입·기존 lint·빌드, 모킹 E2E 6 통과 | [실사](../domain/stock-count.md) 확정 A |
| 2bl | ~~예약 유지 위치 이동~~ | **완료(2026-10-05, 커밋 전).** 공개 Command·동일 트랜잭션·전체/부분 이동·재송신·사칭 방어·화면. 통합 9 포함 전체 백엔드 1,093 실패 0·라인 81.34%·분기 67.60%·기준/빌드, 프런트 472·타입·기존 lint·빌드·모킹 E2E 3 통과 | [할당](../domain/stock-allocation.md) 확정 B |
| 2bm | ~~자동 예약 우선 피킹~~ | **완료(2026-10-05, 커밋 전).** V54 격리 SQL 롤백 후 추가, 자기 할당 우선·일반 재고 보충·부분 이동·해제 거절·4자리 정밀도. 통합 6 포함 전체 백엔드 1,099 실패·오류·건너뜀 0·라인 81.39%·분기 67.74%·기준/빌드, 프런트 473·타입·기존 lint·빌드·관련 모킹 E2E 18(예약 피킹 2) 통과 | [할당](../domain/stock-allocation.md)·[창고 작업](../domain/warehouse-task.md) |
| 3 | 조직 Phase 1~3(`organization`·`organization_member`·`project.organization_id`) | ADR-001 Accepted(2026-10-05). 구현 순서는 사용자 확정 목록에 따름. 새 번호는 직전 재확인 | [ADR-001](../architecture/adr/ADR-001-organization-project-boundary.md), 결정 인계 §6-6 |
| 4 | 리본 마이그레이션 Step 3 리뷰 → Step 6(`workspace-topbar` 버튼 영역 제거) | Step 3 리뷰 | [editor/current-state](../editor/current-state.md) §8, [리본 계획](../editor/toolbar_ribbon_migration_plan.md) §7 |

2026-10-02에 끝난 아키텍처 작업(결정 인계 §6-1~4): ADR 3개, 공개 API 기준 구현(`CatalogQuery`·`FlowRunCommand`), ArchUnit 기준선, `resourceType` registry 경고.

## 3. 확정된 결정과 남은 확인

2026-10-05 사용자 첨부의 최종 결정은 [DECISIONS-2026-10-05](DECISIONS-2026-10-05.md)에 기록했다. 이전 Proposed 권장안과 다른 부분은 최종 결정이 우선한다. **승인 ≠ 구현 완료.**

| 항목 | 결정 | 구현·확인 상태 |
|---|---|---|
| 실행 원가 | D+ Accepted | actualEndAt 기록·historical price 조회·추정 표시 구현 순서 1 |
| 시간대 | 프로젝트별 IANA Zone, 기존 Asia/Seoul | 구현 순서 2 |
| 작업지시 일정 / 피킹 / 실사 | C / B / A + 계획별 blind, owner 기준 수량 열람 | 구현 순서 3~5 |
| 유효일 BOM / 팬텀 | 기간 비중첩 다중 승인·자동 retire 금지 / BomLine.phantom | 구현 순서 6~7 |
| Setup / 부산물 / 첨부 | 다차원 속성·별도 비용 / 별도 가치 / Local-S3 추상화 | 구현 순서 8~9 |
| 조직 | ADR-001 Accepted, 업무 접근 상속 없음, metadata·탈퇴 정책 확정 | Phase 1~3와 권한 회귀 미구현 |
| 모듈·포트 | ADR-002/003 기존 원칙 유지, ADR-005 Accepted | 비제조 quantity/unit 선택 전환 미구현 |
| 실행 정책 | ADR-004 Accepted, workflowRevision + node | timeout·delay·concurrency 미구현 |
| 협업 / 역할 | 요소별 optimistic patch / 초기 viewer-editor-owner 확정 | 적용 범위 확인, CRDT Deferred |
| 범용 실행 | backend integration VALIDATED / 제품 PARTIALLY VALIDATED | 전체 실제 API 브라우저 흐름 구현 순서 10 |
| D2 집계 | 기존 15건 중 확인 14(조건부 포함), 품목 삭제 방어 1건 확인 중 | 이전 보고가 품목 삭제를 완료 실행 보정으로 잘못 집계. 완료 실행 보정은 별도로 승인됨. 회신 전 15/15로 표시하지 않음 |
| 운영 | 기존 DB validate·STOMP 보안·부하·접근성 실사용 검증 | 오래된 D4~D6 기록은 현재 상태 재확인 필요 |
| 기존 테스트 BOM | 유지·정리 선택 | 참조 관계 확인·사용자 결정 전 삭제 금지 |

Tenant·Site·거래처·조직 이동/삭제·노드 실행기·세분화 역할·배출량 모델은 별도 후속 범위다. Outbox·Microservices는 Deferred. 승인된 범위를 결정 대기로 다시 막지 않는다.

## 4. 기능 쪽 남은 큰 덩어리

> 아래는 2026-10-03 조사 이력이다. 원가·피킹·실사·첨부·시간대·setup·부산물·유효일·팬텀의 정책 선택은 §3에서 확정됐으며, 남은 일은 구현·도메인 공개 API·회귀 검증이다. 예전 "결정 대기" 표현으로 재승인을 요구하지 않는다.

세부 남은 범위는 [CURRENT_CAPABILITIES](CURRENT_CAPABILITIES.md)의 각 행과 "원래 백로그 대비 현황"에 있다.

- 미착수: FM-PLAN-001 Operation Type, FM-INT-001~003 외부 연동, FM-AI-001~003
- 일부: FM-RUN-005 실행 정책(시간 제한·재시도 간격·동시 실행 제한), FM-PLAN-002 용량 자원, FM-PLAN-003 달력(작업자 달력. 하루 여러 교대는 V43, 날짜별 교대·설비별 휴일은 V45로 끝)
- 실행 원가 저장(`production_run.total_material_cost`·`cost_per_unit`, 열은 있음): 마감 때 채우려면 `ProductionRunServiceImpl`을 고쳐야 하고, ADR-002 Stage B로 그 파일의 다른 도메인 저장소 6줄(workflow 4, catalog 1, inventory 1)을 공개 API로 옮겨야 한다. workflow·inventory 공개 API를 새로 만드는 일이라 따로 잡는다 2026-10-03 확인: (1) 그 파일은 규칙 엔진에 `workflow`·`item`·`process`·`processIo`·`inventory` 엔티티를 사실(fact)로 넘기고, 엔진은 `objectMapper.convertValue`로 모든 필드를 읽는다. 공개 API의 좁은 뷰로 바꾸면 기존 규칙식이 보던 필드가 사라질 수 있어, Stage B는 사실의 모양을 그대로 지키는 방법(소유 도메인이 사실 맵을 만들어 주는 연산 등)을 먼저 정해야 한다. (2) 마감 때 저장하는 값이 무엇인지(마감 시점 단가로 고정한 금액인가, 마감 뒤 보정 전표가 기록을 바꾸면 다시 계산하는가)는 원가 정책이라 §3 결정 대기에 올렸다
- 에디터 결정 7개 중 명령 스택·모델링 서비스·규칙 레지스트리·도구 레지스트리

### 재고·생산·품질 쪽 남은 후보와 막힌 까닭 (2026-10-03 정리)

도메인 문서의 "이후" 항목 중 결정 없이 할 수 있는 것은 2026-10-03에 대부분 끝냈다(§2 2a–2al). 남은 것은 아래처럼 결정이나 큰 구조 작업이 먼저다.

| 항목 | 막힌 까닭 | 근거 문서 |
|---|---|---|
| 실행 원가 저장, 단가 이력으로 과거 금액 계산(끝난 실행·실사 차이) | 어느 시점 단가를 쓸지(§3 "실행 원가 저장 시점") | [재료비](../domain/material-cost.md) |
| 할당된 재고를 먼저 집는 피킹, 투입 취소 때 재할당 | 할당은 production, 피킹·재고 행 잠금은 inventory라 어느 쪽이 다른 쪽을 부를지(의존 방향). `StockAllocationService`는 inventory 저장소로 행을 잠그고 고르므로 Stage B에 inventory 공개 API(행 잠금·후보) 설계가 먼저 | [재고 할당](../domain/stock-allocation.md), [ADR-002](../architecture/adr/ADR-002-module-dependency.md). 선택지·권장안: [결정 메모](../domain/stock-allocation.md#결정-메모-할당된-재고를-먼저-집는-피킹-proposed-2026-10-03)(Proposed) |
| ~~재고 있는 위치의 코드 바꾸기(L7 풀기)~~ | **풀림(2026-10-03, §2 2al).** 재고 행을 새로 만드는 곳이 모두 inventory 안(Add Stock·가져오기·이동 도착 행)이라 `ProductionRunServiceImpl`을 고칠 필요가 없었다. 위치 코드별 잠금으로 해결 | [보관 위치](../domain/storage-location.md) L7 |
| 작업 지침 이미지·파일 첨부 | `global/storage`는 일부러 잡아 둔 뼈대(사용 안 함). 저장 위치(로컬·S3), 내려받기 권한·크기 제한을 정해야 한다 | [작업 지침](../domain/work-instruction.md). 선택지·권장안: [결정 메모](../domain/work-instruction.md#결정-메모-이미지파일-첨부-proposed-2026-10-03)(Proposed) |
| 공정(노드)별 작업 지침·검사 기준 | 공정 단계 실행(`flow_run_step`)과 잇는 일이라 flow-run 구역과 함께 정해야 한다 | [작업 지침](../domain/work-instruction.md), [검사 기준](../domain/inspection-standard.md) |
| 블라인드 실사·실사 계획 | 지금 실사는 센 사람이 본 수량(C3)으로 동시 이동을 막는다. 수량을 숨기면 기준 시점을 계획에 저장하는 새 모델이 필요 | [재고 실사](../domain/stock-count.md). 선택지·권장안: [결정 메모](../domain/stock-count.md#결정-메모-블라인드-실사와-실사-계획-proposed-2026-10-03)(Proposed) |
| setup 묶음·전환 비용, 부산물 가치·배출 종류, 유효일 BOM·팬텀 반제품 | 제품 규칙(무엇으로 묶을지, 금액을 어디에 더할지, revision을 날짜로 고를지)이 먼저. 일부는 D2 대기 항목과 겹침 | 각 도메인 문서 "이후". 선택지·권장안: [전환](../domain/equipment-changeover.md#결정-메모-setup-묶음과-전환-비용-proposed-2026-10-04), [부산물](../domain/bom-by-products.md#결정-메모-부산물-가치와-배출-proposed-2026-10-04), [BOM](../domain/multi-level-bom.md#결정-메모-유효일-bom과-팬텀-반제품-proposed-2026-10-04) 결정 메모(Proposed) |
| 프로젝트별 시간대(유효기한·설비 날짜) | 프로젝트 설정 추가가 먼저(project 구역) | [유효기한](../domain/lot-expiry.md). 선택지·권장안: [결정 메모](../domain/lot-expiry.md#결정-메모-오늘을-정하는-시간대-proposed-2026-10-04)(Proposed) |

## 5. 사용자가 하는 일

- 브랜치 생성·커밋·푸시. Agent는 하지 않는다.
- docs 커밋·푸시. 2026-10-02에 docs의 md 120개 전부를 `git add -f`로 스테이징해 두었다(코드 변경은 스테이징하지 않음).
