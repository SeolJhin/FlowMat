import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenSpecifiers = [
  'react',
  'react-dom',
  '@xyflow/react',
  'zustand',
  'axios',
  '@tanstack/react-query',
  '@stomp/stompjs',
  'html-to-image',
  'konva',
  'pixi.js',
]

describe('flowmat-editor import boundary', () => {
  it('keeps production core code independent from UI, API, state, and renderer libraries', () => {
    const files = collectProductionTypeScriptFiles(join(process.cwd(), 'src', 'lib', 'flowmat-editor'))
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return forbiddenSpecifiers
        .filter((specifier) => hasForbiddenImport(source, specifier))
        .map((specifier) => `${file}: ${specifier}`)
    })

    expect(violations).toEqual([])
  })
})

function collectProductionTypeScriptFiles(directory: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      files.push(...collectProductionTypeScriptFiles(path))
      continue
    }

    if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(path)
    }
  }

  return files
}

function hasForbiddenImport(source: string, specifier: string): boolean {
  const escaped = escapeRegExp(specifier)
  const exactOrSubpath = `${escaped}(?:/[^'"]*)?`
  const patterns = [
    new RegExp(`from\\s+['"]${exactOrSubpath}['"]`),
    new RegExp(`import\\s+['"]${exactOrSubpath}['"]`),
    new RegExp(`import\\(\\s*['"]${exactOrSubpath}['"]\\s*\\)`),
    new RegExp(`require\\(\\s*['"]${exactOrSubpath}['"]\\s*\\)`),
  ]

  return patterns.some((pattern) => pattern.test(source))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
