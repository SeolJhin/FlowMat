# 같은 계정 로그인 중 로그아웃(401) — 인증 담당 전달

> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../../README.md), 이 폴더 안내는 [archive/README.md](../../README.md).

2026-09-24, 로컬 dev 백엔드(`:8080`)와 Vite(`:5173`)에서 Playwright로 재현. 토큰·쿠키 값은 기록하지 않았습니다.

## 결론

- **단일 로그인 정책이 아닙니다.** 서로 분리된 브라우저 컨텍스트에서 같은 계정으로 차례로 로그인하든 동시에 로그인하든 401이 나지 않습니다. refresh 토큰은 로그인마다 따로(`jti`별로) 저장됩니다.
- 로그아웃은 **같은 브라우저 안의 refresh 경합**에서 납니다.
  1. 같은 쿠키를 쓰는 탭 두 개가 동시에 refresh하는 경우
  2. refresh 응답이 도착하기 전에 페이지를 떠나는 경우
- 별개로, 로그인 횟수 제한(계정당 10분에 8회, IP당 12회)에 걸리면 **429 `RATE_LIMITED`**가 납니다. E2E를 다시 돌리면 쉽게 넘습니다.
- 실 API E2E의 `workers: 1`(`flowmat_frontend/playwright.config.ts`)은 이 문제가 해결될 때까지 **임시로 유지**합니다.

## 재현 결과

| 시나리오 | 결과 | refresh 호출 | 401 |
|---|---|---|---|
| 분리된 컨텍스트 2개, 차례로 로그인 후 각각 9회 페이지 이동 | 둘 다 로그인 유지 | A 9 / B 9, 모두 200 | 없음 |
| 분리된 컨텍스트 2개, 동시에 로그인 후 동시에 이동 | 둘 다 로그인 유지 | A 9 / B 9, 모두 200 | 없음 |
| 같은 컨텍스트, 탭 2개가 동시에 페이지 로드 | **두 탭 모두 로그아웃** | A 2 / A2 2 성공, A2의 3번째 실패 | `POST /api/auth/refresh` 401 `REFRESH_TOKEN_NOT_FOUND` (서버 로그) |
| refresh 요청은 서버에 도달(토큰 회전, 200), 응답이 오기 전에 페이지 이동 | **로그아웃** | 1회, 응답이 페이지에 전달되지 않음 | **없음** — 다음 페이지가 refresh 없이 로그인 화면으로 이동 |
| 10분 안에 같은 계정으로 9번째 로그인 | 로그인 실패 | – | 401 아님, `POST /api/auth/login` 429 `RATE_LIMITED` |

refresh 중 페이지 이동은 이렇게 재현했습니다. 실제 네트워크 지연이 있을 때와 같은 상황입니다.

```js
// 첫 refresh는 서버에 보내 응답(Set-Cookie 포함)을 받되 800 ms 붙잡아 두고, 그 사이 페이지를 떠납니다.
let held = 0
await page.route('**/api/auth/refresh', async (route) => {
  if (held++ > 0) return route.continue()
  const response = await route.fetch()
  await new Promise((r) => setTimeout(r, 800))
  await route.fulfill({ response }).catch(() => {}) // 페이지가 이미 떠나 응답이 버려짐
})
const sent = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/auth/refresh')
await page.goto('/projects/prj_demo_main/inventory', { waitUntil: 'commit' })
await sent
await page.goto('/projects/prj_demo_main/runs', { waitUntil: 'commit' })
// → 로그인 화면(/), localStorage 'flowmat_refresh_cookie' = null
```

## 원인 (추정, 코드 근거)

- **서버: refresh 토큰은 한 번만 쓸 수 있습니다.** `AuthRedisStore.consumeRefreshToken`이 `getAndDelete`로 꺼내고 `AuthServiceImpl.refresh`가 새 토큰을 발급합니다. 이미 쓴 토큰으로 다시 요청하면 `REFRESH_TOKEN_NOT_FOUND`(401)입니다.
- **프론트: refresh를 하나로 묶는 범위가 탭 하나뿐입니다.** `entities/auth/lib/authSession.ts`의 `refreshPromise`는 모듈 변수라 탭끼리는 조율되지 않습니다. 같은 쿠키를 가진 두 탭이 동시에 refresh하면 한쪽이 401을 받습니다.
- **프론트: 실패하면 탭들이 함께 쓰는 세션 힌트를 지웁니다.** `performRefresh`는 401뿐 아니라 요청 중단·네트워크 오류(`catch`)에도 `tokenStorage.clear()`를 부릅니다. 이 함수는 탭들이 함께 쓰는 `localStorage`의 `flowmat_refresh_cookie`를 지우므로 다른 탭도 다음 페이지 로드부터 로그아웃됩니다.
- access token은 메모리에만 있어서 **페이지를 완전히 새로 불러올 때마다 refresh가 한 번씩 일어납니다.** 페이지 이동이 잦을수록 경합 기회가 많아집니다.

## 이렇게 하지 마세요

**"네트워크 오류일 때는 세션 힌트를 지우지 않는다"만 바꾸는 것은 해결이 아닙니다.** 서버가 이미 토큰을 회전했는데 브라우저가 새 쿠키를 받지 못했다면, 브라우저에 남은 이전 쿠키는 이미 무효입니다. 힌트를 남겨도 다음 refresh가 401을 받으므로 복구되지 않습니다.

## 해결 순서 (권장)

1. **탭 간 refresh 조율을 먼저 합니다.** 한 번에 한 탭만 refresh하고, 나머지 탭은 그 결과를 이어받게 합니다. 예: `navigator.locks`로 직렬화한 뒤 잠금을 얻으면 쿠키가 이미 바뀌었는지 확인하거나 `BroadcastChannel`로 새 access token을 전달합니다.
2. **회전됐지만 응답을 잃은 경우의 복구를 설계합니다.** 선택지 예시:
   - 서버가 방금 소비한 `jti`를 짧은 시간 후속 토큰과 연결해 두고 같은 결과를 다시 돌려주는 방식
   - 재사용 감지(`TOKEN_REUSE_DETECTED`는 `ErrorCode`에 있으나 쓰이지 않음)와 함께 정책을 정하는 방식

   보안 절충(재사용 허용 시간, 탈취 감지)이 걸려 있으니 인증 담당이 결정합니다.
3. 세션 힌트를 지우는 조건은 위 두 가지가 정해진 뒤에 정리합니다.

## 검증해야 할 것 (각각 따로)

| # | 시나리오 | 통과 기준 |
|---|---|---|
| 1 | 같은 컨텍스트의 탭 2개가 동시에 refresh | 두 탭 모두 로그인 유지, refresh 401 없음 |
| 2 | refresh 응답 전에 페이지 이동(위 `page.route` 방식) | 이동한 페이지에서 세션 유지 |
| 3 | 2 이후 다음 API 요청 | 추가 로그인 없이 성공 |
| 4 | 분리된 컨텍스트 2개(회귀) | 지금처럼 401 없음 |

## E2E `storageState` 재사용 시 주의

- `storageState`는 쿠키와 `localStorage`만 저장합니다. **access token은 메모리에 있어서 저장되지 않으므로**, 새 페이지를 열 때마다 refresh가 일어나고 토큰이 회전합니다.
- 여러 worker가 **같은 `storageState` 파일(같은 refresh 쿠키)**을 쓰면 첫 worker의 refresh가 토큰을 회전시키고 나머지는 401을 받습니다. 위의 탭 경합과 같은 구조입니다. worker마다 따로 로그인한 상태를 쓰거나 worker별 테스트 계정을 두어야 합니다.
- worker마다 로그인해도 **로그인 횟수 제한(계정당 10분 8회, IP당 12회)**에 걸릴 수 있습니다. worker 수 × spec 파일 수 × 재시도 횟수를 제한 안에 맞추거나, worker별 계정 또는 테스트 프로필 전용 제한값을 정해야 합니다.
- 해결 전까지 `REAL_API_E2E`의 `workers: 1`은 유지합니다.
