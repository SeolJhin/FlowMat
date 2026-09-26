import { useState, type FormEvent } from 'react'
import { useCopyBomMutation } from '../../../entities/bom/api/useBoms'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { BomDto, ItemDto } from '../../../shared/types/api'

/**
 * Starts another product's BOM from this one: same base and materials, as that product's first draft
 * (docs/domain/inventory-bom-lot-contract.md §5 "BOM 복사"). Only products without a BOM are offered.
 */
export function BomCopyForm({
  projectId,
  bom,
  items,
  productsWithBom,
  onCopied,
}: {
  projectId: string
  bom: BomDto
  items: ItemDto[]
  productsWithBom: Set<string>
  onCopied: (bomId: string) => void
}) {
  const copyMutation = useCopyBomMutation(projectId)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const [name, setName] = useState('')
  const materials = new Set(bom.lines.map((line) => line.childItemId))
  const choices = items.filter((item) => !productsWithBom.has(item.itemId) && !materials.has(item.itemId) && item.itemId !== bom.targetItemId)

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const copy = await copyMutation.mutateAsync({ bomId: bom.bomId, targetItemId: target, bomName: name.trim() || undefined })
      setOpen(false)
      onCopied(copy.bomId)
    } catch {
      // Shown below.
    }
  }

  if (!open) {
    return (
      <button type="button" style={{ fontSize: 12 }} onClick={() => setOpen(true)} disabled={choices.length === 0}>
        Copy to another product
      </button>
    )
  }
  return (
    <form aria-label="Copy BOM" onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 6, fontSize: 12 }}>
      <select value={target} onChange={(e) => setTarget(e.target.value)} required aria-label="Copy to product">
        <option value="" disabled>
          Product without a BOM
        </option>
        {choices.map((item) => (
          <option key={item.itemId} value={item.itemId}>
            {item.itemCode} · {item.itemName}
          </option>
        ))}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`name (default: ${bom.bomName})`} aria-label="New BOM name" />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" disabled={!target || copyMutation.isPending}>
          Copy as draft
        </button>
        <button type="button" style={{ background: 'transparent' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {copyMutation.isError && <p style={{ color: '#dc2626', margin: 0 }}>{errorMessage(copyMutation.error, 'The BOM could not be copied.')}</p>}
    </form>
  )
}
