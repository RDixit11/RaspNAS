// Ustawienia wygody tej przeglądarki (localStorage) — bez nich wszystko działa z wartościami domyślnymi

const CONFIRM_MOVE_KEY = 'nas-confirm-move'

// Czy pytać przed przeniesieniem przeciągniętego pliku (domyślnie tak)
export function shouldConfirmMove() {
  try {
    return localStorage.getItem(CONFIRM_MOVE_KEY) !== 'no'
  } catch {
    return true
  }
}

export function setConfirmMove(confirm) {
  try {
    if (confirm) localStorage.removeItem(CONFIRM_MOVE_KEY)
    else localStorage.setItem(CONFIRM_MOVE_KEY, 'no')
  } catch {
    // brak dostępu do localStorage — dalej będziemy pytać
  }
}
