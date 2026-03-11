import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import CreateTicket from './pages/CreateTicket'
import ContactSupport from './pages/ContactSupport'
import Escalate from './pages/Escalate'
import Tickets from './pages/Tickets'
import Knowledge from './pages/Knowledge'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/faq" element={<Navigate to="/knowledge?type=faq" replace />} />
                <Route path="/policy" element={<Navigate to="/knowledge?type=policy" replace />} />
                <Route path="/knowledge" element={<Knowledge />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/create-ticket" element={<CreateTicket />} />
                <Route path="/contact-support" element={<ContactSupport />} />
                <Route path="/escalate" element={<Escalate />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
