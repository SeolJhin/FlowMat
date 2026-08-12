import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { createRectangleElement } from '../../elements/RectangleElement'
import { createElementId } from '../../model/ElementId'
import { toSvgRenderNodes } from './SvgRenderer'

describe('SvgRenderer performance', () => {
  it('builds render nodes for a large editor document within a smoke-test budget', () => {
    const elements = Array.from({ length: 2_000 }, (_, index) =>
      createRectangleElement({
        id: createElementId(index + 1, 'shape'),
        x: (index % 80) * 24,
        y: Math.floor(index / 80) * 24,
        width: 18,
        height: 18,
        order: index + 1,
      }),
    )

    const startedAt = performance.now()
    const nodes = toSvgRenderNodes(elements)
    const elapsedMs = performance.now() - startedAt

    expect(nodes).toHaveLength(elements.length)
    expect(elapsedMs).toBeLessThan(1_000)
  })
})
