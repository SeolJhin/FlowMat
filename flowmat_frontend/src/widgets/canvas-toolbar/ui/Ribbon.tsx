// First use of the widgets/ FSD layer in this repo — see docs/nekopunch/toolbar_ribbon_migration_plan.md §0-1.
// Ribbon UI is page-independent reusable UI, not tied to the workspace page, hence widgets/ over pages/.
import { RibbonTab } from './RibbonTab'
import { RibbonGroup } from './RibbonGroup'
import type { RibbonTabDefinition } from './types'

interface Props {
  tabs: RibbonTabDefinition[]
  activeTabId: string
  onTabChange: (id: string) => void
}

export function Ribbon({ tabs, activeTabId, onTabChange }: Props) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  return (
    <div className="ribbon">
      <div className="ribbon-tabbar" role="tablist">
        {tabs.map((tab) => (
          <RibbonTab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            active={tab.id === activeTab?.id}
            onSelect={onTabChange}
          />
        ))}
      </div>
      <div className="ribbon-groups">
        {activeTab?.groups.map((group) => (
          <RibbonGroup key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}
