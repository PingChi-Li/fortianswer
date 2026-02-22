import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/chat', label: 'Chat' },
    { path: '/faq', label: 'FAQ' },
    { path: '/policy', label: 'Policy' },
    { path: '/admin', label: 'Admin' }
  ]

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap">
          <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            FortiAnswer
          </Link>
          <ul className="flex space-x-2 md:space-x-6 flex-wrap">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`px-2 md:px-3 py-2 rounded-md transition-colors text-sm md:text-base ${
                    isActive(link.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
