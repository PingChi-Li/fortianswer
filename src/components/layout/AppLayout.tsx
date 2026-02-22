import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { STORAGE_KEYS } from '../../utils/constants'
import Footer from '../common/Footer'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/chat', label: 'AI Chat', icon: '💬' },
  { path: '/knowledge', label: 'Knowledge Base', icon: '📚' },
  { path: '/tickets', label: 'My Tickets', icon: '🎫' }
]

export default function AppLayout() {
  const location = useLocation()
  const { user } = useUser()
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(collapsed))
  }, [collapsed])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1" style={{ paddingBottom: '4rem' }}>
        <aside
          className={`bg-gray-900 text-white flex flex-col border-r border-gray-700 transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="p-3 flex items-center justify-between border-b border-gray-700 min-h-[56px]">
            {!collapsed && (
              <Link to="/" className="text-lg font-bold text-blue-400 truncate">
                FortiAnswer
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded hover:bg-gray-700 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
          <nav className="flex-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
            {user.isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive('/admin')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">⚙️</span>
                {!collapsed && <span>Admin Panel</span>}
              </Link>
            )}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
