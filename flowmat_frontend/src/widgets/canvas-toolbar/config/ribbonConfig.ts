import type { RibbonButtonDefinition, RibbonGroupDefinition, RibbonTabDefinition } from '../ui/types'

// Structure only — no onClick/active/disabled here. See migration plan §5-1:
// adding a button should mean adding one entry to a group's `buttons` array below,
// nothing else. Handlers are injected per-render via buildRibbonTabs(handlers).
export type RibbonButtonSkeleton = Omit<RibbonButtonDefinition, 'onClick' | 'active' | 'disabled'>

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

// Step 1: skeleton only — four tabs, no groups/buttons populated yet.
// Home/Annotate/Collaborate groups get filled in during Step 2/3/4 (see plan §2-4).
export const ribbonConfig: RibbonTabSkeleton[] = [
  { id: 'home', label: 'Home', groups: [] },
  { id: 'annotate', label: 'Annotate', groups: [] },
  { id: 'view', label: 'View', groups: [] },
  { id: 'collaborate', label: 'Collaborate', groups: [] },
]

export type RibbonButtonHandlers = Record<
  string,
  Pick<RibbonButtonDefinition, 'onClick'> & Partial<Pick<RibbonButtonDefinition, 'active' | 'disabled'>>
>

export function buildRibbonTabs(handlers: RibbonButtonHandlers = {}): RibbonTabDefinition[] {
  return ribbonConfig.map((tab) => ({
    id: tab.id,
    label: tab.label,
    groups: tab.groups.map((group) => buildRibbonGroup(group, handlers)),
  }))
}

function buildRibbonGroup(group: RibbonGroupSkeleton, handlers: RibbonButtonHandlers): RibbonGroupDefinition {
  return {
    id: group.id,
    label: group.label,
    buttons: group.buttons.map((button) => {
      const handler = handlers[button.id]
      return {
        ...button,
        onClick: handler?.onClick ?? (() => {}),
        active: handler?.active,
        disabled: handler?.disabled,
      }
    }),
  }
}
