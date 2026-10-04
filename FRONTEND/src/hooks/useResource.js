import { useCallback, useEffect, useState } from 'react'

// Pobieranie danych z API: { data, error, loading, reload }. Przy `interval` (ms) dane odświeżają się same —
// w trakcie odświeżania widać poprzednie dane, bez migania. `interval` może być funkcją danych,
// np. częściej, gdy trwa jakaś operacja.
export function useResource(loader, deps = [], { interval } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState((previous) => ({ ...previous, error, loading: false })))
    return () => {
      cancelled = true
    }
    // loader zmienia się przy każdym renderze — o ponownym pobraniu decydują deps i reload
  }, [...deps, version]) // eslint-disable-line react-hooks/exhaustive-deps

  const every = typeof interval === 'function' ? interval(state.data) : interval
  useEffect(() => {
    if (!every) return
    const timer = setInterval(() => setVersion((value) => value + 1), every)
    return () => clearInterval(timer)
  }, [every])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
