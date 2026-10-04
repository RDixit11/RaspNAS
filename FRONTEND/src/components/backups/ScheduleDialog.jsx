import { useId, useState } from 'react'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ALL_DAYS, WEEKDAYS, WEEKEND, WORKDAYS, sameDays, scheduleLabel } from '@/lib/schedule'

const PRESETS = [
  ['Codziennie', ALL_DAYS],
  ['Dni robocze', WORKDAYS],
  ['Weekend', WEEKEND],
]

// Formularz jest w DialogContent, więc przy każdym otwarciu startuje od wartości `value`
function ScheduleForm({ value, onSave, onCancel }) {
  const id = useId()
  const [days, setDays] = useState(value.days)
  const [time, setTime] = useState(value.time)
  const [error, setError] = useState('')
  const sorted = [...days].sort((a, b) => a - b)

  const changeDays = (update) => {
    setDays(update)
    setError('')
  }
  const toggle = (day, checked) => changeDays((previous) => (checked ? [...previous, day] : previous.filter((x) => x !== day)))

  const handleSubmit = (event) => {
    event.preventDefault()
    event.stopPropagation() // to okno jest otwierane z innego formularza — nie wysyłaj tamtego
    if (!days.length) return setError('Zaznacz co najmniej jeden dzień tygodnia.')
    if (!time) return setError('Podaj godzinę.')
    onSave({ days: sorted, time })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
      <DialogHeader>
        <DialogTitle>Harmonogram kopii</DialogTitle>
        <DialogDescription>Zaznacz dni tygodnia i godzinę, o której kopia ma się uruchomić.</DialogDescription>
      </DialogHeader>

      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-medium">Dni tygodnia</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(([label, preset]) => (
            <Button
              key={label}
              type="button"
              size="sm"
              variant={sameDays(sorted, preset) ? 'secondary' : 'outline'}
              onClick={() => changeDays(preset)}
            >
              {label}
            </Button>
          ))}
        </div>
        <ul className="divide-y rounded-lg border">
          {WEEKDAYS.map((name, day) => (
            <li key={name}>
              <label htmlFor={`${id}-${day}`} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm pointer-coarse:py-3">
                <Checkbox id={`${id}-${day}`} checked={days.includes(day)} onCheckedChange={(checked) => toggle(day, checked === true)} />
                {name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${id}-time`}>Godzina</Label>
        <Input id={`${id}-time`} type="time" className="w-40" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>

      <p className="text-sm text-muted-foreground">
        Kopia będzie się uruchamiać:{' '}
        <span className="font-medium text-foreground">{days.length && time ? scheduleLabel({ days: sorted, time }) : '—'}</span>
      </p>
      <FormError>{error}</FormError>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit">Zapisz</Button>
      </DialogFooter>
    </form>
  )
}

// Dokładne ustawienia harmonogramu — dni tygodnia i godzina
export default function ScheduleDialog({ open, onOpenChange, value, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <ScheduleForm
          value={value}
          onCancel={() => onOpenChange(false)}
          onSave={(schedule) => {
            onSave(schedule)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
