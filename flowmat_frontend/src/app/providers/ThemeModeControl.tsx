import { useTheme, type ThemeMode } from './ThemeProvider'

const OPTIONS: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' },
]

export function ThemeModeControl() {
  const { mode, setMode } = useTheme()

  return (
    <div className="theme-switcher" role="group" aria-label="Theme mode">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={`theme-switcher__button ${mode === option.mode ? 'theme-switcher__button--active' : ''}`}
          onClick={() => setMode(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
