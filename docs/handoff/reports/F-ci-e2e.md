# F. CI 브라우저 E2E

**한 줄 결론:** CI 구성은 실 API E2E를 실행하지만, 로컬 재현에서 BOM·LOT 시나리오가 로그인 대기 조건 때문에 실패했다.

## 한 것 / 못 한 것

- `.github/workflows/browser-e2e.yml`을 읽었다. Postgres 16·Redis 7.4 서비스, 백엔드 기동, `REAL_API_E2E=1`인 `backend-contract.spec.ts`와 `bom-lot-flow.spec.ts` 별도 실행, 실패 시 백엔드 로그·Playwright 결과 업로드가 있다.
- 워크플로 파일은 다른 작업자가 수정 중이므로 편집하지 않았다. 별도 일회용 Postgres 16 + Redis + dev 백엔드 + Playwright Chromium으로 두 파일을 로컬 실행했다. `backend-contract.spec.ts`는 통과, `bom-lot-flow.spec.ts`는 30초 시간 초과로 실패했다. 일회용 백엔드·DB는 종료했다.
- 실패 화면은 `/` 로그인 폼이다. `bom-lot-flow.spec.ts:19`의 `getByRole('button', { name: 'Log in' }).toHaveCount(0)`는 제출 직후 버튼 문구가 `Working...`으로 바뀌는 순간에도 참이 된다. 실제 로그인 완료 전 `page.goto('/projects/.../inventory')`가 실행되어 보호 라우트에서 `/`로 돌아간 것으로 보인다. 백엔드 로그에는 계약 테스트의 로그인 요청만 있었다. **이 원인은 브라우저 스냅샷·로그·컴포넌트 동작을 연결한 추론**이며, 테스트 코드의 로그인 완료 대기 조건을 강화해 재실행해야 확정된다. 현재 테스트 파일은 다른 담당 작업물이라 수정하지 않았다.

## 사람 결정이 필요한 것

- 없음. 실패는 테스트 코드 수정과 재실행으로 확인할 수 있다.

## 다른 담당에게 넘길 것

- **BOM·LOT E2E 소유자:** 로그인 뒤 `Working...` 버튼 상태 대신 로그인된 화면의 고유 요소 또는 인증 API 성공을 기다리고, 재실행한다.
- **CI 소유자:** 현 워크플로의 아티팩트 업로드는 이미 있다. E2E 수정 후 잡 결과를 확인한다.
