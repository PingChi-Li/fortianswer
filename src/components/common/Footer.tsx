import { useState, useEffect } from 'react'
import { useUser } from '../../contexts/UserContext'
import { APP_VERSION } from '../../utils/constants'
import { apiService } from '../../services/api'

export default function Footer() {
  const { footerContacts } = useUser()
  const [healthy, setHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await apiService.healthCheck()
        if (!cancelled) setHealthy(res.status === 'healthy')
      } catch {
        if (!cancelled) setHealthy(false)
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white py-3 px-4 border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-gray-400">
          FortiAnswer &copy; {new Date().getFullYear()}
        </div>
        <div className="text-gray-300">
          Sales Rep: {footerContacts.salesRep} | Technical Consultant: {footerContacts.technicalConsultant}
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <span>{APP_VERSION}</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                healthy === true ? 'bg-green-500' : healthy === false ? 'bg-red-500' : 'bg-gray-500'
              }`}
              title={healthy === true ? 'Online' : healthy === false ? 'Offline' : 'Checking...'}
            />
            {healthy === true ? 'Online' : healthy === false ? 'Offline' : '...'}
          </span>
        </div>
      </div>
    </footer>
  )
}
