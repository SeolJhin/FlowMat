import { useCallback, useEffect, useRef } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'

// 브라우저 네이티브 WebSocket으로 SockJS raw-transport 서브패스에 직접 연결.
// sockjs-client 는 Node.js `global` 을 참조해 브라우저에서 크래시를 일으키므로 사용하지 않는다.
function wsUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}

export interface NodeMoveMessage {
  processId: string
  x: number
  y: number
  userId: string | null
  workflowId: string
  timestamp: number
}

export interface PresenceMessage {
  type: 'JOIN' | 'LEAVE' | 'CURSOR_MOVED' | 'NODE_EDITING'
  userId: string | null
  workflowId: string
  cursorX?: number | null
  cursorY?: number | null
  editingProcessId?: string | null
  timestamp: number
}

export interface GraphChangeMessage {
  changeType: string
  workflowId: string
  entityId: string
  userId: string | null
  timestamp: number
}

// 실제 로그인 전까지 탭당 랜덤 ID를 STOMP Bearer 토큰으로 사용.
// JwtProvider 스텁이 그대로 userId 로 반환 → echo 필터링 key로 활용.
const CLIENT_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}`

const NODE_MOVE_THROTTLE_MS = 160

/**
 * STOMP-over-SockJS 연결 훅.
 * - 노드 드래그 중 sendNodeMove (160ms 스로틀, instldraw 패턴 참고)
 * - /topic/workflow/{id}/node-move 구독 → onRemoteNodeMove 콜백
 * - /topic/workflow/{id}/presence  구독 → onPresence 콜백 (선택)
 * - sendPresence: CURSOR_MOVED / NODE_EDITING 전송
 */
export function useWorkflowSync(
  workflowId: string,
  onRemoteNodeMove: (message: NodeMoveMessage) => void,
  onPresence?: (message: PresenceMessage) => void,
  onGraphChange?: (message: GraphChangeMessage) => void
) {
  const clientRef = useRef<Client | null>(null)
  const connectedRef = useRef(false)
  const onRemoteNodeMoveRef = useRef(onRemoteNodeMove)
  onRemoteNodeMoveRef.current = onRemoteNodeMove
  const onPresenceRef = useRef(onPresence)
  onPresenceRef.current = onPresence
  const onGraphChangeRef = useRef(onGraphChange)
  onGraphChangeRef.current = onGraphChange

  const lastSentAtRef = useRef(0)
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingMoveRef = useRef<{ processId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!workflowId) return

    const client = new Client({
      brokerURL: wsUrl('/api/ws/websocket'),
      connectHeaders: { Authorization: `Bearer ${CLIENT_ID}` },
      reconnectDelay: 3000,
    })

    client.onConnect = () => {
      connectedRef.current = true

      client.subscribe(`/topic/workflow/${workflowId}/node-move`, (message: IMessage) => {
        let payload: NodeMoveMessage
        try { payload = JSON.parse(message.body) as NodeMoveMessage } catch { return }
        if (payload.userId === CLIENT_ID) return
        onRemoteNodeMoveRef.current(payload)
      })

      client.subscribe(`/topic/workflow/${workflowId}/presence`, (message: IMessage) => {
        let payload: PresenceMessage
        try { payload = JSON.parse(message.body) as PresenceMessage } catch { return }
        onPresenceRef.current?.(payload)
      })

      client.subscribe(`/topic/workflow/${workflowId}/graph`, (message: IMessage) => {
        let payload: GraphChangeMessage
        try { payload = JSON.parse(message.body) as GraphChangeMessage } catch { return }
        onGraphChangeRef.current?.(payload)
      })
    }

    client.onWebSocketClose = () => { connectedRef.current = false }

    client.activate()
    clientRef.current = client

    return () => {
      connectedRef.current = false
      if (throttleTimerRef.current) { clearTimeout(throttleTimerRef.current); throttleTimerRef.current = null }
      pendingMoveRef.current = null
      void client.deactivate()
      clientRef.current = null
    }
  }, [workflowId])

  const publish = useCallback(
    (processId: string, x: number, y: number) => {
      const client = clientRef.current
      if (!client || !connectedRef.current) return
      client.publish({
        destination: `/app/workflow/${workflowId}/node-move`,
        body: JSON.stringify({ processId, x, y, userId: CLIENT_ID, workflowId, timestamp: Date.now() }),
      })
    },
    [workflowId]
  )

  const sendNodeMove = useCallback(
    (processId: string, x: number, y: number) => {
      pendingMoveRef.current = { processId, x, y }
      const elapsed = Date.now() - lastSentAtRef.current
      if (elapsed >= NODE_MOVE_THROTTLE_MS) {
        lastSentAtRef.current = Date.now()
        publish(processId, x, y)
        pendingMoveRef.current = null
        return
      }
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null
          const p = pendingMoveRef.current
          if (p) { lastSentAtRef.current = Date.now(); publish(p.processId, p.x, p.y); pendingMoveRef.current = null }
        }, NODE_MOVE_THROTTLE_MS - elapsed)
      }
    },
    [publish]
  )

  const sendPresence = useCallback(
    (message: Omit<PresenceMessage, 'userId' | 'workflowId' | 'timestamp'>) => {
      const client = clientRef.current
      if (!client || !connectedRef.current) return
      client.publish({
        destination: `/app/workflow/${workflowId}/presence`,
        body: JSON.stringify({ ...message, userId: CLIENT_ID, workflowId, timestamp: Date.now() }),
      })
    },
    [workflowId]
  )

  return { sendNodeMove, sendPresence, clientId: CLIENT_ID }
}
