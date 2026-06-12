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
import ProvenancePage from './pages/ProvenancePage.jsx'
import TrainingPointsPage from './pages/TrainingPointsPage.jsx'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ChatBot from './components/ChatBot.jsx'
// Prototype Styles
import './styles/base.css'
import './styles/style.css'
import './styles/components.css'

function Layout({ children }) {
  const { user, logout, api } = useAuth()
  const { showToast } = useToast()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [studentStats, setStudentStats] = useState({ pending: 0, totalEarned: 0 })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()

  useEffect(() => {
    if (user?.role === 'student') {
      api('/me/claims').then(res => {
        const claims = res || []
        const pending = claims.filter(c => c.status === 'submitted').length
        const totalEarned = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.credit_amount || 0), 0)
        setStudentStats({ pending, totalEarned })
      }).catch(console.error)
    }
  }, [user, api])

  // Background Sync logic for offline check-ins
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const syncQueue = async () => {
      if (!navigator.onLine) return;
      const queue = JSON.parse(localStorage.getItem('offline_checkin_queue') || '[]');
      if (queue.length === 0) return;

      const remainingQueue = [];
      for (const checkin of queue) {
        try {
          await api('/checkin', {
            method: 'POST',
            body: JSON.stringify(checkin)
          });
          console.log('Synced offline checkin:', checkin.event_id);
        } catch (err) {
          if (err.message && err.message.includes('Already checked in')) {
            // Already synced or checked in normally, safe to remove from queue
            console.log('Offline checkin skipped (already checked in):', checkin.event_id);
          } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network'))) {
            // Network issue, keep in queue
            remainingQueue.push(checkin);
          } else {
            // Other errors (e.g. event ended, invalid token) might mean we should discard it to prevent infinite loop
            // But for safety, we discard it if it's a permanent 400 error. 
            console.error('Failed to sync offline checkin:', err.message);
          }
        }
      }
      localStorage.setItem('offline_checkin_queue', JSON.stringify(remainingQueue));
    };

    // Try syncing on initial load
    syncQueue();

    // Listen for online event
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, [user, api]);

  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/register'
  if (!user || isAuthPage) return <>{children}</>

  const isAdmin = user.role === 'admin'
  const isVerifier = user.role === 'verifier'

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body">
      
      {/* Student/Verifier Topnav (Single-Row Transparent Layout) */}
      {user.role === 'student' && (
        <header id="studentNav" className="w-full sticky top-0 z-50 bg-[#f5f5f5]/80 backdrop-blur-md h-16">
          <div className="max-w-[1200px] mx-auto h-full">
            <nav className="flex justify-between items-center w-full h-full px-6 py-0">
              
              {/* Left Side: Hamburger & Logo */}
              <div className="flex items-center gap-3 w-[250px]">
                {/* Mobile Hamburger Button */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-gray-700 bg-gray-100/80 hover:bg-gray-200 transition-colors"
                  title="Menu"
                >
                  <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
                </button>

                <div className="flex items-center cursor-pointer" onClick={() => nav('/dashboard')}>
                  <div className="h-[20px] flex items-center ml-2 lg:ml-6">
                    <img src={new URL('./logo_web.png', import.meta.url).href} alt="ULSA Logo" className="h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Center: Nav Links with premium hover transition animations */}
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
                {[
                  { path: '/dashboard', label: 'Tổng quan' },
                  { path: '/events', label: 'Hoạt động' },
                  { path: '/claims', label: 'Ghi nhận' },
                  { path: '/training-points', label: 'Điểm rèn luyện' },
                  { path: '/rewards', label: 'Ưu đãi' }
                ].map(link => {
                  const isActive = loc.pathname === link.path;
                  return (
                    <Link key={link.path} to={link.path} className="relative flex flex-col items-center group py-2">
                      <span className={`text-[14.5px] transition-all duration-300 transform group-hover:-translate-y-0.5 ${isActive ? 'text-emerald-600 font-bold' : 'text-gray-500 font-medium group-hover:text-gray-900'}`}>
                        {link.label}
                      </span>
                      {/* Active/Hover Underline indicator */}
                      <div className={`absolute bottom-0 h-[2px] bg-emerald-500 transition-all duration-300 ease-out left-1/2 -translate-x-1/2 ${
                        isActive 
                          ? 'w-full opacity-100 shadow-[0_1px_4px_rgba(16,185,129,0.4)]' 
                          : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60'
                      }`} />
                    </Link>
                  );
                })}
              </div>

              {/* Right Side: Icons & Profile Dropdown */}
              <div className="flex items-center gap-3 w-[280px] justify-end">
                
                {/* Cài đặt (Settings) */}
                <button 
                  onClick={() => showToast('Tính năng Cài đặt tài khoản đang được phát triển!')} 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 bg-gray-100/80 hover:bg-gray-200 transition-colors"
                  title="Cài đặt"
                >
                  <span className="material-symbols-outlined" style={{ fontSize:20, fontVariationSettings: "'wght' 400" }}>settings</span>
                </button>

                {/* Notifications */}
                <div className="relative flex items-center">
                  <button 
                    onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${showNotif ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700 bg-gray-100/80 hover:bg-gray-200'}`}
                    title="Thông báo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:20, fontVariationSettings: "'wght' 400" }}>notifications</span>
                    {studentStats.pending > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotif && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                      <div className="absolute right-0 top-12 mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 py-0 z-50 animate-in fade-in duration-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                          <h3 className="font-bold text-[14px] text-gray-800">Thông báo</h3>
                          <button onClick={() => setShowNotif(false)} className="text-[12px] text-gray-500 hover:text-gray-800 font-medium">Đóng</button>
                        </div>
                        <div className="max-h-[350px] overflow-y-auto flex flex-col">
                          {studentStats.pending > 0 && (
                            <div className="flex gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 bg-orange-50/50 cursor-pointer" onClick={() => { setShowNotif(false); nav('/claims'); }}>
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 border border-orange-200">
                                <span className="material-symbols-outlined text-orange-600 text-[20px]">pending_actions</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-[13px] text-gray-800 font-bold">Yêu cầu chờ duyệt</p>
                                <p className="text-[13px] text-gray-600 mt-0.5">Bạn có <span className="font-bold text-orange-600">{studentStats.pending} yêu cầu</span> đang đợi người duyệt xác nhận.</p>
                              </div>
                            </div>
                          )}
                          {studentStats.totalEarned > 0 && (
                            <div className="flex gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 cursor-pointer" onClick={() => { setShowNotif(false); nav('/claims'); }}>
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                                <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-[13px] text-gray-800 font-bold">Hoạt động đã ghi nhận</p>
                                <p className="text-[13px] text-gray-600 mt-0.5">Bạn đã được cấp tổng cộng <span className="font-bold text-emerald-600">{studentStats.totalEarned} UGC</span>. Cố gắng phát huy nhé!</p>
                              </div>
                            </div>
                          )}
                          {studentStats.pending === 0 && studentStats.totalEarned === 0 && (
                            <div className="py-8 flex flex-col items-center justify-center px-4">
                              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                <span className="material-symbols-outlined text-[24px] text-gray-300">notifications_off</span>
                              </div>
                              <p className="text-[13px] font-medium text-gray-600">Chưa có thông báo nào</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile/Avatar dropdown */}
                <div className="relative">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity ml-2"
                    onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
                    title="Menu tài khoản"
                  >
                    <Avatar className="w-10 h-10 shadow-sm border border-slate-200/60">
                      <AvatarImage src={user.student_card_image ? `/api${user.student_card_image}` : ''} alt={user.full_name || 'SV'} className="object-cover" />
                      <AvatarFallback className="bg-gray-800 text-white font-black text-[12px]">
                        {user.full_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                      </AvatarFallback>
                      <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                    </Avatar>
                    <div className="hidden md:flex flex-col text-left justify-center">
                      <span className="text-[14px] font-bold text-[#111214] leading-tight">{user.full_name || 'Sinh viên ULSA'}</span>
                      <span className="text-[12.5px] text-gray-500 font-medium leading-tight mt-0.5">{user.email || 'student@ulsa.edu.vn'}</span>
                    </div>
                  </div>

                  {/* Profile Dropdown Menu */}
                  {showProfile && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                      <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 py-2 z-50 animate-in fade-in duration-200">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tài khoản sinh viên</p>
                          <p className="font-bold text-sm text-gray-800 truncate mt-0.5">{user.full_name}</p>
                        </div>
                        <div className="p-1">
                          <button 
                            onClick={() => { setShowProfile(false); showToast('Tính năng Hồ sơ đang được phát triển!') }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-xs text-gray-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            <span>Hồ sơ cá nhân</span>
                          </button>
                          <button 
                            onClick={() => { setShowProfile(false); showToast('Tính năng Cài đặt đang được phát triển!') }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-xs text-gray-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">settings</span>
                            <span>Cài đặt bảo mật</span>
                          </button>
                          <div className="h-px bg-gray-100 my-1 mx-1" />
                          <button 
                            onClick={() => { setShowProfile(false); logout(); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-xs text-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            <span className="font-bold">Đăng xuất</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </nav>
          </div>
        </header>
      )}

      {/* Mobile Drawer menu */}
      {user.role === 'student' && mobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden fixed top-16 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 py-4 px-6 flex flex-col gap-3 animate-in slide-in-from-top duration-200">
            {[
              { path: '/dashboard', label: 'Tổng quan', icon: 'dashboard' },
              { path: '/events', label: 'Hoạt động', icon: 'event_note' },
              { path: '/claims', label: 'Ghi nhận', icon: 'verified' },
              { path: '/training-points', label: 'Điểm rèn luyện', icon: 'school' },
              { path: '/rewards', label: 'Ưu đãi', icon: 'redeem' }
            ].map(link => {
              const isActive = loc.pathname === link.path;
              return (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-bold' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{link.icon}</span>
                  <span className="text-[14.5px]">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Admin/Verifier Sidebar (1:1 Prototype HTML) */}
      {user.role !== 'student' && (
        <aside id="adminSidebar" className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-outline-variant/20 z-[60] pt-2 pb-8 px-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="flex justify-center items-center pb-4 mb-2 border-b border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => nav('/dashboard')}>
            <img src={new URL('./logo_web.png', import.meta.url).href} alt="UGC Logo" className="w-auto object-contain" style={{ maxHeight: '20px' }} />
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
              <div className="pt-2 mt-4 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Quản trị hệ thống</p>
                <Link className={"sidebar-link flex items-center " + (loc.pathname === '/admin' ? 'active' : '')} to="/admin">
                  <span className="material-symbols-outlined">manage_accounts</span> <span>Quản trị Users &amp; Stats</span>
                </Link>
                <Link className={"sidebar-link flex items-center " + (loc.pathname === '/treasury' ? 'active' : '')} to="/treasury">
                  <span className="material-symbols-outlined">account_balance</span> <span>Quản lý Kho quỹ</span>
                </Link>
              </div>
            )}
            <div className="pt-2 mt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Blockchain</p>
              <Link className={"sidebar-link flex items-center " + (loc.pathname === '/provenance' ? 'active' : '')} to="/provenance">
                <span className="material-symbols-outlined">policy</span> <span>Nguồn gốc tín chỉ</span>
              </Link>
            </div>
          </nav>


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
      <ChatBot />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, token } = useAuth()
  
  if (token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

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
            <Route path="/provenance" element={<RequireAuth><ProvenancePage /></RequireAuth>} />
            <Route path="/training-points" element={<RequireAuth><TrainingPointsPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AuthProvider>
  )
}
