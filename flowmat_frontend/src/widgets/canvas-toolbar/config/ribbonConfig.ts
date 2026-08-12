import {
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  FileJson,
  Image,
  MousePointer2,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Undo2,
} from 'lucide-react'
import type { RibbonButtonDefinition, RibbonGroupDefinition, RibbonTabDefinition } from '../ui/types'

// Structure only — no onClick/active/disabled here. See migration plan §5-1:
// adding a button should mean adding one entry to a group's `buttons` array below,
// nothing else. Handlers are injected per-render via buildRibbonTabs(handlers).
export type RibbonButtonSkeleton = Omit<RibbonButtonDefinition, 'onClick' | 'active' | 'disabled' | 'title'>

export interface RibbonGroupSkeleton {
  id: string
  label: string
  buttons: RibbonButtonSkeleton[]
}

export interface RibbonTabSkeleton {
  id: string
  label: string
  groups: RibbonGroupSkeleton[]
}

// Step 2: Home tab groups/buttons filled in per migration plan §2.
// Annotate/Collaborate groups get filled in during Step 3/4 (see plan §3-4).
export const ribbonConfig: RibbonTabSkeleton[] = [
  {
    id: 'home',
    label: 'Home',
    groups: [
      {
        id: 'tools',
        label: 'Tools',
        buttons: [
          { id: 'select-pointer', icon: MousePointer2, label: 'Pointer' },
          { id: 'add-node', icon: Plus, label: 'Add Node' },
        ],
      },
      {
        id: 'modify',
        label: 'Modify',
        buttons: [
          { id: 'undo', icon: Undo2, label: 'Undo' },
          { id: 'redo', icon: Redo2, label: 'Redo' },
        ],
      },
      {
        id: 'layout',
        label: 'Layout',
        buttons: [
          { id: 'layout-tb', icon: AlignVerticalJustifyStart, label: 'Layout TB' },
          { id: 'layout-lr', icon: AlignHorizontalJustifyStart, label: 'Layout LR' },
        ],
      },
      {
        id: 'export',
        label: 'Export',
        buttons: [
          { id: 'export-json', icon: FileJson, label: 'Export JSON' },
          { id: 'export-png', icon: Image, label: 'Export PNG' },
        ],
      },
    ],
  },
  {
    id: 'annotate',
    label: 'Annotate',
    groups: [
      {
        id: 'editor-shapes',
        label: 'Editor Shapes',
        buttons: [],
      },
      {
        id: 'editor-document',
        label: 'Editor Document',
        buttons: [
          { id: 'save-editor-document', icon: Save, label: 'Save Editor' },
          { id: 'reload-editor-document', icon: RefreshCw, label: 'Reload' },
        ],
      },
    ],
  },
  { id: 'view', label: 'View', groups: [] },
  { id: 'collaborate', label: 'Collaborate', groups: [] },
]

export type RibbonButtonHandlers = Record<
  string,
  Pick<RibbonButtonDefinition, 'onClick'> & Partial<Pick<RibbonButtonDefinition, 'active' | 'disabled' | 'title'>>
>

// groupId -> fully-built buttons appended after that group's static buttons.
// Used for buttons whose set can't be known ahead of time in ribbonConfig.ts
// (e.g. one per palette node type) — data/logic stays injected from the page,
// per plan §5-1.
export type RibbonDynamicButtons = Record<string, RibbonButtonDefinition[]>

export function buildRibbonTabs(
  handlers: RibbonButtonHandlers = {},
  dynamicButtons: RibbonDynamicButtons = {}
): RibbonTabDefinition[] {
  return ribbonConfig.map((tab) => ({
    id: tab.id,
    label: tab.label,
    groups: tab.groups.map((group) => buildRibbonGroup(group, handlers, dynamicButtons[group.id] ?? [])),
  }))
}

function buildRibbonGroup(
  group: RibbonGroupSkeleton,
  handlers: RibbonButtonHandlers,
  extraButtons: RibbonButtonDefinition[]
): RibbonGroupDefinition {
  const staticButtons = group.buttons.map((button) => {
    const handler = handlers[button.id]
    return {
      ...button,
      onClick: handler?.onClick ?? (() => {}),
      active: handler?.active,
      disabled: handler?.disabled,
      title: handler?.title,
    }
  })
  return {
    id: group.id,
    label: group.label,
    buttons: [...staticButtons, ...extraButtons],
  }
}
