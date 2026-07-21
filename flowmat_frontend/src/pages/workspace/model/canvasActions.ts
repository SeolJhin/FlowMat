/**
 * Canvas Action 패턴 (excalidraw actions/ 참고):
 * 각 액션은 keyTest(단축키 조건) + predicate(활성 조건) + handler(실행 로직)를 가진다.
 * 키보드 핸들러와 버튼 UI가 동일한 액션 객체를 공유한다.
 */

export interface CanvasActionContext {
  selectedProcessId: string | null
  selectedConnectionId: string | null
  isEditing: boolean
  deleteNodeWithConfirm(id: string): Promise<void>
  deleteConnection(id: string): Promise<void>
  clearSelection(): void
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
    handler: ({ selectedProcessId, deleteNodeWithConfirm }) =>
      selectedProcessId ? deleteNodeWithConfirm(selectedProcessId) : Promise.resolve(),
  },
  {
    id: 'delete-edge',
    label: 'Delete Connection',
    keyTest: (e) => !e.ctrlKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace'),
    predicate: ({ selectedConnectionId, selectedProcessId, isEditing }) =>
      !!selectedConnectionId && !selectedProcessId && !isEditing,
    handler: ({ selectedConnectionId, deleteConnection }) =>
      selectedConnectionId ? deleteConnection(selectedConnectionId) : Promise.resolve(),
  },
  {
    id: 'escape',
    label: 'Clear Selection',
    keyTest: (e) => e.key === 'Escape',
    predicate: () => true,
    handler: ({ clearSelection }) => clearSelection(),
  },
]
