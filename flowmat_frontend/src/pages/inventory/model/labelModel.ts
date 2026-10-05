import type { StorageLocationDto } from '../../../entities/inventory/api/useStorageLocations'

/*
 * Printable labels for storage places with a Code 128 barcode of the place code (docs/domain/storage-location.md L10), so
 * a scanner types the code that a warehouse task's place scan compares (warehouse-task.md W8). Code set B only: printable
 * ASCII. A code with other characters gets a label without a barcode.
 */

// Code 128 bar patterns for values 0–105 (103–105 are the start codes), 11 modules each, 1 = bar.
const PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100',
  '10011001000', '10011000100', '10001100100', '11001001000', '11001000100', '11000100100',
  '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110',
  '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110',
  '10110001000', '10001101000', '10001100010', '11010001000', '11000101000', '11000100010',
  '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110',
  '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110',
  '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000',
  '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000',
  '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010',
  '11000010100', '10001111010', '10100111100', '10010111100', '10010011110', '10111100100',
  '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000',
  '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110',
  '11110101110', '11010000100', '11010010000', '11010011100',
]
const STOP = '1100011101011'
const START_B = 104
const QUIET = 10
const HEIGHT = 40

/** The modules (1 = bar, 0 = space) of text in Code 128 set B with its check value; null when a character is outside it. */
export function code128Modules(text: string): string | null {
  if (text.length === 0) return null
  const values = [START_B]
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code < 32 || code > 126) return null
    values.push(code - 32)
  }
  const check = values.reduce((sum, value, index) => sum + (index === 0 ? value : index * value), 0) % 103
  return [...values, check].map((value) => PATTERNS[value]).join('') + STOP
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** An SVG of the text's barcode with quiet zones of ten modules either side; null when the text has no barcode. */
export function barcodeSvg(text: string): string | null {
  const modules = code128Modules(text)
  if (!modules) return null
  const bars: string[] = []
  for (let x = 0; x < modules.length; ) {
    if (modules[x] !== '1') {
      x += 1
      continue
    }
    let run = 1
    while (modules[x + run] === '1') run += 1
    bars.push(`<rect x="${x + QUIET}" y="0" width="${run}" height="${HEIGHT}"/>`)
    x += run
  }
  const width = modules.length + 2 * QUIET
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${HEIGHT}" preserveAspectRatio="none" role="img" `
    + `aria-label="Barcode ${escapeHtml(text)}" shape-rendering="crispEdges"><rect width="${width}" height="${HEIGHT}" fill="#fff"/>`
    + `<g fill="#000">${bars.join('')}</g></svg>`
}

/** A page of labels to print: each place's barcode, code and path; a place whose code has no barcode says so. */
export function labelSheetHtml(places: Pick<StorageLocationDto, 'locationCode' | 'path' | 'locationType'>[]): string {
  const labels = places.map((place) => {
    const svg = barcodeSvg(place.locationCode)
    return `<div class="label">${svg ?? '<p class="missing">No barcode: the code has characters a barcode cannot hold.</p>'}`
      + `<div class="code">${escapeHtml(place.locationCode)}</div>`
      + `<div class="path">${escapeHtml(place.path)} · ${escapeHtml(place.locationType)}</div></div>`
  })
  return '<!doctype html><html><head><meta charset="utf-8"><title>Location labels</title><style>'
    + 'body{font-family:system-ui,sans-serif;margin:12mm;color:#000;background:#fff}'
    + '.sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(62mm,1fr));gap:4mm}'
    + '.label{border:1px dashed #999;padding:3mm;break-inside:avoid;text-align:center}'
    + '.label svg{display:block;width:100%;height:16mm}.code{font-size:16pt;font-weight:700;margin-top:1mm}'
    + '.path{font-size:9pt;color:#444}.missing{font-size:9pt;color:#b91c1c;margin:0}'
    + '@media print{.noprint{display:none}.label{border-color:#ddd}}</style></head><body>'
    + `<p class="noprint"><button type="button" onclick="window.print()">Print</button> ${places.length} label${places.length === 1 ? '' : 's'}</p>`
    + `<div class="sheet">${labels.join('')}</div></body></html>`
}
