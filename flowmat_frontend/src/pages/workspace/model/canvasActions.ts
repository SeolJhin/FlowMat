/**
 * Shared canvas action definitions inspired by Excalidraw's action model.
 * Each action combines a keyboard matcher, an availability predicate, and a handler.
 * The keyboard layer and toolbar UI consume the same action objects.
 */

export interface CanvasActionContext {
  selectedProcessId: string | null
  selectedConnectionId: string | null
  isEditing: boolean
  deleteSelection(): Promise<void>
  duplicateNode(id: string): Promise<void>
  clearSelection(): void
  selectAll(): void
  undo(): Promise<void>
  redo(): Promise<void>
}

export interface CanvasAction {
  id: string
  label: string
  keyTest(e: KeyboardEvent): boolean
  predicate(ctx: CanvasActionContext): boolean
  handler(ctx: CanvasActionContext): void | Promise<void>
}

export const CANVAS_ACTIONS: CanvasAction[] = [
  {
    id: 'undo',
    label: 'Undo',
    keyTest: (e) => (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey,
    predicate: () => true,
    handler: ({ undo }) => undo(),
  },
  {
    id: 'redo',
    label: 'Redo',
    keyTest: (e) => (e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y'),
    predicate: () => true,
    handler: ({ redo }) => redo(),
  },
  {
    id: 'delete-node',
    label: 'Delete Node',
    keyTest: (e) => !e.ctrlKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace'),
    predicate: ({ selectedProcessId, isEditing }) => !!selectedProcessId && !isEditing,
    handler: ({ selectedProcessId, deleteSelection }) =>
      selectedProcessId ? deleteSelection() : Promise.resolve(),
  },
  {
    id: 'delete-edge',
    label: 'Delete Connection',
    keyTest: (e) => !e.ctrlKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace'),
    predicate: ({ selectedConnectionId, selectedProcessId, isEditing }) =>
      !!selectedConnectionId && !selectedProcessId && !isEditing,
    handler: ({ selectedConnectionId, deleteSelection }) =>
      selectedConnectionId ? deleteSelection() : Promise.resolve(),
  },
  {
    id: 'duplicate',
    label: 'Duplicate Node',
    keyTest: (e) => (e.ctrlKey || e.metaKey) && e.key === 'd',
    predicate: ({ selectedProcessId, isEditing }) => !!selectedProcessId && !isEditing,
    handler: ({ selectedProcessId, duplicateNode }) =>
      selectedProcessId ? duplicateNode(selectedProcessId) : Promise.resolve(),
  },
  {
    id: 'select-all',
    label: 'Select All',
    keyTest: (e) => (e.ctrlKey || e.metaKey) && e.key === 'a',
    predicate: ({ isEditing }) => !isEditing,
    handler: ({ selectAll }) => selectAll(),
  },
  {
    id: 'escape',
    label: 'Clear Selection',
    keyTest: (e) => e.key === 'Escape',
    predicate: () => true,
    handler: ({ clearSelection }) => clearSelection(),
  },
]
