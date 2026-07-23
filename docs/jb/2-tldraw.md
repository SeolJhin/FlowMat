# tldraw/tldraw

- **주소**: https://github.com/tldraw/tldraw
- **인기도**: 약 4.7만 Star, 3.2천 Fork
- **라이선스**: 자체 "tldraw 라이선스" (개발 중엔 무료, **상업적 프로덕션 배포 시 별도 라이선스 키 필요**)
- **주요 언어**: TypeScript

## 한 줄 정의
> **무한 캔버스 화이트보드 SDK**. 여기서 "SDK"는 완성된 제품이 아니라, 화이트보드 기능을 내 앱에 갖다 붙일 수 있게 만든 부품 세트를 뜻합니다.

## 무엇을 제공하나
그림 그리기, 도형, 텍스트, 화살표, 이미지/영상 삽입 등 **자유형 드로잉 툴**에 가깝습니다. 기본 제공되는 `<Tldraw />` 컴포넌트를 붙이면 바로 Miro/Figjam 같은 화이트보드 화면이 생깁니다.

```jsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
  return <div style={{ position: 'fixed', inset: 0 }}><Tldraw /></div>
}
```

## 실시간 협업(멀티플레이어)
`@tldraw/sync`라는 자체 동기화 패키지로 여러 사용자의 동시 편집을 지원합니다 (Cloudflare 기반 셀프 호스팅). "Workflow" 스타터 킷도 별도로 제공되는데, 이는 tldraw의 자유 드로잉 위에 노드-엣지 자동화 빌더를 얹은 예시입니다.

## 왜 FlowMat과는 결이 다른가
tldraw는 "그림/도형을 자유롭게 그리는 캔버스"가 기본 단위입니다. 반면 FlowMat처럼 **서버에 저장된 구조화된 데이터(공정 ID, 입출력 항목, 연결 규칙)를 REST API로 주고받아야 하는 경우**, tldraw의 도형 데이터 모델을 우리 DB 스키마에 맞게 다시 매핑하는 추가 작업이 필요합니다.

## 상업적 이용 주의
**프로덕션(실제 서비스) 배포 시 라이선스 키가 필요**합니다. 개발/테스트는 무료지만, FlowMat처럼 상용 SaaS로 출시할 계획이라면 비용을 확인해야 합니다.
