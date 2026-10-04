// Harmonogram kopii: { days: [0–6], time: 'GG:MM' } (0 = poniedziałek) albo null — tylko ręcznie

export const WEEKDAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const WEEKDAYS_PLURAL = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki', 'soboty', 'niedziele']

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const WORKDAYS = [0, 1, 2, 3, 4]
export const WEEKEND = [5, 6]
export const DAILY = { days: ALL_DAYS, time: '02:00' }

export const sameDays = (a, b) => a.length === b.length && a.every((day, index) => day === b[index])
export const isDaily = (schedule) => !!schedule && sameDays(schedule.days, ALL_DAYS) && schedule.time === DAILY.time

// „Codziennie o 2:00”, „W dni robocze o 22:00”, „We wtorki i czwartki o 18:30”
export function scheduleLabel(schedule) {
  if (!schedule) return 'Tylko ręcznie'
  const days = [...schedule.days].sort((a, b) => a - b)
  const at = `o ${schedule.time.replace(/^0(\d)/, '$1')}`
  if (sameDays(days, ALL_DAYS)) return `Codziennie ${at}`
  if (sameDays(days, WORKDAYS)) return `W dni robocze ${at}`
  if (sameDays(days, WEEKEND)) return `W weekendy ${at}`
  const names = days.map((day) => WEEKDAYS_PLURAL[day])
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names.at(-1)}` : names[0]
  return `${days[0] === 1 ? 'We' : 'W'} ${list} ${at}`
}
