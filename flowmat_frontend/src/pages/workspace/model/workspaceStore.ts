import { create } from 'zustand'
import type { CanvasMode, ConnectionDraftState } from '../../../entities/workflow/model/types'

interface WorkspaceState {
  selectedProcessId: string | null
  selectedConnectionId: string | null
  selectedPortId: string | null
  inspectorMode: 'none' | 'node' | 'connection' | 'multi'
  canvasMode: CanvasMode
  pendingConnectionDraft: ConnectionDraftState | null
  isRuleDrawerOpen: boolean
  isTemplateDrawerOpen: boolean
  activeColorPickerNodeId: string | null
  inlineEditingNodeId: string | null
  viewport: { x: number; y: number; zoom: number }
  panelWidths: { left: number; right: number }

  selectNode(id: string): void
  selectEdge(id: string): void
  selectPort(id: string): void
  clearSelection(): void
  setCanvasMode(mode: CanvasMode): void
  setConnectionDraft(draft: ConnectionDraftState | null): void
  openRuleDrawer(): void
  closeRuleDrawer(): void
  startInlineEdit(nodeId: string): void
  stopInlineEdit(): void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedProcessId: null,
  selectedConnectionId: null,
  selectedPortId: null,
  inspectorMode: 'none',
  canvasMode: 'select',
  pendingConnectionDraft: null,
  isRuleDrawerOpen: false,
  isTemplateDrawerOpen: false,
  activeColorPickerNodeId: null,
  inlineEditingNodeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  panelWidths: { left: 240, right: 320 },

  selectNode: (id) =>
    set({
      selectedProcessId: id,
      selectedConnectionId: null,
      selectedPortId: null,
      inspectorMode: 'node',
    }),

  selectEdge: (id) =>
    set({
      selectedConnectionId: id,
      selectedProcessId: null,
      selectedPortId: null,
      inspectorMode: 'connection',
    }),

  selectPort: (id) => set({ selectedPortId: id }),

  clearSelection: () =>
    set({
      selectedProcessId: null,
      selectedConnectionId: null,
      selectedPortId: null,
      inspectorMode: 'none',
    }),

  setCanvasMode: (mode) => set({ canvasMode: mode }),

  setConnectionDraft: (draft) => set({ pendingConnectionDraft: draft }),

  openRuleDrawer: () => set({ isRuleDrawerOpen: true }),

  closeRuleDrawer: () => set({ isRuleDrawerOpen: false }),

  startInlineEdit: (nodeId) => set({ inlineEditingNodeId: nodeId }),

  stopInlineEdit: () => set({ inlineEditingNodeId: null }),
}))
