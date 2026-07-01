import { create } from 'zustand'

export interface Command {
  label: string
  undo: () => Promise<void>
  redo?: () => Promise<void>
}

interface CommandHistoryState {
  past: Command[]
  future: Command[]
  push(command: Command): void
  undo(): Promise<void>
  redo(): Promise<void>
  clear(): void
}

const MAX_HISTORY = 50

export const useCommandHistory = create<CommandHistoryState>((set, get) => ({
  past: [],
  future: [],

  push(command) {
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), command],
      future: [],
    }))
  },

  async undo() {
    const { past } = get()
    if (past.length === 0) return
    const command = past[past.length - 1]
    await command.undo()
    set((s) => ({
      past: s.past.slice(0, -1),
      // Only push to future if the command supports redo
      future: command.redo ? [command, ...s.future] : s.future,
    }))
  },

  async redo() {
    const { future } = get()
    if (future.length === 0) return
    const command = future[0]
    if (!command.redo) return
    await command.redo()
    set((s) => ({
      past: [...s.past, command],
      future: s.future.slice(1),
    }))
  },

  clear() {
    set({ past: [], future: [] })
  },
}))
