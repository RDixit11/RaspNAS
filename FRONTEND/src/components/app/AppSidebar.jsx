import {
  ArchiveRestore,
  ChevronsUpDown,
  CircleUser,
  FolderOpen,
  FolderTree,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Server,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/Logo'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useCluster } from '@/hooks/useCluster'
import { ROLE } from '@/lib/labels'

const MAIN = [
  { to: '/', label: 'Przegląd', icon: LayoutDashboard, exact: true },
  { to: '/pliki', label: 'Pliki', icon: FolderOpen },
]

const ADMIN = [
  { to: '/wezly', label: 'Węzły', icon: Server, badge: 'nodes' },
  { to: '/udzialy', label: 'Udziały', icon: FolderTree },
  { to: '/uzytkownicy', label: 'Użytkownicy', icon: Users },
  { to: '/kopie', label: 'Kopie zapasowe', icon: ArchiveRestore },
  { to: '/dziennik', label: 'Dziennik zdarzeń', icon: ScrollText },
]

function NavItems({ items }) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const { data: cluster } = useCluster()
  // liczba niedziałających węzłów jako licznik przy „Węzły”
  const offline = cluster ? cluster.nodes.total - cluster.nodes.online : 0

  return (
    <SidebarMenu>
      {items.map(({ to, label, icon: Icon, exact, badge }) => (
        <SidebarMenuItem key={to}>
          <SidebarMenuButton
            asChild
            isActive={exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)}
            tooltip={label}
          >
            <Link to={to} onClick={() => setOpenMobile(false)}>
              <Icon />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
          {badge === 'nodes' && offline > 0 && (
            <SidebarMenuBadge className="bg-red-500/15 text-red-700 dark:text-red-300" title="Węzły, które nie odpowiadają">
              {offline}
            </SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { setOpenMobile } = useSidebar()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-open:bg-sidebar-accent">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary uppercase">
            {user.username.slice(0, 2)}
          </span>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate font-medium">{user.username}</span>
            <span className="truncate text-xs text-muted-foreground">{ROLE[user.role]}</span>
          </span>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-48">
        <DropdownMenuLabel className="truncate">{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/konto" onClick={() => setOpenMobile(false)}>
            <CircleUser /> Konto i bezpieczeństwo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AppSidebar() {
  const { isAdmin } = useAuth()
  const { data: cluster } = useCluster()

  return (
    <Sidebar>
      <SidebarHeader className="gap-1 px-3 py-3">
        <Logo className="text-base" />
        {cluster && (
          <p className="truncate pl-10 text-xs text-muted-foreground" title="Koordynator, z którym jesteś połączony">
            {cluster.coordinator.name} · {cluster.coordinator.ip}
          </p>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavItems items={MAIN} />
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracja</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={ADMIN} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
