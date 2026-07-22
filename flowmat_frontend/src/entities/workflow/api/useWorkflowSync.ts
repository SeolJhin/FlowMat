import { useCallback, useEffect, useRef } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { tokenStorage, parseJwtUserId } from '../../auth/api/useLoginMutation'

// Browser-native WebSocket — sockjs-client references Node.js `global` and crashes in browsers.
function wsUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}

export interface NodeMoveMessage {
  processId: string
  x: number
  y: number
  userId: string | null
  /** Per-tab random UUID sent by the client, relayed unchanged by the server. Used for echo filtering. */
  clientId: string
  workflowId: string
  timestamp: number
}

export interface PresenceMessage {
  type: 'JOIN' | 'LEAVE' | 'CURSOR_MOVED' | 'NODE_EDITING'
  userId: string | null
  /** Per-tab random UUID. null for server-generated JOIN/LEAVE events. */
  clientId: string | null
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

/** Stable per-tab identifier — survives re-renders, used for STOMP echo filtering. */
const CLIENT_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}`

const NODE_MOVE_THROTTLE_MS = 160

/**
 * STOMP-over-WebSocket collaboration hook.
 * - Authenticates with the real JWT access token (server extracts userId from it).
 * - clientId (per-tab UUID) is sent alongside messages for echo filtering.
 * - sendNodeMove: 160 ms throttled drag relay (instldraw pattern).
 * - sendPresence: CURSOR_MOVED / NODE_EDITING broadcast.
 * - onReconnect: called on every reconnect after the first connect.
 */
export function useWorkflowSync(
  workflowId: string,
  onRemoteNodeMove: (message: NodeMoveMessage) => void,
  onPresence?: (message: PresenceMessage) => void,
  onGraphChange?: (message: GraphChangeMessage) => void,
  onReconnect?: () => void,
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
  const isFirstConnectRef = useRef(true)
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  useEffect(() => {
    if (!workflowId) return

    // Use the real JWT so the server can extract the authenticated userId.
    const accessToken = tokenStorage.getAccess() ?? ''
    // Parse our own userId to filter self-presence (server-generated JOIN for us).
    const ownUserId = parseJwtUserId(accessToken)

    const client = new Client({
      brokerURL: wsUrl('/api/ws/websocket'),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 3000,
    })

    client.onConnect = () => {
      if (!isFirstConnectRef.current) {
        onReconnectRef.current?.()
      }
      isFirstConnectRef.current = false
      connectedRef.current = true

      client.subscribe(`/topic/workflow/${workflowId}/node-move`, (message: IMessage) => {
        let payload: NodeMoveMessage
        try { payload = JSON.parse(message.body) as NodeMoveMessage } catch { return }
        // Filter echo: server preserves clientId, so this matches only our own tab's messages.
        if (payload.clientId === CLIENT_ID) return
        onRemoteNodeMoveRef.current(payload)
      })

      client.subscribe(`/topic/workflow/${workflowId}/presence`, (message: IMessage) => {
        let payload: PresenceMessage
        try { payload = JSON.parse(message.body) as PresenceMessage } catch { return }
        // Skip our own client-sent messages (CURSOR_MOVED, NODE_EDITING).
        if (payload.clientId === CLIENT_ID) return
        // Skip server-generated JOIN broadcast for our own userId to avoid self-cursor display.
        if (payload.type === 'JOIN' && payload.clientId == null && payload.userId === ownUserId) return
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
      // userId is intentionally omitted — the server fills it from the JWT principal.
      client.publish({
        destination: `/app/workflow/${workflowId}/node-move`,
        body: JSON.stringify({ processId, x, y, clientId: CLIENT_ID, workflowId, timestamp: Date.now() }),
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
    (message: Omit<PresenceMessage, 'userId' | 'clientId' | 'workflowId' | 'timestamp'>) => {
      const client = clientRef.current
      if (!client || !connectedRef.current) return
      // userId is intentionally omitted — the server fills it from the JWT principal.
      client.publish({
        destination: `/app/workflow/${workflowId}/presence`,
        body: JSON.stringify({ ...message, clientId: CLIENT_ID, workflowId, timestamp: Date.now() }),
      })
    },
    [workflowId]
  )

  return { sendNodeMove, sendPresence, clientId: CLIENT_ID }
}
