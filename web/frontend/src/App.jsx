import React from 'react'
import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import ClaimsPage from './pages/ClaimsPage.jsx'
import RewardsPage from './pages/RewardsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

function Layout({ children }) {
  const { user, logout } = useAuth()
  const loc = useLocation()

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand">ULSA Green Credit (Demo)</span>
          {user && (
            <>
              <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
                <span className="navbar-toggler-icon"></span>
              </button>
              <div className="collapse navbar-collapse" id="nav">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item"><Link className={"nav-link" + (loc.pathname==='/dashboard'?' active':'')} to="/dashboard">Dashboard</Link></li>
                  <li className="nav-item"><Link className={"nav-link" + (loc.pathname==='/events'?' active':'')} to="/events">Hoạt động</Link></li>
                  <li className="nav-item"><Link className={"nav-link" + (loc.pathname==='/claims'?' active':'')} to="/claims">Ghi nhận</Link></li>
                  <li className="nav-item"><Link className={"nav-link" + (loc.pathname==='/rewards'?' active':'')} to="/rewards">Đổi ưu đãi</Link></li>
                  {user.role === 'admin' && (
                    <li className="nav-item"><Link className={"nav-link" + (loc.pathname==='/admin'?' active':'')} to="/admin">Admin</Link></li>
                  )}
                </ul>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-light small">
                    {user.full_name} ({user.role})
                  </span>
                  <button className="btn btn-outline-light btn-sm" onClick={logout}>Đăng xuất</button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>
      <div className="container my-4">
        {children}
      </div>
      <footer className="container my-5 text-muted small">
        Demo chạy local: Web (3000) • API (8080) • Hardhat RPC (8545) • Postgres (5432)
      </footer>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/events" element={<RequireAuth><EventsPage /></RequireAuth>} />
          <Route path="/claims" element={<RequireAuth><ClaimsPage /></RequireAuth>} />
          <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
