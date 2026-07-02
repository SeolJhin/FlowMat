import { create } from 'zustand'

/**
 * On-canvas node picker state.
 *
 * Ported from tldraw's workflow template (`OnCanvasComponentPicker` +
 * `insertNodeWithinConnection`): the picker opens either when a connection
 * drag is dropped on empty canvas, or when the "+" handle at the center of
 * an edge is clicked.
 */
export type NodePickerState =
  | {
      kind: 'connect-drop'
      /** Where the new node should be created (flow space). */
      flowPosition: { x: number; y: number }
      /** Where the popup should render (screen space). */
      screenPosition: { x: number; y: number }
      /** The handle the connection drag started from. */
      draft: {
        fromProcessId: string
        fromHandleId: string | null
        /** 'source' = drag started at an output handle, 'target' = at an input handle. */
        fromHandleType: 'source' | 'target'
      }
    }
  | {
      kind: 'insert-on-edge'
      flowPosition: { x: number; y: number }
      screenPosition: { x: number; y: number }
      edgeId: string
    }

interface CanvasInteractionState {
  nodePicker: NodePickerState | null
  hoveredEdgeId: string | null

  openNodePicker(state: NodePickerState): void
  closeNodePicker(): void
  setHoveredEdgeId(id: string | null): void
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  nodePicker: null,
  hoveredEdgeId: null,

  openNodePicker: (state) => set({ nodePicker: state }),
  closeNodePicker: () => set({ nodePicker: null }),
  setHoveredEdgeId: (id) => set({ hoveredEdgeId: id }),
}))
