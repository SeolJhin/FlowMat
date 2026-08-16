import { describe, it, expect } from 'vitest'

/**
 * 예제 테스트 케이스 1: 유틸리티 함수
 * 목적: 테스트 프레임워크 동작 검증
 */
describe('Utility Functions', () => {
  it('should parse JSON correctly', () => {
    const json = '{"name": "test", "value": 42}'
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('test')
    expect(parsed.value).toBe(42)
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5]
    const filtered = arr.filter(x => x > 2)
    expect(filtered).toEqual([3, 4, 5])
    expect(filtered.length).toBe(3)
  })

  it('should format strings', () => {
    const formatString = (str: string) => str.toUpperCase()
    expect(formatString('hello')).toBe('HELLO')
  })
})

/**
 * 예제 테스트 케이스 2: 날짜/시간 처리
 */
describe('Date & Time Utilities', () => {
  it('should validate ISO date format', () => {
    const isValidDate = (date: string) => !isNaN(Date.parse(date))
    expect(isValidDate('2026-08-16')).toBe(true)
    expect(isValidDate('invalid')).toBe(false)
  })

  it('should calculate time difference', () => {
    const getDaysDifference = (date1: Date, date2: Date) =>
      Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
    
    const d1 = new Date('2026-08-01')
    const d2 = new Date('2026-08-16')
    expect(getDaysDifference(d1, d2)).toBe(15)
  })
})

/**
 * 예제 테스트 케이스 3: 상태 관리
 */
describe('State Management Patterns', () => {
  it('should merge states correctly', () => {
    const mergeState = (prev: any, updates: any) => ({ ...prev, ...updates })
    const state = { count: 0, name: 'test' }
    const newState = mergeState(state, { count: 1 })
    
    expect(newState.count).toBe(1)
    expect(newState.name).toBe('test')
  })

  it('should immutably update nested objects', () => {
    const updateNested = (obj: any, path: string[], value: any) => {
      const result = JSON.parse(JSON.stringify(obj))
      let current = result
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]]
      }
      current[path[path.length - 1]] = value
      return result
    }

    const state = { user: { name: 'John', age: 30 } }
    const updated = updateNested(state, ['user', 'age'], 31)
    
    expect(updated.user.age).toBe(31)
    expect(state.user.age).toBe(30) // Original unchanged
  })
})
