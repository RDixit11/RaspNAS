import { useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, ThemeContext } from '@/context/themeContext'

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? 'system'
  } catch {
    return 'system'
  }
}

// Elementy z transition-colors (pola, przyciski, listy) zmieniałyby kolor ~150 ms później niż reszta strony.
// Na czas przełączenia motywu wyłączamy przejścia, żeby wszystko zmieniło się w jednej klatce.
// Wyjątek: ikony z data-theme-animate (słońce/księżyc w przełączniku) zachowują swoją animację.
function switchWithoutTransitions(change) {
  const style = document.createElement('style')
  style.textContent = '*:not([data-theme-animate]),*::before,*::after{transition:none!important}'
  document.head.appendChild(style)
  change()
  // wymuszenie przeliczenia stylów z wyłączonymi przejściami, zanim je przywrócimy
  window.getComputedStyle(document.body).getPropertyValue('opacity')
  requestAnimationFrame(() => style.remove())
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const root = document.documentElement
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      if (root.classList.contains('dark') === isDark) return
      switchWithoutTransitions(() => root.classList.toggle('dark', isDark))
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (value) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // brak dostępu do localStorage — motyw działa tylko w tej sesji
    }
    setThemeState(value)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
