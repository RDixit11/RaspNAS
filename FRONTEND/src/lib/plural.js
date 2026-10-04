// Polska odmiana po liczebniku: plural(3, ['urządzenie', 'urządzenia', 'urządzeń']) → '3 urządzenia'
export function plural(count, [one, few, many]) {
  const mod10 = count % 10
  const mod100 = count % 100
  const word =
    count === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${count} ${word}`
}
