# 참고 문서 (동결)

결정의 논의 원문, 구현 지시서, 외부 비교 조사다. **갱신하지 않는다.** 틀렸다고 판정된 것은 아니지만, 쓴 날의 코드와 판단을 담고 있다. 현행 문서와 다르면 현행 문서가 우선한다. 지금 기준은 [docs/README.md](../README.md)에서 시작한다.

| 문서 | 쓴 날 | 무엇의 근거인가 | 현행 문서 |
|---|---|---|---|
| [architecture/FlowMat_Architecture_refactoring_Handoff.md](architecture/FlowMat_Architecture_refactoring_Handoff.md) | 2026-10(코드 `6c383d4` 기준), 2026-10-02 보완 표시 | Organization/Project, 모듈 경계, Port/Resource, FlowRun 결정의 시나리오 비교와 상세 근거 | [결정 인계](../architecture/decision-handoff.md), [ADR](../architecture/adr/README.md) |
| [editor/FlowMat_Editor_Engine_Implementation_Directive.md](editor/FlowMat_Editor_Engine_Implementation_Directive.md) | 2026-08-12 | 도형 편집 엔진의 방향과 단계별 지시 | [editor/current-state](../editor/current-state.md), [ADR-0001](../editor/adr-0001-flowmat-editor-core-boundary.md) |
| [benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md](benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md) | 2026-09-24 | 외부 저장소 50개 비교와 FM-* 기능 25개("원래 백로그"). 많은 `domain/` 문서의 "출처" | [CURRENT_CAPABILITIES](../status/CURRENT_CAPABILITIES.md) "원래 백로그 대비 현황" |
| [benchmarks/FlowMat-50-repo-code-review.md](benchmarks/FlowMat-50-repo-code-review.md) | 2026-09-27, 2026-09-30 갱신 | 위 50개 후보의 실제 코드 대조, 당시 검증 기록 | 같음 |
| [benchmarks/FLOWMAT_ARCHIFY_FULL_CODEBASE_BENCHMARK.md](benchmarks/FLOWMAT_ARCHIFY_FULL_CODEBASE_BENCHMARK.md) | 2026-09-27 | Archify와 비교한 그래프 IR·검증 계층·진단 설계안 | [포트·연결 계약](../domain/process-port-connection-contract.md), [ADR-003](../architecture/adr/ADR-003-resource-port-contract.md) |
| [benchmarks/enterprise-system-references.md](benchmarks/enterprise-system-references.md) | 2026-09-24 | Flowable·Conductor·bpmn-js·OpenWMS·frePPLe·metasfresh에서 가져올 패턴 | [도메인 지도](../architecture/domain-map.md) |

## 규칙

- 내용을 고치지 않는다. 고칠 수 있는 것은 맨 위 등급 표시와, 파일이 옮겨져 깨진 링크뿐이다.
- 여기 문서의 제안을 구현하려면 먼저 현행 문서(결정 인계, ADR, domain 계약)에 결정으로 옮긴다. 여기 문서를 바로 구현 지시로 쓰지 않는다.
- 근거로서의 가치가 끝난 문서(예: 대체된 계획)는 `archive/`로 옮긴다.
