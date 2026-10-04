import { FlaskConical, HardDrive, HardDriveDownload } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/format'
import { DISK_STATE } from '@/lib/labels'
import { cn } from '@/lib/utils'

// Jedna kieszeń (szuflada) na dysk — dyski wymienia się bez otwierania obudowy.
// onInsert / onEject są tylko w trybie symulacji (mock udaje włożenie i wyjęcie dysku).
export default function DiskBay({ disk, canFormat, onFormat, onInsert, onEject }) {
  const state = DISK_STATE[disk.state]
  const percent = disk.progress != null ? Math.round(disk.progress * 100) : null
  const canEject = onEject && (disk.state === 'failed' || disk.state === 'new')

  return (
    <Card className={cn(disk.state === 'empty' && 'border-dashed bg-muted/30 shadow-none')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4 text-muted-foreground" /> Kieszeń {disk.bay}
        </CardTitle>
        <CardDescription>
          {disk.state === 'empty' ? 'Brak dysku' : `${disk.model} · ${formatBytes(disk.capacityBytes)}`}
          {disk.device && (
            <>
              {' · '}
              <span className="font-mono whitespace-nowrap">{disk.device}</span>
            </>
          )}
        </CardDescription>
        <CardAction>
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {disk.note && <p className={cn(disk.state === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300')}>{disk.note}</p>}

        {disk.state === 'failed' && (
          <p className="text-muted-foreground">
            Wysuń szufladę nr {disk.bay} i włóż nowy dysk — nie trzeba otwierać obudowy ani wyłączać węzła. Nowy dysk
            pojawi się tutaj do sformatowania.
          </p>
        )}
        {disk.state === 'warning' && <p className="text-muted-foreground">Dysk działa, ale zaplanuj jego wymianę.</p>}
        {disk.state === 'empty' && <p className="text-muted-foreground">Włóż dysk do szuflady — pojawi się tutaj jako nowy dysk.</p>}

        {disk.state === 'new' && (
          <>
            <p className="text-muted-foreground">Nowy dysk nie jest jeszcze częścią puli. Sformatuj go, aby dodać jego miejsce.</p>
            <ConfirmDialog
              trigger={
                <Button size="sm" disabled={!canFormat}>
                  <HardDriveDownload /> Sformatuj i dodaj do puli
                </Button>
              }
              title={`Sformatować dysk w kieszeni ${disk.bay}?`}
              description="Wszystkie dane, które są na tym dysku, zostaną usunięte. Formatowanie potrwa chwilę."
              confirmLabel="Formatuj"
              onConfirm={onFormat}
            />
          </>
        )}

        {disk.state === 'formatting' && (
          <div role="status" className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>Formatowanie…</span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} aria-label={`Formatowanie dysku w kieszeni ${disk.bay}`} />
            <p className="text-xs text-muted-foreground">Nie wyjmuj dysku i nie odłączaj zasilania do końca formatowania.</p>
          </div>
        )}

        {disk.state === 'empty' && onInsert && (
          <Button size="sm" variant="outline" disabled={!canFormat} onClick={onInsert}>
            <FlaskConical /> Włóż dysk (symulacja)
          </Button>
        )}
        {canEject && (
          <Button size="sm" variant="outline" onClick={onEject}>
            <FlaskConical /> Wyjmij dysk (symulacja)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
