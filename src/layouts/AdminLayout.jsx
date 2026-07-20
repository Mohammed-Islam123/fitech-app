import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../components/shared/Sidebar'
import { Navbar } from '../components/shared/Navbar'
import { applyScopedLanguage, applyScopedTheme } from '../components/settings/settingsPreferences'

export default function AdminLayout() {
  const location = useLocation()
  const { i18n } = useTranslation()

  useEffect(() => {
    applyScopedLanguage(i18n, 'admin')
    applyScopedTheme('admin')
  }, [i18n])
    
      const getPageTitle = () => {
          const titles = {
                '/admin/dashboard': 'Dashboard',
                  '/admin/members': 'Members',
                  '/admin/entry-exit': 'Entry / Exit',
                  '/admin/subscriptions': 'Subscriptions',
                  '/admin/finance': 'Finance',
                  '/admin/equipment': 'Equipment',
                  '/admin/reports': 'Reports',
                  '/admin/shop': 'Shop',
                  '/admin/settings': 'Settings',
                  '/admin/requests': 'Requests',
                  '/admin/profile': 'Profile',
                  '/admin': 'Dashboard'   }

                        return titles[location.pathname] || 'Dashboard'
                          }

return (
<div className="flex h-screen bg-secondary-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar title={getPageTitle()} role="admin" />
            <main className="flex-1 overflow-y-auto">
                  <Outlet />
            </main>
      </div>
</div>
      )
}
                                                            
