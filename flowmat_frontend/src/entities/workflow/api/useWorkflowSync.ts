import { useCallback, useEffect, useRef } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { tokenStorage, parseJwtUserId } from '../../auth/api/useLoginMutation'
import type { WorkflowGraphChangeDto } from '../../../shared/types/api'

// Browser-native WebSocket avoids pulling sockjs-client into the bundle.
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
  type: 'JOIN' | 'LEAVE' | 'HEARTBEAT' | 'CURSOR_MOVED' | 'NODE_EDITING' | 'ANNOTATION_DRAWING'
  userId: string | null
  /** Per-tab random UUID. null for server-generated JOIN/LEAVE events. */
  clientId: string | null
  workflowId: string
  cursorX?: number | null
  cursorY?: number | null
  editingProcessId?: string | null
  annotation?: {
    annotationType: 'freehand' | 'shape' | 'text'
    points: number[][]
    inProgress: boolean
  } | null
  timestamp: number
}

export type GraphChangeMessage = WorkflowGraphChangeDto

/** Stable per-tab identifier that survives re-renders and supports echo filtering. */
const CLIENT_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}`

const NODE_MOVE_THROTTLE_MS = 160

function readPositiveIntEnv(key: string, fallback: number) {
  const value = import.meta.env[key]
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const HEARTBEAT_INTERVAL_MS = readPositiveIntEnv('VITE_WORKFLOW_SYNC_HEARTBEAT_MS', 15_000)
const RECONNECT_DELAY_MS = readPositiveIntEnv('VITE_WORKFLOW_SYNC_RECONNECT_DELAY_MS', 3_000)

/**
 * STOMP-over-WebSocket collaboration hook.
 * - Authenticates with the real JWT access token (server extracts userId from it).
 * - clientId (per-tab UUID) is sent alongside messages for echo filtering.
 * - sendNodeMove: 160 ms throttled drag relay.
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
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingMoveRef = useRef<{ processId: string; x: number; y: number } | null>(null)
  const isFirstConnectRef = useRef(true)
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  useEffect(() => {
    if (!workflowId) return

    const accessToken = tokenStorage.getAccess() ?? ''
    const ownUserId = parseJwtUserId(accessToken)

    const client = new Client({
      brokerURL: wsUrl('/api/ws/websocket'),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: RECONNECT_DELAY_MS,
    })

    client.onConnect = () => {
      if (!isFirstConnectRef.current) {
        onReconnectRef.current?.()
      }
      isFirstConnectRef.current = false
      connectedRef.current = true

      client.subscribe(`/topic/workflow/${workflowId}/node-move`, (message: IMessage) => {
        let payload: NodeMoveMessage
        try {
          payload = JSON.parse(message.body) as NodeMoveMessage
        } catch {
          return
        }
        if (payload.clientId === CLIENT_ID) return
        onRemoteNodeMoveRef.current(payload)
      })

      client.subscribe(`/topic/workflow/${workflowId}/presence`, (message: IMessage) => {
        let payload: PresenceMessage
        try {
          payload = JSON.parse(message.body) as PresenceMessage
        } catch {
          return
        }
        if (payload.clientId === CLIENT_ID) return
        if (payload.type === 'JOIN' && payload.clientId == null && payload.userId === ownUserId) return
        onPresenceRef.current?.(payload)
      })

      client.subscribe(`/topic/workflow/${workflowId}/graph`, (message: IMessage) => {
        let payload: GraphChangeMessage
        try {
          payload = JSON.parse(message.body) as GraphChangeMessage
        } catch {
          return
        }
        onGraphChangeRef.current?.(payload)
      })

      const sendHeartbeat = () => {
        client.publish({
          destination: `/app/workflow/${workflowId}/presence`,
          body: JSON.stringify({
            type: 'HEARTBEAT',
            clientId: CLIENT_ID,
            workflowId,
            timestamp: Date.now(),
          }),
        })
      }

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
      sendHeartbeat()
      heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    }

    client.onWebSocketClose = () => {
      connectedRef.current = false
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }

    client.activate()
    clientRef.current = client

    return () => {
      connectedRef.current = false
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
        throttleTimerRef.current = null
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
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
          const pending = pendingMoveRef.current
          if (!pending) return
          lastSentAtRef.current = Date.now()
          publish(pending.processId, pending.x, pending.y)
          pendingMoveRef.current = null
        }, NODE_MOVE_THROTTLE_MS - elapsed)
      }
    },
    [publish]
  )

  const sendPresence = useCallback(
    (message: Omit<PresenceMessage, 'userId' | 'clientId' | 'workflowId' | 'timestamp'>) => {
      const client = clientRef.current
      if (!client || !connectedRef.current) return
      client.publish({
        destination: `/app/workflow/${workflowId}/presence`,
        body: JSON.stringify({ ...message, clientId: CLIENT_ID, workflowId, timestamp: Date.now() }),
      })
    },
    [workflowId]
  )

  return { sendNodeMove, sendPresence, clientId: CLIENT_ID, ownUserId: parseJwtUserId(tokenStorage.getAccess() ?? '') }
}
