import { ChevronRight, CircleCheck, Download, Folder, FolderInput, FolderOpen, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConfirmDialog from '@/components/ConfirmDialog'
import ErrorAlert from '@/components/ErrorAlert'
import FilePreviewDialog from '@/components/files/FilePreviewDialog'
import MoveConfirmDialog from '@/components/files/MoveConfirmDialog'
import MoveDialog from '@/components/files/MoveDialog'
import NewFolderDialog from '@/components/files/NewFolderDialog'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { fileIcon, joinPath } from '@/lib/files'
import { formatBytes, formatDate } from '@/lib/format'
import { baseName, canMoveTo } from '@/lib/paths'
import { plural } from '@/lib/plural'
import { setConfirmMove, shouldConfirmMove } from '@/lib/preferences'
import { cn } from '@/lib/utils'
import { createFolder, deleteEntry, fileUrl, listFiles, moveEntry, uploadFiles } from '@/services/files'

const FILE_FORMS = ['plik', 'pliki', 'plików']
// typ danych przeciąganego wpisu — odróżnia przenoszenie od wrzucania plików z komputera
const ENTRY_DRAG_TYPE = 'application/x-nas-entry'
// podświetlenie folderu, nad którym trzymamy przeciągany plik
const DROP_TARGET = 'bg-primary/10 ring-2 ring-primary ring-inset'

function normalizePath(value) {
  const parts = (value ?? '').split('/').filter(Boolean)
  return parts.length ? `/${parts.join('/')}` : '/'
}

function Breadcrumbs({ rootName, path, onOpen, dropProps }) {
  const parts = path.split('/').filter(Boolean)

  return (
    <nav aria-label="Ścieżka" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onOpen('/')}
        {...dropProps('/', 'flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium hover:bg-muted pointer-coarse:py-2')}
      >
        <FolderOpen className="size-4 shrink-0 text-primary" />
        <span className="truncate">{rootName}</span>
      </button>
      {parts.map((part, index) => {
        const target = `/${parts.slice(0, index + 1).join('/')}`
        const isLast = index === parts.length - 1
        return (
          <span key={target} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onOpen(target)}
              disabled={isLast}
              {...dropProps(target, 'truncate rounded-md px-1.5 py-0.5 hover:bg-muted disabled:font-medium disabled:hover:bg-transparent pointer-coarse:py-2')}
            >
              {part}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

// Postęp wysyłania — przy dużych plikach widać, że system pracuje (nie odłączaj zasilania!)
function UploadProgress({ upload }) {
  const percent = upload.total ? Math.round((upload.loaded / upload.total) * 100) : 0
  const finishing = upload.total > 0 && upload.loaded >= upload.total
  return (
    <div role="status" className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 font-medium">
          <Spinner className="size-4" />
          {finishing ? 'Zapisywanie na węzłach…' : `Wysyłanie: ${plural(upload.count, FILE_FORMS)}`}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(upload.loaded)} z {formatBytes(upload.total)} · {percent}%
        </span>
      </div>
      <Progress value={percent} aria-label="Postęp wysyłania" />
    </div>
  )
}

export default function FileBrowser({ share, readOnly, onChanged }) {
  const { data: cluster } = useCluster()
  const [searchParams, setSearchParams] = useSearchParams()
  const path = normalizePath(searchParams.get('path'))
  const [listing, setListing] = useState(null)
  // ApiError (message + status) — pokazywany jako alert, np. „Brak miejsca” przy pełnej puli
  const [error, setError] = useState(null)
  const [upload, setUpload] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  // przenoszenie: przeciągany wpis { path, name, type }, folder pod kursorem, przeniesienie do potwierdzenia,
  // wpis wybrany do „Przenieś do…” i komunikat po udanym przeniesieniu
  const [dragged, setDragged] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [moving, setMoving] = useState(null)
  const [moved, setMoved] = useState(null)
  const [version, setVersion] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    listFiles(share.id, path)
      .then((result) => {
        if (cancelled) return
        setListing(result)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
    return () => {
      cancelled = true
    }
  }, [share.id, path, version])

  const nodes = Object.fromEntries((cluster?.nodes.items ?? []).map((node) => [node.id, node]))
  const nodeName = (nodeId) => nodes[nodeId]?.name ?? 'nieznany węzeł'
  // plik leży na jednym węźle — jeśli ten nie odpowiada, plik jest chwilowo niedostępny
  const isAvailable = (entry) => entry.type === 'dir' || nodes[entry.nodeId]?.online !== false

  const refresh = () => {
    setVersion((value) => value + 1)
    onChanged?.()
  }

  const openPath = (target) => {
    setError(null)
    setMoved(null)
    setSearchParams(target === '/' ? {} : { path: target })
  }

  const run = async (action) => {
    setError(null)
    try {
      await action()
      refresh()
    } catch (err) {
      setError(err)
    }
  }

  const move = async (entry, destination) => {
    await moveEntry(share.id, entry.path, destination)
    setMoved({ name: entry.name, destination })
    refresh()
  }

  const requestMove = (entry, destination) => {
    setMoved(null)
    if (shouldConfirmMove()) setPendingMove({ entry, destination })
    else run(() => move(entry, destination))
  }

  // Folder (wiersz albo element ścieżki) jako miejsce, na które można upuścić przeciągany plik
  const dropProps = (destination, className) => {
    const allowed = !readOnly && canMoveTo(dragged, destination)
    return {
      className: cn(className, allowed && dropTarget === destination && DROP_TARGET),
      onDragOver: (event) => {
        if (!allowed || !event.dataTransfer.types.includes(ENTRY_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDropTarget(destination)
      },
      onDragLeave: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => (current === destination ? null : current))
      },
      onDrop: (event) => {
        if (!allowed || !event.dataTransfer.types.includes(ENTRY_DRAG_TYPE)) return
        event.preventDefault()
        event.stopPropagation()
        setDropTarget(null)
        requestMove(dragged, destination)
      },
    }
  }

  const dragProps = (entry, entryPath, available) =>
    readOnly || !available
      ? {}
      : {
          draggable: true,
          onDragStart: (event) => {
            event.dataTransfer.setData(ENTRY_DRAG_TYPE, entryPath)
            event.dataTransfer.setData('text/plain', entry.name)
            event.dataTransfer.effectAllowed = 'move'
            setDragged({ path: entryPath, name: entry.name, type: entry.type })
          },
          onDragEnd: () => {
            setDragged(null)
            setDropTarget(null)
          },
        }

  const send = async (files) => {
    if (!files.length || readOnly) return
    const total = files.reduce((sum, file) => sum + file.size, 0)
    setUpload({ count: files.length, loaded: 0, total })
    await run(() =>
      uploadFiles(share.id, path, files, (loaded, size) => setUpload({ count: files.length, loaded, total: size })),
    )
    setUpload(null)
  }

  const dropHandlers = readOnly
    ? {}
    : {
        onDragOver: (event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          setDragging(true)
        },
        onDragLeave: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        },
        onDrop: (event) => {
          event.preventDefault()
          setDragging(false)
          send([...event.dataTransfer.files])
        },
      }

  const entries = listing?.path === path ? listing.entries : null

  return (
    <Card {...dropHandlers} className={cn('relative', dragging && 'ring-2 ring-primary')}>
      <CardHeader>
        <CardTitle className="col-start-1">Pliki</CardTitle>
        <CardDescription className="col-start-1">
          {readOnly ? (
            'Masz prawo tylko do odczytu tego udziału.'
          ) : (
            <>
              Wszystkie węzły widoczne jako jeden dysk.
              <span className="pointer-coarse:hidden">
                {' '}
                Pliki z komputera możesz przeciągnąć tutaj, a plik z listy — na folder, aby go przenieść.
              </span>
            </>
          )}
        </CardDescription>
        {!readOnly && (
          <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 flex flex-wrap gap-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            <NewFolderDialog onCreate={(name) => createFolder(share.id, path, name).then(refresh)} />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={Boolean(upload)}>
              <Upload /> Wyślij
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                send([...event.target.files])
                event.target.value = ''
              }}
            />
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/40 px-2 py-1">
          <Breadcrumbs rootName={share.name} path={path} onOpen={openPath} dropProps={dropProps} />
        </div>
        {upload && <UploadProgress upload={upload} />}
        <ErrorAlert error={error} onClose={() => setError(null)} />
        {moved && (
          <Alert role="status" className="has-data-[slot=alert-action]:pr-10">
            <CircleCheck />
            <AlertDescription className="wrap-anywhere text-foreground">
              Przeniesiono „{moved.name}” do „{baseName(moved.destination, share.name)}”.{' '}
              <button type="button" onClick={() => openPath(moved.destination)} className="font-medium text-primary hover:underline">
                Otwórz folder
              </button>
            </AlertDescription>
            <AlertAction>
              <Button variant="ghost" size="icon-xs" aria-label="Zamknij komunikat" onClick={() => setMoved(null)}>
                <X />
              </Button>
            </AlertAction>
          </Alert>
        )}

        {entries === null ? (
          !error && <Spinner className="mx-auto my-10 size-6 text-muted-foreground" />
        ) : entries.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            <Folder className="size-6" />
            {readOnly ? (
              'Ten folder jest pusty.'
            ) : (
              <span>
                Ten folder jest pusty — wyślij pliki<span className="pointer-coarse:hidden"> albo przeciągnij je tutaj</span>.
              </span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="w-full py-2 pr-2 font-medium">Nazwa</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Rozmiar</th>
                  <th className="hidden px-2 py-2 font-medium md:table-cell">Węzeł</th>
                  <th className="hidden px-2 py-2 font-medium lg:table-cell">Zmieniono</th>
                  <th className="w-px py-2">
                    <span className="sr-only">Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => {
                  const entryPath = joinPath(path, entry.name)
                  const available = isAvailable(entry)
                  const Icon = entry.type === 'dir' ? Folder : fileIcon(entry.name)
                  return (
                    <tr
                      key={entry.name}
                      {...dragProps(entry, entryPath, available)}
                      {...(entry.type === 'dir' ? dropProps(entryPath) : {})}
                      className={cn(
                        !available && 'text-muted-foreground',
                        dragged?.path === entryPath && 'opacity-50',
                        entry.type === 'dir' && dropTarget === entryPath && canMoveTo(dragged, entryPath) && DROP_TARGET,
                      )}
                    >
                      <td className="w-full max-w-0 py-1.5 pr-2">
                        <button
                          type="button"
                          disabled={!available}
                          onClick={() => (entry.type === 'dir' ? openPath(entryPath) : setPreview(entry))}
                          title={available ? undefined : `Węzeł ${nodeName(entry.nodeId)} nie odpowiada`}
                          className="flex w-full min-w-0 items-center gap-2.5 rounded-md py-1 text-left enabled:hover:text-primary disabled:cursor-not-allowed pointer-coarse:py-2"
                        >
                          <Icon className={cn('size-4 shrink-0', entry.type === 'dir' ? 'text-primary' : 'text-muted-foreground')} />
                          <span className="min-w-0">
                            <span className="block truncate">
                              {entry.name}
                              {!available && <span className="text-xs"> (niedostępny)</span>}
                            </span>
                            {entry.type === 'file' && (
                              <span className="block truncate text-xs text-muted-foreground md:hidden">
                                {formatBytes(entry.size)} · {nodeName(entry.nodeId)}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="hidden px-2 whitespace-nowrap text-muted-foreground sm:table-cell">
                        {entry.type === 'dir' ? '—' : formatBytes(entry.size)}
                      </td>
                      <td className="hidden px-2 whitespace-nowrap md:table-cell">
                        {entry.type === 'dir' ? (
                          <span className="text-muted-foreground">wszystkie</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn('size-2 rounded-full', available ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-500')} />
                            {nodeName(entry.nodeId)}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-2 whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(entry.modifiedAt)}</td>
                      <td className="py-1.5">
                        <div className="flex justify-end gap-0.5">
                          {entry.type === 'file' && available && (
                            <Button asChild variant="ghost" size="icon-sm">
                              <a href={fileUrl(share.id, entryPath, { download: true })} download={entry.name} aria-label={`Pobierz ${entry.name}`}>
                                <Download />
                              </a>
                            </Button>
                          )}
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Przenieś ${entry.name}`}
                              title="Przenieś do…"
                              disabled={!available}
                              onClick={() => setMoving({ path: entryPath, name: entry.name, type: entry.type })}
                            >
                              <FolderInput />
                            </Button>
                          )}
                          {!readOnly && (
                            <ConfirmDialog
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label={`Usuń ${entry.name}`} disabled={!available}>
                                  <Trash2 />
                                </Button>
                              }
                              title={entry.type === 'dir' ? `Usunąć folder „${entry.name}”?` : `Usunąć „${entry.name}”?`}
                              description={
                                entry.type === 'dir'
                                  ? 'Folder zostanie usunięty ze wszystkich węzłów razem z zawartością.'
                                  : 'Plik zostanie trwale usunięty.'
                              }
                              onConfirm={() => run(() => deleteEntry(share.id, entryPath))}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <MoveConfirmDialog
        move={pendingMove}
        rootName={share.name}
        onCancel={() => setPendingMove(null)}
        onConfirm={(dontAsk) => {
          if (dontAsk) setConfirmMove(false)
          const { entry, destination } = pendingMove
          setPendingMove(null)
          run(() => move(entry, destination))
        }}
      />
      <MoveDialog
        shareId={share.id}
        rootName={share.name}
        entry={moving}
        onClose={() => setMoving(null)}
        onMove={async (destination) => {
          await move(moving, destination)
          setMoving(null)
        }}
      />
      <FilePreviewDialog
        shareId={share.id}
        path={preview ? joinPath(path, preview.name) : ''}
        entry={preview}
        nodeName={preview ? nodeName(preview.nodeId) : ''}
        onClose={() => setPreview(null)}
      />
    </Card>
  )
}
