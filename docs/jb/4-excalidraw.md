# excalidraw/excalidraw

- **주소**: https://github.com/excalidraw/excalidraw
- **인기도**: 약 12.6만 Star, 1.4만 Fork (6개 중 가장 인기 많음)
- **라이선스**: MIT (완전 무료)
- **주요 언어**: TypeScript

## 한 줄 정의
> **손그림(스케치) 느낌의 다이어그램**을 그리는 가상 화이트보드. Notion, Google Cloud 아키텍처 문서 등에서 많이 쓰입니다.

## 무엇을 제공하나
사각형, 원, 화살표, 자유 드로잉 등 기본 도형 툴을 제공하며, 결과물을 PNG/SVG 이미지나 `.excalidraw` JSON 파일로 내보낼 수 있습니다. `excalidraw.com`에는 실시간 협업과 종단간 암호화(E2E encryption, 서버조차 내용을 못 보게 암호화하는 방식) 기능도 있지만, 이는 npm 패키지 자체가 아니라 별도 데모 앱 코드에 들어있습니다.

```
npm install react react-dom @excalidraw/excalidraw
```

## 왜 FlowMat과는 결이 다른가
excalidraw는 "스케치/와이어프레임을 손그림 스타일로 그리는 도구"에 초점이 맞춰져 있습니다. 화살표로 도형을 잇는 기능은 있지만, xyflow처럼 **"이 노드의 몇 번 포트에서 저 노드의 몇 번 포트로, 이런 속성(유량, 지연시간 등)을 가진 연결"**을 세밀하게 다루는 데이터 모델은 없습니다. FlowMat의 공정(Process)-입출력(I/O)-연결(Connection) 구조를 그대로 옮기기엔 적합하지 않습니다.
