import { useState } from 'react'
import { useCreateProcessConnectionMutation } from '../../../entities/workflow/api/useCreateProcessConnectionMutation'
import { useCreateProcessIoMutation } from '../../../entities/workflow/api/useCreateProcessIoMutation'
import { useCreateProcessMutation } from '../../../entities/workflow/api/useCreateProcessMutation'
import { useDeleteProcessConnectionMutation } from '../../../entities/workflow/api/useDeleteProcessConnectionMutation'
import { useDeleteProcessIoMutation } from '../../../entities/workflow/api/useDeleteProcessIoMutation'
import { useDeleteProcessMutation } from '../../../entities/workflow/api/useDeleteProcessMutation'
import { useUpdateProcessIoMutation } from '../../../entities/workflow/api/useUpdateProcessIoMutation'
import { useUpdateProcessMutation } from '../../../entities/workflow/api/useUpdateProcessMutation'
import {
  buildDefaultConnectionPayload,
  getRelatedConnectionIds,
} from '../../../entities/workflow/model/connectionPolicy'
import {
  getWorkflowDefaultNodeDefinition,
  getWorkflowPaletteDefinitions,
  type WorkflowPaletteTool,
} from '../../../entities/workflow/model/nodeCatalog'
import type {
  ConnectCompletePayload,
  CreateProcessIoInput,
  UpdateProcessInput,
  UpdateProcessIoInput,
  WorkflowCanvasViewModel,
} from '../../../entities/workflow/model/types'

interface UseWorkflowCanvasActionsOptions {
  canvas: WorkflowCanvasViewModel
  clearSelection(): void
}

export function useWorkflowCanvasActions({
  canvas,
  clearSelection,
}: UseWorkflowCanvasActionsOptions) {
  const createProcessMutation = useCreateProcessMutation()
  const createProcessIoMutation = useCreateProcessIoMutation()
  const updateProcessIoMutation = useUpdateProcessIoMutation()
  const deleteProcessIoMutation = useDeleteProcessIoMutation()
  const createConnectionMutation = useCreateProcessConnectionMutation()
  const deleteConnectionMutation = useDeleteProcessConnectionMutation()
  const deleteProcessMutation = useDeleteProcessMutation()
  const updateProcessMutation = useUpdateProcessMutation()

  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<WorkflowPaletteTool>('process')

  const paletteDefinitions = getWorkflowPaletteDefinitions()
  const defaultDefinition = getWorkflowDefaultNodeDefinition()

  async function addNode() {
    setWorkspaceMessage(null)

    const nextIndex = canvas.nodes.length + 1
    const x = 120 + ((nextIndex - 1) % 4) * 220
    const y = 140 + Math.floor((nextIndex - 1) / 4) * 150

    try {
      await createProcessMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        processName: `${defaultDefinition.label} ${nextIndex}`,
        processType: defaultDefinition.processType,
        nodeType: defaultDefinition.nodeType,
        colorScheme: defaultDefinition.colorScheme,
        posX: x,
        posY: y,
        width: defaultDefinition.width,
        height: defaultDefinition.height,
        processDesc: `Created from the canvas toolbar (${nextIndex}).`,
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create node.')
    }
  }

  async function createNodeAt(position: { x: number; y: number }) {
    if (activeTool === 'select') {
      clearSelection()
      return
    }

    setWorkspaceMessage(null)

    const nextIndex = canvas.nodes.length + 1
    const definition = paletteDefinitions.find((item) => item.tool === activeTool)
    if (!definition) return

    try {
      await createProcessMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        processName: `${definition.label} ${nextIndex}`,
        processType: definition.processType,
        nodeType: definition.nodeType,
        colorScheme: definition.colorScheme,
        posX: Math.round(position.x),
        posY: Math.round(position.y),
        width: definition.width,
        height: definition.height,
        processDesc: `Created on canvas at (${Math.round(position.x)}, ${Math.round(position.y)}).`,
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create node.')
    }
  }

  async function updateNode(input: UpdateProcessInput) {
    setWorkspaceMessage(null)

    try {
      await updateProcessMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to update node.')
      throw error
    }
  }

  async function createPort(input: CreateProcessIoInput) {
    setWorkspaceMessage(null)

    try {
      await createProcessIoMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create port.')
      throw error
    }
  }

  async function updatePort(input: UpdateProcessIoInput) {
    setWorkspaceMessage(null)

    try {
      await updateProcessIoMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to update port.')
      throw error
    }
  }

  async function deletePort(processIoId: string) {
    setWorkspaceMessage(null)

    try {
      await deleteProcessIoMutation.mutateAsync(processIoId)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to delete port.')
      throw error
    }
  }

  async function saveNodePosition(processId: string, x: number, y: number) {
    await updateNode({
      processId,
      posX: Math.round(x),
      posY: Math.round(y),
    })
  }

  async function deleteConnection(connectionId: string) {
    setWorkspaceMessage(null)

    try {
      await deleteConnectionMutation.mutateAsync(connectionId)
      clearSelection()
    } catch (error) {
      setWorkspaceMessage(
        error instanceof Error ? error.message : 'Failed to delete connection.'
      )
    }
  }

  async function deleteNode(processId: string) {
    setWorkspaceMessage(null)

    try {
      const relatedConnectionIds = getRelatedConnectionIds(canvas.edges, processId)

      for (const connectionId of relatedConnectionIds) {
        await deleteConnectionMutation.mutateAsync(connectionId)
      }

      await deleteProcessMutation.mutateAsync(processId)
      clearSelection()
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to delete node.')
    }
  }

  async function createConnection(payload: ConnectCompletePayload) {
    setWorkspaceMessage(null)

    try {
      await createConnectionMutation.mutateAsync(
        buildDefaultConnectionPayload(canvas.workflow.workflowId, payload)
      )
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create connection.')
    }
  }

  return {
    activeTool,
    setActiveTool,
    workspaceMessage,
    paletteDefinitions,
    addNode,
    createNodeAt,
    updateNode,
    createPort,
    updatePort,
    deletePort,
    saveNodePosition,
    deleteConnection,
    deleteNode,
    createConnection,
  }
}
