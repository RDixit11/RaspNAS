import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from '@/components/AdminRoute'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Spinner } from '@/components/ui/spinner'
import AuthLayout from '@/layouts/AuthLayout'
import Login from '@/pages/Login'

// Część po zalogowaniu ładuje się osobno — strona logowania pobiera mniej kodu
const AppLayout = lazy(() => import('@/layouts/AppLayout'))
const Overview = lazy(() => import('@/pages/Overview'))
const Files = lazy(() => import('@/pages/Files'))
const ShareFiles = lazy(() => import('@/pages/ShareFiles'))
const Nodes = lazy(() => import('@/pages/admin/Nodes'))
const NodeDetail = lazy(() => import('@/pages/admin/NodeDetail'))
const Shares = lazy(() => import('@/pages/admin/Shares'))
const Users = lazy(() => import('@/pages/admin/Users'))
const Backups = lazy(() => import('@/pages/admin/Backups'))
const Logs = lazy(() => import('@/pages/admin/Logs'))
const Account = lazy(() => import('@/pages/Account'))

function PageLoader() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/pliki" element={<Files />} />
            <Route path="/pliki/:shareId" element={<ShareFiles />} />
            <Route path="/konto" element={<Account />} />
            <Route element={<AdminRoute />}>
              <Route path="/wezly" element={<Nodes />} />
              <Route path="/wezly/:nodeId" element={<NodeDetail />} />
              <Route path="/udzialy" element={<Shares />} />
              <Route path="/uzytkownicy" element={<Users />} />
              <Route path="/kopie" element={<Backups />} />
              <Route path="/dziennik" element={<Logs />} />
            </Route>
          </Route>
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
