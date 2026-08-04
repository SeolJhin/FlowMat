export type AlignDirection = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'
export type DistributeAxis = 'horizontal' | 'vertical'

export interface LayoutBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export function computeSelectionBounds(boxes: LayoutBox[]): SelectionBounds {
  if (boxes.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 }
  }
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const box of boxes) {
    left = Math.min(left, box.x)
    top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }
  return { left, top, right, bottom }
}

export function computeAlignedPosition(
  box: LayoutBox,
  bounds: SelectionBounds,
  direction: AlignDirection
): { x: number; y: number } {
  switch (direction) {
    case 'left':
      return { x: bounds.left, y: box.y }
    case 'centerX':
      return { x: bounds.left + (bounds.right - bounds.left - box.width) / 2, y: box.y }
    case 'right':
      return { x: bounds.right - box.width, y: box.y }
    case 'top':
      return { x: box.x, y: bounds.top }
    case 'centerY':
      return { x: box.x, y: bounds.top + (bounds.bottom - bounds.top - box.height) / 2 }
    case 'bottom':
      return { x: box.x, y: bounds.bottom - box.height }
  }
}

/** Spaces boxes evenly along the given axis, keeping the first/last box in place. */
export function computeDistributedPositions(
  boxes: LayoutBox[],
  axis: DistributeAxis
): Array<{ id: string; x: number; y: number }> {
  if (boxes.length < 3) {
    return boxes.map((box) => ({ id: box.id, x: box.x, y: box.y }))
  }

  const sorted = [...boxes].sort((a, b) =>
    axis === 'horizontal' ? a.x - b.x : a.y - b.y
  )

  if (axis === 'horizontal') {
    const totalSpan =
      sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x
    const totalWidth = sorted.reduce((sum, box) => sum + box.width, 0)
    const gap = (totalSpan - totalWidth) / (sorted.length - 1)

    let cursor = sorted[0].x
    return sorted.map((box) => {
      const x = cursor
      cursor += box.width + gap
      return { id: box.id, x, y: box.y }
    })
  }

  const totalSpan = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height - sorted[0].y
  const totalHeight = sorted.reduce((sum, box) => sum + box.height, 0)
  const gap = (totalSpan - totalHeight) / (sorted.length - 1)

  let cursor = sorted[0].y
  return sorted.map((box) => {
    const y = cursor
    cursor += box.height + gap
    return { id: box.id, x: box.x, y }
  })
}
