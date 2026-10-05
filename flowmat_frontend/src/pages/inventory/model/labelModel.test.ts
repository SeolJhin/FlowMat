import { describe, expect, it } from 'vitest'
import { barcodeSvg, code128Modules, escapeHtml, labelSheetHtml } from './labelModel'

// Expected modules from python-barcode 0.16.1 (Code128(text).build()), which picks code set B for these.
const REFERENCE: Record<string, string> = {
  'Bin-a1': '11010010000100010110001000011010011000010100100110111001001011000010011100110101100001001100011101011',
  'WH-A': '1101001000011101000110110001010001001101110010100011000111010111101100011101011',
  'Shelf 2/b': '11010010000110111010001001100001010110010000110010100001011000010011011001100110011100101011100110010010000110101100011101100011101011',
}

describe('Code 128', () => {
  it('encodes printable text as a reference encoder does', () => {
    for (const [text, modules] of Object.entries(REFERENCE)) expect(code128Modules(text)).toBe(modules)
  })

  it('has no barcode for empty text or characters outside code set B', () => {
    expect(code128Modules('')).toBeNull()
    expect(code128Modules('창고-1')).toBeNull()
    expect(code128Modules('Tab\there')).toBeNull()
  })

  it('draws the bars with quiet zones', () => {
    const svg = barcodeSvg('WH-A')!
    // 79 modules and ten either side.
    expect(svg).toContain('viewBox="0 0 99 40"')
    expect(svg).toContain('aria-label="Barcode WH-A"')
    const runs = REFERENCE['WH-A'].match(/1+/g)!
    expect(svg.match(/<rect x=/g)).toHaveLength(runs.length)
    expect(svg).toContain(`<rect x="10" y="0" width="${runs[0].length}" height="40"/>`)
    expect(barcodeSvg('창고')).toBeNull()
  })
})

describe('label sheet', () => {
  it('prints a label per place, escapes the text and says when a code has no barcode', () => {
    const html = labelSheetHtml([
      { locationCode: 'WH-A', path: 'WH-A', locationType: 'warehouse' },
      { locationCode: 'B<1>&', path: 'WH-A / B<1>&', locationType: 'bin' },
      { locationCode: '냉장', path: '냉장', locationType: 'zone' },
    ])
    expect(html.match(/class="label"/g)).toHaveLength(3)
    expect(html).toContain('3 labels')
    expect(html).toContain('<div class="code">B&lt;1&gt;&amp;</div>')
    expect(html).toContain('aria-label="Barcode B&lt;1&gt;&amp;"')
    expect(html).not.toContain('B<1>')
    expect(html).toContain('No barcode: the code has characters a barcode cannot hold.')
    expect(escapeHtml(`"x" 'y'`)).toBe('&quot;x&quot; &#39;y&#39;')
  })
})
