import { ServerCrash } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import AppSidebar from '@/components/app/AppSidebar'
import ClusterStatus from '@/components/app/ClusterStatus'
import ModeToggle from '@/components/theme/ModeToggle'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClusterProvider } from '@/context/ClusterProvider'
import { useCluster } from '@/hooks/useCluster'

function ConnectionError({ error, onRetry }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ServerCrash />
        </EmptyMedia>
        <EmptyTitle>Brak połączenia z koordynatorem</EmptyTitle>
        <EmptyDescription>{error.message} Sprawdź, czy koordynator działa, i spróbuj ponownie.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>Spróbuj ponownie</Button>
      </EmptyContent>
    </Empty>
  )
}

function Content() {
  const { data, error, loading, reload } = useCluster()

  if (loading && !data) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }
  // bez danych klastra nie ma sensu pokazywać stron; przy chwilowym błędzie odświeżania zostają stare dane
  if (error && !data) return <ConnectionError error={error} onRetry={reload} />
  return <Outlet />
}

export default function AppLayout() {
  return (
    <ClusterProvider>
      <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" aria-label="Pokaż lub ukryj menu" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <div className="min-w-0 flex-1">
              <ClusterStatus />
            </div>
            <ModeToggle />
          </header>
          <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 md:py-8">
            <Content />
          </main>
        </SidebarInset>
      </SidebarProvider>
      </TooltipProvider>
    </ClusterProvider>
  )
}
