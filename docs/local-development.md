# FlowMat 로컬 실행

## 준비

Java 21, Node 22, Docker Desktop을 사용한다. 기존 개발 DB는 V2·V4·V5 Flyway 체크섬 불일치로 기동이 막힐 수 있다. 기존 DB에 `repair`를 임의로 실행하지 말고 [해결안](handoff/reports/G-flyway-checksum-options.md)을 확인한다.

`flowmat_backend/.env.example`을 `flowmat_backend/.env`로 복사하고 `POSTGRES_PASSWORD`, `DB_PASSWORD`를 같은 로컬 비밀번호로 바꾼다. `JWT_SECRET`도 32자 이상의 별도 로컬 값으로 바꾼다. `.env`는 Git에 넣지 않는다. 새 DB를 만들 때만 아래 Compose 절차를 사용한다. 기존 5432/6379 서비스가 있다면 포트 충돌부터 확인한다.

```powershell
cd flowmat_backend
Copy-Item .env.example .env
# .env의 세 비밀값을 로컬 값으로 수정
docker compose up -d postgres redis
```

## 백엔드

PowerShell은 `.env`를 자동으로 환경변수로 내보내지 않는다. 파일 값을 읽어 현재 셸에 적용한다. 이 예제는 `KEY=VALUE` 형식만 받으며 명령을 평가하지 않는다.

```powershell
Get-Content .env | Where-Object { $_ -match '^[A-Z][A-Z0-9_]*=' } | ForEach-Object {
  $key, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($key, $value, 'Process')
}
.\gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

준비 상태는 `http://localhost:8080/api/actuator/health/readiness`로 확인한다. 새 dev DB에는 데모 계정 `demo-owner` / `demo1234`와 프로젝트 `prj_demo_main`이 생성된다. 기존 DB에서 데이터가 보이지 않는다면 시드 실행 여부를 확인한다.

## 프론트엔드

별도 PowerShell에서 다음을 실행한다.

```powershell
cd flowmat_frontend
npm ci
npm run dev
```

브라우저 주소는 `http://localhost:5173`이다. 변경 검증은 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`로 한다.

## 자주 나는 오류

| 증상 | 확인할 것 |
|---|---|
| `Migration checksum mismatch` | 기존 DB에 적용된 V2·V4·V5와 저장소 파일의 차이. 해결안 문서와 담당자 결정이 필요하다. |
| `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` 누락 | `.env` 작성 뒤 백엔드 셸에 환경변수를 내보냈는지 확인한다. |
| Compose에서 `Set POSTGRES_* in .env` | `flowmat_backend/.env` 파일 위치와 세 값을 확인한다. |
| 5432 또는 6379 포트 점유 | 이미 실행 중인 DB·Redis를 확인한다. 다른 DB를 쓸 경우 `DB_URL`도 맞춘다. |
| 첫 로그인 401 | 준비 상태 직후 데모 초기화가 끝나지 않았을 수 있다. 백엔드 로그의 초기화 완료를 확인하고 재시도한다. |

임시 DB를 사용할 때는 별도 컨테이너와 포트를 만들고 `DB_URL`을 그 포트로 바꾼다. 기존 개발 DB 볼륨을 지우지 않는다.
