import { Folder, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { baseName, canMoveTo, parentPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { listFolders } from '@/services/files'

// Formularz w DialogContent — przy każdym otwarciu wczytuje foldery od nowa
function FolderPicker({ shareId, rootName, entry, onMove, onCancel }) {
  const [folders, setFolders] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    let cancelled = false
    listFolders(shareId)
      .then((result) => !cancelled && setFolders(result))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [shareId])

  const submit = async () => {
    setError('')
    setMoving(true)
    try {
      await onMove(selected)
    } catch (err) {
      setError(err.message)
      setMoving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="wrap-anywhere">Przenieś „{entry.name}”</DialogTitle>
        <DialogDescription>Wybierz folder docelowy w udziale {rootName}.</DialogDescription>
      </DialogHeader>

      {folders === null ? (
        !error && <Spinner className="mx-auto my-6 size-5 text-muted-foreground" />
      ) : (
        <ul aria-label="Folder docelowy" className="max-h-72 overflow-y-auto rounded-lg border p-1">
          {folders.map((folder) => {
            const depth = folder === '/' ? 0 : folder.split('/').length - 1
            const allowed = canMoveTo(entry, folder)
            const current = folder === parentPath(entry.path)
            const Icon = folder === '/' ? FolderOpen : Folder
            return (
              <li key={folder}>
                <button
                  type="button"
                  disabled={!allowed}
                  aria-pressed={selected === folder}
                  onClick={() => setSelected(folder)}
                  style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm enabled:hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground pointer-coarse:py-2.5',
                    selected === folder && 'bg-primary/10 font-medium text-primary enabled:hover:bg-primary/15',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', allowed && 'text-primary')} />
                  <span className="truncate">{baseName(folder, rootName)}</span>
                  {current && <span className="shrink-0 text-xs">(jest tutaj)</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <FormError>{error}</FormError>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="button" onClick={submit} disabled={!selected || moving}>
          {moving ? 'Przenoszenie…' : 'Przenieś tutaj'}
        </Button>
      </DialogFooter>
    </>
  )
}

// „Przenieś do…” — wybór folderu z listy; działa też na telefonie, gdzie nie ma przeciągania
export default function MoveDialog({ shareId, rootName, entry, onClose, onMove }) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {entry && <FolderPicker shareId={shareId} rootName={rootName} entry={entry} onMove={onMove} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
