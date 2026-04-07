import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { STORAGE_KEYS } from '../../utils/constants'
import Footer from '../common/Footer'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, logout } = useAuth()
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

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/chat', label: 'AI Chat', icon: '💬' },
    { path: '/knowledge', label: 'Knowledge Base', icon: '📚' },
    { path: '/tickets', label: role === 'Customer' ? 'My Tickets' : 'Tickets', icon: '🎫' }
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1" style={{ paddingBottom: '4rem' }}>
        <aside
          className={`bg-gray-900 text-white flex flex-col border-r border-gray-700 transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="p-3 flex flex-col gap-1 border-b border-gray-700 min-h-[56px]">
            <div className="flex items-center justify-between">
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
            {!collapsed && role && (
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-gray-400 truncate">
                  {role}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-white truncate"
                >
                  Logout
                </button>
              </div>
            )}
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
            {(role === 'Admin' || role === 'Agent') && (
              <Link
                to="/analytics"
                className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive('/analytics')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">📊</span>
                {!collapsed && <span>Analytics</span>}
              </Link>
            )}
            {role === 'Admin' && (
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
