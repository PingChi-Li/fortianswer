import { useState, useEffect, useRef, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ApiClientError } from '../services/apiClient'
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_USERNAME_MAX_LENGTH
} from '../utils/authInputLimits'

const FAILED_ATTEMPT_COOLDOWN_MS = 60_000
const FAILED_ATTEMPTS_BEFORE_COOLDOWN = 5

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [, setCooldownTick] = useState(0)
  const failStreak = useRef(0)

  const cooldownSecondsLeft =
    cooldownEndsAt != null ? Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)) : 0
  const inCooldown = cooldownSecondsLeft > 0

  useEffect(() => {
    if (!cooldownEndsAt) return
    const id = window.setInterval(() => {
      setCooldownTick((t) => t + 1)
      if (Date.now() >= cooldownEndsAt) {
        setCooldownEndsAt(null)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldownEndsAt])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (inCooldown) {
      setError(`Too many sign-in attempts. Please wait ${cooldownSecondsLeft} seconds.`)
      return
    }

    const trimmed = username.trim()
    if (!trimmed) {
      setError('Username is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }
    if (trimmed.length > AUTH_USERNAME_MAX_LENGTH) {
      setError(`Username must be at most ${AUTH_USERNAME_MAX_LENGTH} characters`)
      return
    }
    if (password.length > AUTH_PASSWORD_MAX_LENGTH) {
      setError(`Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters`)
      return
    }

    setLoading(true)
    try {
      await login(trimmed, password)
      failStreak.current = 0
      setCooldownEndsAt(null)
      navigate('/', { replace: true })
    } catch (err) {
      const isRateLimited = err instanceof ApiClientError && err.status === 429
      if (!isRateLimited) {
        failStreak.current += 1
        if (failStreak.current >= FAILED_ATTEMPTS_BEFORE_COOLDOWN) {
          failStreak.current = 0
          setCooldownEndsAt(Date.now() + FAILED_ATTEMPT_COOLDOWN_MS)
        }
      }
      setError(err instanceof Error ? err.message : 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            FortiAnswer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                autoComplete="username"
                maxLength={AUTH_USERNAME_MAX_LENGTH}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                autoComplete="current-password"
                maxLength={AUTH_PASSWORD_MAX_LENGTH}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please set up MFA to protect you and your company&apos;s information.
            </p>
            <button
              type="submit"
              disabled={loading || inCooldown}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : inCooldown ? `Wait ${cooldownSecondsLeft}s` : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
