# FlowMat 문서 센터

> **현행 문서** · 최종 갱신 2026-10-02 · `docs/`는 지금 작업의 기준(지휘소)이면서 지난 기록의 보관소다. 처음이면 이 문서부터 읽는다.

## 1. 문서 등급 세 가지

문서의 등급은 **폴더가 정한다.** 같은 내용이 서로 다르면 위 등급이 이긴다.

| 등급 | 어디에 | 믿어도 되나 | 갱신 | 표시 |
|---|---|---|---|---|
| **현행** | `status/`, `architecture/`, `domain/`, `editor/`, `local-development.md`, 이 문서 | 작업 기준. 코드와 다르면 문서가 틀린 것이니 같은 변경에서 고친다 | 코드·결정과 함께 갱신 | `domain/`은 맨 위 `상태:` 줄, 나머지는 `현행 문서` 표시나 확인일 |
| **참고** | `reference/` | 쓴 날 기준의 근거·조사. 틀렸다고 판정된 것은 아니지만 갱신하지 않는다 | 동결 | 맨 위 `참고 문서(동결)` |
| **보관** | `archive/` | 레거시. 구현·리팩토링으로 사실과 달라진 내용이 섞여 있다. 작업 근거로 쓰지 않는다 | 동결 | 맨 위 `보관 문서(레거시)` |

## 2. 지금 읽을 것

새로 합류했거나 다음 작업을 이어받는다면 이 순서로 읽는다. 세션 1 구역(재고·BOM·LOT·생산·품질·설비)을 이어받는 Agent는 [status/AGENT_HANDOFF.md](status/AGENT_HANDOFF.md)(맡는 구역, 할 일 순서, 지킬 것, 검증, 멈추는 조건)를 먼저 읽는다.

1. [status/WORKBOARD.md](status/WORKBOARD.md) — 지금 하는 일, 다음 일, 결정 대기.
2. [status/CURRENT_CAPABILITIES.md](status/CURRENT_CAPABILITIES.md) — 무엇이 구현됐고 무엇이 남았는가. 기능 상태의 기준.
3. [architecture/decision-handoff.md](architecture/decision-handoff.md) — 확정된 아키텍처 결정, 아직 정하면 안 되는 것, 다음 아키텍처 작업.
4. [local-development.md](local-development.md) — 로컬 실행(`dev` 프로필을 반드시 지정), DB·Redis, 테스트.
5. 맡은 영역의 문서(아래 §3).

## 3. 현행 문서 지도

| 폴더 | 내용 | 시작 문서 |
|---|---|---|
| [status/](status/) | 작업 현황판, 기능 기준선, Agent 인계 | [WORKBOARD](status/WORKBOARD.md), [CURRENT_CAPABILITIES](status/CURRENT_CAPABILITIES.md), [AGENT_HANDOFF](status/AGENT_HANDOFF.md) |
| [architecture/](architecture/README.md) | 결정 인계, ADR, 도메인 지도, 실행 모델 | [README](architecture/README.md) |
| [domain/](domain/README.md) | 기능별 계약·설계(재고·BOM·LOT·생산·품질·설비·공정 포트·revision·Flow Run). **파일을 옮기거나 이름을 바꾸지 않는다.** 코드 주석이 `docs/domain/*.md` 경로를 가리킨다 | [README](domain/README.md) |
| [editor/](editor/README.md) | 캔버스·도형 편집 엔진·리본 | [current-state](editor/current-state.md) |
| [local-development.md](local-development.md) | 로컬 실행 | |

코드 주석이 가리키는 문서 경로: `docs/domain/*.md`, `docs/architecture/adr/*.md`, `docs/editor/toolbar_ribbon_migration_plan.md`, `docs/local-development.md`. 이 파일들을 옮기면 코드 주석도 같이 고친다.

## 4. 참고와 보관

- [reference/README.md](reference/README.md) — 결정의 논의 원문, 엔진 구현 지시서, 외부 벤치마크 4개.
- [archive/README.md](archive/README.md) — 2026-07 라이브러리 조사·상태 기록, 2026-08 에디터 계획·교대 기록, 2026-09 아키텍처 이전 판·인계·감사.

## 5. 충돌할 때 우선순위

1. 실제 DB migration과 코드
2. `domain/`의 계약·설계
3. `status/CURRENT_CAPABILITIES.md`
4. `architecture/`(그 안에서는 ADR과 `decision-handoff.md`가 우선), `editor/`
5. `reference/`
6. `archive/`, 저장소의 `legacy/`

## 6. 문서를 쓰고 옮기는 규칙

- 새 기능의 설계는 `domain/<주제>.md`에 쓴다. 맨 위에 `상태: **구현(날짜).** 출처: …` 줄을 두고 구현과 같은 변경에서 갱신한다. [domain/README.md](domain/README.md) 목록에 한 줄을 더한다.
- 기능 상태가 바뀌면 `status/CURRENT_CAPABILITIES.md`의 해당 행을, 작업을 시작·끝내거나 결정이 나면 `status/WORKBOARD.md`를 고친다.
- 아키텍처 결정은 ADR(`architecture/adr/`)로 남기고 `decision-handoff.md`에 반영한다. Accepted ADR은 고치지 않고 새 ADR로 대체한다. Proposed ADR은 수용 기준이 닫혀야 Accepted가 되며, 그 결정에 기대는 구현은 그 전에 시작하지 않는다.
- **결정 상태와 구현 상태는 따로 적는다.** 코드가 이미 그렇게 동작한다고 결정이 승인된 것은 아니고, 승인됐다고 구현된 것도 아니다. 문서를 정리하려고 대기 중인 결정을 승인으로 올리지 않는다.
- **현행 문서가 레거시가 되면**(구현으로 끝난 계획, 리팩토링으로 대체된 설계, 끝난 인계):
  1. `archive/<YYYY-MM-주제>/`로 옮긴다. git이 추적하는 파일은 `git mv`를 쓴다.
  2. 맨 위에 `보관 문서(레거시)` 표시를 넣는다.
  3. [archive/README.md](archive/README.md) 표에 한 줄을 더한다.
  4. 대체한 현행 문서에 "이전 판" 링크를 남긴다.
  5. 그 문서를 가리키던 현행 문서·코드 주석의 링크를 고친다.
- 근거로 계속 가치가 있지만 갱신하지 않을 문서는 `reference/`로 옮기고 `참고 문서(동결)` 표시를 넣는다.
- 참고·보관 문서는 내용을 고치지 않는다. 등급 표시와 깨진 링크만 고친다.
- 날짜는 절대 날짜로 쓴다. 문서에 숫자(건수·줄 수)를 쓸 때는 확인한 날짜와 기준 커밋을 함께 쓴다.

## 7. git과 `*.md` 규칙

`.gitignore` 50번째 줄의 `*.md`(비밀 파일 구역, 2026-09-24 커밋 `2bd69b0`에서 추가) 때문에, 그 뒤 새로 만든 md 파일은 git이 추적하지 않는다. `.gitignore`를 바꾸지 않고, 추적해야 할 문서는 `git add -f <경로>`로 의도적으로 추적 대상에 넣는다. 그러지 않으면 다른 Agent가 main을 checkout했을 때 그 문서를 볼 수 없다.

2026-10-02: docs의 md 120개 전부를 추적 대상에 넣었다. 먼저 아키텍처 결정 문서(ADR, 결정 인계, 논의 원문), 이어서 나머지 현행·참고·보관 문서를 `git add -f`로 넣었다. 커밋·푸시는 사용자가 한다.

**새 md 문서를 만들면 반드시 `git add -f <경로>`를 한다.** 그러지 않으면 `*.md` 규칙 때문에 조용히 git 밖에 남는다. 확인 방법:

```bash
for f in $(find docs -name '*.md'); do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "git 밖: $f"; done
```

2026-10-02 사용자 결정: `.gitignore`는 바꾸지 않는다. Agent는 `.gitignore`를 고치지 않고, git 밖 문서를 지우지 않는다(git 이력이 없어 되돌릴 수 없다). 이미 추적 중인 파일을 옮길 때는 `git mv`를 쓴다. 일반 `mv`로 옮기면 새 경로가 `*.md`에 걸려 추적이 끊긴다.
