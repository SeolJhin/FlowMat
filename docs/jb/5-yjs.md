# yjs/yjs

- **주소**: https://github.com/yjs/yjs
- **인기도**: 약 2.2만 Star, 768 Fork
- **라이선스**: MIT (완전 무료)
- **주요 언어**: JavaScript

## 한 줄 정의
> **CRDT** 기반 "공유 데이터 타입" 라이브러리. CRDT(Conflict-free Replicated Data Type, 충돌 없는 복제 데이터 타입)란, 여러 사람이 동시에 같은 데이터를 수정해도 나중에 자동으로 병합되면서 충돌이 나지 않게 설계된 자료구조를 뜻합니다.

## 무엇을 제공하나
tldraw나 xyflow 같은 "화면을 그리는" 라이브러리가 아니라, **"여러 사용자의 편집 내용을 자동으로 합치는 알고리즘"**만 제공하는 하위 계층 라이브러리입니다. `Y.Map`, `Y.Array`, `Y.Text` 같은 공유 타입을 만들고, 각 클라이언트가 이걸 수정하면 다른 클라이언트에도 자동으로 반영됩니다.

```js
import * as Y from 'yjs'
const doc = new Y.Doc()
const yarray = doc.getArray('my-array')
yarray.observe(() => console.log('변경됨'))
yarray.insert(0, ['val'])
```

## 네트워크는 별도
Yjs 자체는 "누가 어떻게 데이터를 주고받을지"(네트워크 전송)를 정하지 않습니다. `y-websocket`, `y-webrtc` 같은 **provider**(중계 역할을 하는 별도 패키지)를 조합해서 씁니다.

## FlowMat 연관성
FlowMat 문서에는 "협업 편집은 MVP 범위 아님"이라고 명시돼 있어 지금 당장은 필요하지 않습니다. 다만 나중에 **"같은 워크플로우를 여러 팀원이 동시에 편집"**하는 기능을 넣게 되면, xyflow(화면 그리기) + Yjs(동시 편집 동기화) 조합이 표준적인 선택지입니다.
