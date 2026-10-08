import { describe, expect, it } from 'vitest'
import { attributeRows, attributesInput } from './setupAttributesModel'
describe('setup attribute editor', () => {
  it('keeps independent dimensions, trims input and ignores only wholly blank rows', () => {
    expect(attributesInput([{ name: ' color ', value: ' red ' }, { name: 'mold', value: 'M1' }, { name: '', value: '' }])).toEqual({ attributes: { color: 'red', mold: 'M1' }, error: null })
    expect(attributeRows({ mold: 'M1' })).toEqual([{ name: 'mold', value: 'M1' }])
    expect(attributesInput([])).toEqual({ attributes: {}, error: null })
  })
  it.each([
    [{ name: 'x', value: '' }], [{ name: '', value: 'v' }], [{ name: 'x', value: 'a' }, { name: ' x ', value: 'b' }],
    [{ name: '__proto__', value: 'x' }], [{ name: 'constructor', value: 'x' }], [{ name: 'prototype', value: 'x' }],
    [{ name: 'a\nx', value: 'v' }], [{ name: 'x', value: 'a\u007f' }], [{ name: 'x'.repeat(51), value: 'v' }],
    [{ name: 'x', value: 'v'.repeat(101) }], [{ name: '\ud800', value: 'v' }], [{ name: 'x', value: '\udfff' }], Array.from({ length: 21 }, (_, i) => ({ name: String(i), value: 'v' })),
  ].map((rows) => [rows]))('rejects incomplete, duplicate, unsafe or oversized dimensions %j', (rows) => {
    expect(attributesInput(rows).error).not.toBeNull()
  })
  it('accepts paired Unicode in independent dimensions', () => {
    expect(attributesInput([{ name: '색상', value: '빨강 😀' }]).error).toBeNull()
  })
})
