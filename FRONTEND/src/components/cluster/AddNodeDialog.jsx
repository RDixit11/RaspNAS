import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import ErrorAlert from '@/components/ErrorAlert'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { networkPrefix } from '@/lib/ip'
import { addNode } from '@/services/cluster'

// Ręczne dodanie węzła po IP — koordynator łączy się z agentem uruchomionym na tym urządzeniu
export default function AddNodeDialog({ onAdded }) {
  const { data: cluster } = useCluster()
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const ipRef = useRef(null)
  const prefix = networkPrefix(`${cluster.coordinator.ip}/24`)

  const handleOpenChange = (value) => {
    setOpen(value)
    if (!value) {
      setIp('')
      setName('')
      setError(null)
    }
  }

  const fillPrefix = () => {
    setIp(prefix)
    requestAnimationFrame(() => {
      ipRef.current?.focus()
      ipRef.current?.setSelectionRange(prefix.length, prefix.length)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const node = await addNode({ ip, name })
      handleOpenChange(false)
      onAdded(node)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Dodaj węzeł
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>Dodaj węzeł po adresie IP</DialogTitle>
            <DialogDescription>
              Na urządzeniu musi działać agent NAS. Zwykle wygodniej jest zatwierdzić zgłoszenie, które agent sam wysyła
              do koordynatora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="node-ip">Adres IP</Label>
              <Button
                type="button"
                variant="link"
                size="xs"
                className="h-auto px-0 font-mono"
                onClick={fillPrefix}
                aria-label={`Wpisz początek adresu sieci: ${prefix}`}
              >
                {prefix}…
              </Button>
            </div>
            <Input
              id="node-ip"
              ref={ipRef}
              inputMode="decimal"
              placeholder={`${prefix}20`}
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-name">Nazwa (opcjonalnie)</Label>
            <Input id="node-name" placeholder="np. nas-magazyn" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error?.status === 504 ? (
            <ErrorAlert error={error} title="Węzeł nie odpowiada" />
          ) : (
            <FormError>{error?.message}</FormError>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? 'Łączenie z agentem…' : 'Dodaj węzeł'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
