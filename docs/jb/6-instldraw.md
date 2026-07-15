# jsventures/instldraw

- **주소**: https://github.com/jsventures/instldraw
- **인기도**: 약 107 Star (소규모 예시/데모 프로젝트)
- **주요 언어**: TypeScript

## 한 줄 정의
> tldraw + **InstantDB**(실시간 동기화가 내장된 백엔드 서비스)를 결합해서 만든 "팀 단위 화이트보드" 예시 프로젝트.

## 무엇을 제공하나
- 매직 코드(이메일로 받은 코드 입력) 로그인
- 팀 / 멤버십 / 초대 데이터 모델과 권한 관리
- 실시간 커서 공유(누가 어디를 보고 있는지 표시)

Next.js 기반이며, tldraw 캔버스 상태를 InstantDB의 실시간 쿼리와 연결하는 방식(`useInstantStore`, `useInstantPresence`)을 보여줍니다.

## FlowMat 연관성
이 저장소는 "tldraw + InstantDB로 협업 화이트보드를 어떻게 조립하는지" 보여주는 **참고용 예제**에 가깝습니다. FlowMat은 Spring Boot + PostgreSQL 백엔드를 이미 갖추고 있고 REST API 기반 구조이므로, InstantDB라는 별도의 백엔드 서비스를 새로 도입할 이유가 없습니다. 코드 구조를 참고할 순 있어도, 그대로 가져다 쓰긴 어렵습니다.
