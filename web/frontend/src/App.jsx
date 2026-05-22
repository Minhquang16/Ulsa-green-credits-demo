import React, { createContext, useContext, useState, useEffect } from 'react'
import { Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth.jsx'
import { ToastProvider, useToast } from './context/ToastContext.jsx'

import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import ClaimsPage from './pages/ClaimsPage.jsx'
import RewardsPage from './pages/RewardsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import TreasuryPage from './pages/TreasuryPage.jsx'

// Prototype Styles
import './styles/base.css'
import './styles/style.css'
import './styles/components.css'

function Layout({ children }) {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()

  if (!user) return <>{children}</>

  const isAdmin = user.role === 'admin'
  const isVerifier = user.role === 'verifier'

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body">
      
      {/* Student/Verifier Topnav (1:1 Prototype HTML) */}
      {user.role === 'student' && (
        <header id="studentNav" className="w-full py-5 bg-[#f3fcef] shadow-[0_8px_32px_rgba(22,29,22,0.06)] sticky top-0 z-50 glass-header">
          <nav className="flex justify-between items-center px-8 lg:px-12 max-w-[1600px] mx-auto w-full">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => nav('/dashboard')}>
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={new URL('./ulsa_logo.png', import.meta.url).href} alt="ULSA Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-primary font-headline">ULSA Green Credit</span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-headline text-sm tracking-wide font-medium">
              <Link className={"nav-link px-3 py-1 " + (loc.pathname === '/dashboard' ? 'active' : 'text-[#161d16]/60')} to="/dashboard">Dashboard</Link>
              <Link className={"nav-link px-3 py-1 " + (loc.pathname === '/events' ? 'active' : 'text-[#161d16]/60')} to="/events">Hoạt động</Link>
              <Link className={"nav-link px-3 py-1 " + (loc.pathname === '/claims' ? 'active' : 'text-[#161d16]/60')} to="/claims">Ghi nhận</Link>
              <Link className={"nav-link px-3 py-1 " + (loc.pathname === '/rewards' ? 'active' : 'text-[#161d16]/60')} to="/rewards">Đổi ưu đãi</Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-on-surface-variant hidden md:block">{user.full_name || 'Sinh viên'}</span>
              <button onClick={logout} className="text-sm font-semibold text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined text-lg align-middle">logout</span>
              </button>
            </div>
          </nav>
        </header>
      )}

      {/* Admin/Verifier Sidebar (1:1 Prototype HTML) */}
      {user.role !== 'student' && (
        <aside id="adminSidebar" className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-outline-variant/20 z-[60] py-8 px-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-9 h-9 flex items-center justify-center">
              <img src={new URL('./ulsa_logo.png', import.meta.url).href} alt="ULSA Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-black tracking-tight text-inverse-surface font-headline leading-tight">ULSA <span className="text-primary">{isAdmin ? 'Admin' : 'Verifier'}</span></span>
          </div>

          <nav className="flex-grow space-y-2">
            <Link className={"sidebar-link flex items-center " + (loc.pathname === '/dashboard' ? 'active' : '')} to="/dashboard">
              <span className="material-symbols-outlined">dashboard</span> <span>Dashboard</span>
            </Link>
            <Link className={"sidebar-link flex items-center " + (loc.pathname === '/events' ? 'active' : '')} to="/events">
              <span className="material-symbols-outlined">event_note</span> <span>Quản lý Hoạt động</span>
            </Link>
            <Link className={"sidebar-link flex items-center " + (loc.pathname === '/claims' ? 'active' : '')} to="/claims">
              <span className="material-symbols-outlined">verified</span> <span>Phê duyệt Claims</span>
            </Link>
            <Link className={"sidebar-link flex items-center " + (loc.pathname === '/rewards' ? 'active' : '')} to="/rewards">
              <span className="material-symbols-outlined">redeem</span> <span>Ưu đãi &amp; Quà tặng</span>
            </Link>
            {isAdmin && (
              <>
                <Link className={"sidebar-link flex items-center " + (loc.pathname === '/admin' ? 'active' : '')} to="/admin">
                  <span className="material-symbols-outlined">manage_accounts</span> <span>Quản trị Users & Stats</span>
                </Link>
                <Link className={"sidebar-link flex items-center " + (loc.pathname === '/treasury' ? 'active' : '')} to="/treasury">
                  <span className="material-symbols-outlined">account_balance</span> <span>Quản lý Kho quỹ</span>
                </Link>
              </>
            )}
          </nav>

          <div className="mt-auto pt-8 border-t border-outline-variant/10">
            <div className="bg-surface-container rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full editorial-gradient flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-base">person</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-on-surface truncate">{user.full_name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate opacity-70">{user.role?.toUpperCase()}</p>
                </div>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-error/5 hover:border-error/20 hover:text-error transition-all">
              <span className="material-symbols-outlined text-lg">logout</span> Đăng xuất
            </button>
          </div>
        </aside>
      )}

      <div className={"transition-all duration-300 " + (user.role !== 'student' ? "pl-72" : "")}>
        {children}
        
        <footer className="mt-10 py-8 text-center border-t border-outline-variant/10">
          <p className="text-on-surface-variant/50 text-[11px] leading-relaxed">
            © 2024 ULSA Green Credit. Phát triển bởi Ban Công nghệ Thông tin.<br/>
            Demo chạy local: Web (3000) • API (8080) • Hardhat RPC (8545)
          </p>
        </footer>
      </div>
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
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/events" element={<RequireAuth><EventsPage /></RequireAuth>} />
            <Route path="/claims" element={<RequireAuth><ClaimsPage /></RequireAuth>} />
            <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
            <Route path="/treasury" element={<RequireAuth><TreasuryPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AuthProvider>
  )
}
