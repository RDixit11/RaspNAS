import CopyButton from '@/components/CopyButton'

// Ścieżki do podłączenia udziału w systemie: SMB (Windows/macOS) i NFS (Linux)
export default function SharePaths({ share }) {
  const paths = [
    share.smbPath && { label: 'SMB', hint: 'Windows / macOS', value: share.smbPath },
    share.nfsPath && { label: 'NFS', hint: 'Linux', value: share.nfsPath },
  ].filter(Boolean)

  if (!paths.length) return <p className="text-sm text-muted-foreground">Udział jest dostępny tylko przez przeglądarkę.</p>

  return (
    <dl className="space-y-1.5">
      {paths.map((path) => (
        <div key={path.label} className="flex min-w-0 items-center gap-2 text-sm">
          <dt className="w-10 shrink-0 font-medium" title={path.hint}>
            {path.label}
          </dt>
          <dd className="flex min-w-0 flex-1 items-center gap-1 rounded-md bg-muted px-2 py-1">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{path.value}</code>
            <CopyButton text={path.value} label={`Kopiuj ścieżkę ${path.label}`} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
