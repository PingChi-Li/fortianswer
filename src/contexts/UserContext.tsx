import { createContext, useContext, ReactNode } from 'react'

export interface User {
  name: string
  email: string
  role: string
  isAdmin: boolean
}

export interface FooterContacts {
  salesRep: string
  technicalConsultant: string
}

interface UserContextValue {
  user: User
  footerContacts: FooterContacts
}

const defaultUser: User = {
  name: 'User',
  email: 'user@company.com',
  role: 'Viewer',
  isAdmin: false
}

const defaultFooterContacts: FooterContacts = {
  salesRep: 'Jane Smith',
  technicalConsultant: 'John Doe'
}

const UserContext = createContext<UserContextValue>({
  user: defaultUser,
  footerContacts: defaultFooterContacts
})

export function UserProvider({ children }: { children: ReactNode }) {
  const value: UserContextValue = {
    user: { ...defaultUser, isAdmin: true },
    footerContacts: defaultFooterContacts
  }
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
