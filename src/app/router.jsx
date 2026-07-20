import { createBrowserRouter, Navigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import CoachLayout from '../layouts/CoachLayout'
import Dashboard from '../pages/admin/Dashboard'
import Members from '../pages/admin/Members'
import MemberProfile from '../pages/admin/MemberProfile'
import Subscriptions from '../pages/admin/Subscriptions'
import Finance from '../pages/admin/Finance'
import Equipment from '../pages/admin/Equipment'
import Reports from '../pages/admin/Reports'
import Shop from '../pages/admin/Shop'
import EntryExit from '../pages/admin/EntryExit'
import Settings from '../pages/admin/Settings'
import Requests from '../pages/admin/Requests'
import AdminProfile from '../pages/admin/Profile'
import CoachProfile from '../pages/coach/Profile'
import Clients from '../pages/coach/Clients'
import Programs, { ProgramDetails } from '../pages/coach/Programs'
import Schedule from '../pages/coach/Schedule'
import Messaging from '../pages/coach/Messaging'
import LoginPage from '../pages/auth/LoginPage'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage'
// ❌ REMOVE THIS LINE: import ScanPage from '../pages/ScanPage'
import { useTranslation } from 'react-i18next'
import { getDefaultRouteForRole, getToken, getUserRole, normalizeRole } from '../features/auth/utils/authHelpers'

function ComingSoonPage({ title }) {
  const { t } = useTranslation()
  return (
    <div className="p-8 h-full flex items-center justify-center">
      <h1 className="text-2xl font-bold text-secondary-500">{t(`${title} - Coming Soon`)}</h1>
    </div>
  )
}

function RequireAuth({ allowedRoles, children }) {
  const token = getToken()
  const role = normalizeRole(getUserRole())

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return children
}

function StartRoute() {
  const token = getToken()
  const role = normalizeRole(getUserRole())

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultRouteForRole(role)} replace />
}

function LoginRoute() {
  const token = getToken()
  const role = normalizeRole(getUserRole())

  if (token) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return <LoginPage />
}

export const router = createBrowserRouter([
  {
    path: '/admin',
    element: (
      <RequireAuth allowedRoles={['admin']}>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: '/admin',
        element: <Dashboard />,
      },
      {
        path: '/admin/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/admin/members',
        element: <Members />,
      },
      {
        path: '/admin/member-profile',
        element: <MemberProfile />,
      },
      {
        path: '/admin/subscriptions',
        element: <Subscriptions />,
      },
      {
        path: '/admin/finance',
        element: <Finance />,
      },
      {
        path: '/admin/equipment',
        element: <Equipment />,
      },
      {
        path: '/admin/reports',
        element: <Reports />,
      },
      {
        path: '/admin/shop',
        element: <Shop />,
      },
      {
        path: '/admin/requests',
        element: <Requests />,
      },
      {
        path: '/admin/entry-exit',
        element: <EntryExit />,
      },
      {
        path: '/admin/profile',
        element: <AdminProfile />,
      },
      {
        path: '/admin/settings',
        element: <Settings scope="admin" />,
      },
    ],
  },
  {
    path: '/coach',
    element: (
      <RequireAuth allowedRoles={['coach']}>
        <CoachLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: '/coach',
        element: <CoachProfile />,
      },
      {
        path: '/coach/dashboard',
        element: <CoachProfile />,
      },
      {
        path: '/coach/profile',
        element: <CoachProfile />,
      },
      {
        path: '/coach/clients',
        element: <Clients />,
      },
      {
        path: '/coach/programs',
        element: <Programs />,
      },
      {
        path: '/coach/programs/:programId',
        element: <ProgramDetails />,
      },
      {
        path: '/coach/exercises',
        element: <ComingSoonPage title="Exercises" />,
      },
      {
        path: '/coach/schedule',
        element: <Schedule />,
      },
      {
        path: '/coach/messaging',
        element: <Messaging />,
      },
      {
        path: '/coach/settings',
        element: <Settings scope="coach" />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginRoute />,
  },
  {
    path: '/confirm-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/',
    element: <StartRoute />,
  },
])