export interface HistoryState<T> {
  past: readonly T[]
  present: T
  future: readonly T[]
}

export function createHistoryState<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

export function pushHistory<T>(state: HistoryState<T>, nextPresent: T, limit = 100): HistoryState<T> {
  if (Object.is(state.present, nextPresent)) return state
  return {
    past: [...state.past, state.present].slice(-limit),
    present: nextPresent,
    future: [],
  }
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state
  const present = state.past[state.past.length - 1]
  return {
    past: state.past.slice(0, -1),
    present,
    future: [state.present, ...state.future],
  }
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state
  const present = state.future[0]
  return {
    past: [...state.past, state.present],
    present,
    future: state.future.slice(1),
  }
}
