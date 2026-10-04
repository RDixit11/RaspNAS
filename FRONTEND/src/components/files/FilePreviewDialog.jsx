import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { fileKind } from '@/lib/files'
import { formatBytes, formatDate } from '@/lib/format'
import { fetchFileText, fileUrl } from '@/services/files'

const MAX_TEXT_PREVIEW = 512 * 1024

function TextPreview({ shareId, path }) {
  const [state, setState] = useState({ text: null, error: '' })

  useEffect(() => {
    let cancelled = false
    fetchFileText(shareId, path)
      .then((text) => !cancelled && setState({ text, error: '' }))
      .catch((err) => !cancelled && setState({ text: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [shareId, path])

  if (state.error) return <p className="text-sm text-destructive">{state.error}</p>
  if (state.text === null) return <Spinner className="mx-auto my-10 size-6 text-muted-foreground" />
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap">
      {state.text || '(pusty plik)'}
    </pre>
  )
}

function PreviewBody({ shareId, path, entry }) {
  const kind = fileKind(entry.name)
  const src = fileUrl(shareId, path)

  if (kind === 'image') {
    return <img src={src} alt={entry.name} className="mx-auto max-h-[60vh] rounded-lg bg-muted object-contain" />
  }
  if (kind === 'audio') return <audio src={src} controls className="w-full" />
  if (kind === 'video') return <video src={src} controls className="max-h-[60vh] w-full rounded-lg" />
  if ((kind === 'text' || kind === 'sheet') && entry.size <= MAX_TEXT_PREVIEW) {
    return <TextPreview key={path} shareId={shareId} path={path} />
  }
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      Podgląd niedostępny dla tego pliku — pobierz go, aby otworzyć.
    </p>
  )
}

export default function FilePreviewDialog({ shareId, path, entry, nodeName, onClose }) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{entry.name}</DialogTitle>
              <DialogDescription>
                {formatBytes(entry.size)} · {formatDate(entry.modifiedAt)} · węzeł {nodeName}
              </DialogDescription>
            </DialogHeader>
            <PreviewBody shareId={shareId} path={path} entry={entry} />
            <DialogFooter>
              <Button asChild>
                <a href={fileUrl(shareId, path, { download: true })} download={entry.name}>
                  <Download /> Pobierz
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
