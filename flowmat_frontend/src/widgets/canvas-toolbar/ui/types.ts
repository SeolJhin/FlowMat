import type { LucideIcon } from 'lucide-react'

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
}

export interface RibbonTabDefinition {
  id: string
  label: string
  groups: RibbonGroupDefinition[]
}
