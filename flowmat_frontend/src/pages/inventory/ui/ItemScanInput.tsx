import { useState, type CSSProperties } from 'react'
import type { ItemDto } from '../../../shared/types/api'
import { findItemByScan, hasScanCodes } from '../model/itemScanModel'

/**
 * Picks an item by scanning or typing its barcode, SKU or code and pressing Enter (docs/domain/item-details.md). Enter
 * does not submit the surrounding form. Shown only when some of the items carry a barcode or SKU.
 */
export function ItemScanInput({ items, onPick, style }: { items: ItemDto[]; onPick: (item: ItemDto) => void; style?: CSSProperties }) {
  const [text, setText] = useState('')
  const [missing, setMissing] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  if (!hasScanCodes(items)) return null

  function pick() {
    const value = text.trim()
    if (!value) return
    const item = findItemByScan(items, value)
    if (item) {
      onPick(item)
      setPicked(`${item.itemCode} · ${item.itemName}`)
      setMissing(null)
      setText('')
    } else {
      setMissing(value)
      setPicked(null)
    }
  }

  return (
    <label style={{ display: 'grid', gap: 4, ...style }}>
      <span>Scan barcode</span>
      <input
        value={text}
        placeholder="barcode, SKU or code, then Enter"
        onChange={(e) => {
          setText(e.target.value)
          setMissing(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            pick()
          }
        }}
      />
      {missing && <span role="alert" style={{ fontSize: 11, color: '#b91c1c' }}>No item here has barcode, SKU or code {missing}.</span>}
      {picked && !missing && <span className="inspector-hint">Picked {picked}</span>}
    </label>
  )
}
