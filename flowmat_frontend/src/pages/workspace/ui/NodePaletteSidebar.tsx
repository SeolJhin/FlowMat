import { useMemo, useState, type DragEvent } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Cog,
  LogIn,
  LogOut,
  MousePointer2,
  PenTool,
  Search,
  Square,
  Type,
  Wrench,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PALETTE_DRAG_MIME } from './canvasConstants'
import type { WorkflowNodeDefinition, WorkflowPaletteTool } from '../../../entities/workflow/model/nodeCatalog'

const TOOL_ICONS: Record<string, typeof MousePointer2> = {
  select: MousePointer2,
  process: Cog,
  equipment: Wrench,
  storage: Archive,
  input: LogIn,
  output: LogOut,
  'annotation-shape': Square,
  'annotation-text': Type,
  'annotation-freehand': PenTool,
}

function ToolIcon({ tool }: { tool: string }) {
  const Icon = TOOL_ICONS[tool] ?? Square
  return <Icon className="h-3.5 w-3.5" strokeWidth={2} />
}

function PaletteRow({
  tool,
  label,
  active,
  disabled,
  draggable,
  onDragStart,
  onClick,
}: {
  tool: string
  label: string
  active: boolean
  disabled?: boolean
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[13px] transition-colors',
        active
          ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
          : 'text-[var(--text)] hover:bg-[var(--surface)] hover:text-[var(--text-h)]',
        disabled && 'cursor-not-allowed opacity-40',
        draggable && !disabled && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center',
          active ? 'text-[var(--accent)]' : 'text-[var(--text)] opacity-70',
        )}
      >
        <ToolIcon tool={tool} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[var(--border)] py-1 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)] opacity-70 transition-opacity hover:opacity-100"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{title}</span>
        {count != null && <span className="ml-auto font-normal normal-case tracking-normal opacity-70">{count}</span>}
      </button>
      {open && <div className="flex flex-col gap-0.5 px-1.5 pb-1">{children}</div>}
    </div>
  )
}

const ANNOTATION_TOOL_DEFINITIONS: Array<{ tool: string; label: string }> = [
  { tool: 'annotation-shape', label: 'Shape' },
  { tool: 'annotation-text', label: 'Text' },
  { tool: 'annotation-freehand', label: 'Freehand' },
]

const ALIGN_ACTIONS: Array<{ key: string; label: string; glyph: string }> = [
  { key: 'left', label: 'Align left', glyph: '⟸' },
  { key: 'centerX', label: 'Align center (horizontal)', glyph: '↔' },
  { key: 'right', label: 'Align right', glyph: '⟹' },
  { key: 'top', label: 'Align top', glyph: '⟰' },
  { key: 'centerY', label: 'Align middle (vertical)', glyph: '↕' },
  { key: 'bottom', label: 'Align bottom', glyph: '⟱' },
]

interface Props {
  paletteDefinitions: WorkflowNodeDefinition[]
  activeTool: WorkflowPaletteTool
  setActiveTool: (tool: WorkflowPaletteTool) => void
  canEditAnnotations: boolean
  onAlign: (direction: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => void
  onDistribute: (axis: 'horizontal' | 'vertical') => void
  onGroup: () => void
  onUngroup: () => void
}

export function NodePaletteSidebar({
  paletteDefinitions,
  activeTool,
  setActiveTool,
  canEditAnnotations,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
}: Props) {
  const [query, setQuery] = useState('')

  const showPointer = useMemo(() => {
    const q = query.trim().toLowerCase()
    return !q || 'pointer'.includes(q)
  }, [query])

  const filteredDefinitions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return paletteDefinitions
    return paletteDefinitions.filter((d) => d.label.toLowerCase().includes(q))
  }, [paletteDefinitions, query])

  const filteredAnnotations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ANNOTATION_TOOL_DEFINITIONS
    return ANNOTATION_TOOL_DEFINITIONS.filter((d) => d.label.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 border-b border-[var(--border)] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text)] opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] py-1.5 pl-7 pr-2 text-xs text-[var(--text-h)] outline-none transition-colors placeholder:text-[var(--text)] placeholder:opacity-50 focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Node Palette" count={filteredDefinitions.length + (showPointer ? 1 : 0)}>
          {showPointer && (
            <PaletteRow
              tool="select"
              label="Pointer"
              active={activeTool === 'select'}
              onClick={() => setActiveTool('select')}
            />
          )}
          {filteredDefinitions.map((definition) => (
            <PaletteRow
              key={definition.tool}
              tool={definition.tool}
              label={definition.label}
              active={activeTool === definition.tool}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(PALETTE_DRAG_MIME, definition.tool)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => setActiveTool(definition.tool)}
            />
          ))}
        </Section>

        <Section title="Annotations" count={filteredAnnotations.length}>
          {filteredAnnotations.map((definition) => (
            <PaletteRow
              key={definition.tool}
              tool={definition.tool}
              label={definition.label}
              active={activeTool === definition.tool}
              disabled={!canEditAnnotations}
              onClick={() => setActiveTool(definition.tool as WorkflowPaletteTool)}
            />
          ))}

          {canEditAnnotations && (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
              <span className="px-1 text-[11px] text-[var(--text)] opacity-60">
                Select 2+ annotations, then:
              </span>
              <div className="grid grid-cols-6 gap-1">
                {ALIGN_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    title={action.label}
                    onClick={() => onAlign(action.key as Parameters<typeof onAlign>[0])}
                    className="flex h-6 items-center justify-center rounded border border-[var(--border)] text-xs text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-h)]"
                  >
                    {action.glyph}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  title="Distribute horizontally (3+)"
                  onClick={() => onDistribute('horizontal')}
                  className="flex-1 rounded border border-[var(--border)] px-1.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-h)]"
                >
                  Distribute H
                </button>
                <button
                  type="button"
                  title="Distribute vertically (3+)"
                  onClick={() => onDistribute('vertical')}
                  className="flex-1 rounded border border-[var(--border)] px-1.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-h)]"
                >
                  Distribute V
                </button>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  title="Group selected annotations"
                  onClick={onGroup}
                  className="flex-1 rounded border border-[var(--border)] px-1.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-h)]"
                >
                  Group
                </button>
                <button
                  type="button"
                  title="Ungroup selected annotations"
                  onClick={onUngroup}
                  className="flex-1 rounded border border-[var(--border)] px-1.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-h)]"
                >
                  Ungroup
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}