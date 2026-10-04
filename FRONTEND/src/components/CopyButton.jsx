import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // schowek wymaga HTTPS albo localhost — w LAN-ie po HTTP używamy starszego sposobu
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

export default function CopyButton({ text, label = 'Kopiuj' }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon-xs" onClick={handleClick} aria-label={label} title={copied ? 'Skopiowano' : label}>
      {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
    </Button>
  )
}
