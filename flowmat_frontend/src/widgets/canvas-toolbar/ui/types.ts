import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface RibbonButtonDefinition {
  id: string
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}

export interface RibbonGroupDefinition {
  id: string
  label: string
  buttons: RibbonButtonDefinition[]
  // Non-button content (presence avatars, status text, a <select>, ...) for groups
  // that show state rather than trigger actions. When set, this replaces the
  // button row for this group — see migration plan §4 / Collaborate tab.
  content?: ReactNode
}

export interface RibbonTabDefinition {
  id: string
  label: string
  groups: RibbonGroupDefinition[]
}
