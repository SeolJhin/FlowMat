import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class lists, letting later classes override earlier
 * conflicting ones (e.g. `cn('text-sm', condition && 'text-lg')`).
 * This is the standard helper shadcn/Origin UI components expect at
 * `@/lib/utils` — most copy-pasted components import it directly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
