import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { baseName, parentPath } from '@/lib/paths'

const where = (rootName, path) => (path === '/' ? rootName : `${rootName}${path}`)

// Potwierdzenie po przeciągnięciu pliku na folder — z opcją „Nie pytaj ponownie”
export default function MoveConfirmDialog({ move, rootName, onCancel, onConfirm }) {
  const [dontAsk, setDontAsk] = useState(false)

  return (
    <AlertDialog
      open={Boolean(move)}
      onOpenChange={(open) => {
        if (!open) {
          onCancel()
          setDontAsk(false)
        }
      }}
    >
      <AlertDialogContent>
        {move && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="wrap-anywhere">
                Przenieść „{move.entry.name}” do „{baseName(move.destination, rootName)}”?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-left">
                  <dt>Z:</dt>
                  <dd className="font-medium wrap-anywhere text-foreground">{where(rootName, parentPath(move.entry.path))}</dd>
                  <dt>Do:</dt>
                  <dd className="font-medium wrap-anywhere text-foreground">{where(rootName, move.destination)}</dd>
                </dl>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm pointer-coarse:py-1">
              <Checkbox checked={dontAsk} onCheckedChange={(checked) => setDontAsk(checked === true)} />
              Nie pytaj ponownie
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onConfirm(dontAsk)
                  setDontAsk(false)
                }}
              >
                Przenieś
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
