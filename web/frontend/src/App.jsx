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
  const [showSettings, setShowSettings] = useState(false)
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
                  onClick={() => setShowSettings(true)} 
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
      {showSettings && (
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} api={api} user={user} showToast={showToast} />
      )}
    </div>
  )
}

function SettingsModal({ isOpen, onClose, api, user, showToast }) {
  const [activeTab, setActiveTab] = useState("profile") // profile | wallet | password
  const [busy, setBusy] = useState(false)

  // Hồ sơ sinh viên
  const [fullName, setFullName] = useState(user?.full_name || "")
  const [className, setClassName] = useState("")
  const [cohort, setCohort] = useState("")
  const [birthDate, setBirthDate] = useState("")

  // Mật khẩu
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)

  // Ví cá nhân
  const [walletKey, setWalletKey] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // Gọi API tải thêm chi tiết hồ sơ từ DB khi mở Modal
  useEffect(() => {
    if (isOpen) {
      api('/me').then(res => {
        if (res) {
          setFullName(res.full_name || "")
          setClassName(res.class_name || "")
          setCohort(res.cohort || "")
          setBirthDate(res.birth_date || "")
        }
      }).catch(console.error)
    }
  }, [isOpen, api])

  // Gửi cập nhật thông tin hồ sơ
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api('/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          class_name: className,
          cohort: cohort,
          birth_date: birthDate
        })
      })
      if (res && res.success) {
        showToast("✅ Cập nhật thông tin thành công!")
      }
    } catch (err) {
      showToast("❌ Lỗi: " + err.message)
    } finally {
      setBusy(false)
    }
  }

  // Đổi mật khẩu tài khoản
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast("⚠️ Mật khẩu xác nhận không khớp!")
      return
    }
    setBusy(true)
    try {
      const res = await api('/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      })
      if (res && res.success) {
        showToast("✅ Đổi mật khẩu thành công!")
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      showToast("❌ Lỗi: " + err.message)
    } finally {
      setBusy(false)
    }
  }

  // Lấy khóa bí mật ví blockchain
  const handleRevealKey = async () => {
    if (walletKey) {
      setShowKey(true);
      return;
    }
    setBusy(true)
    try {
      const res = await api('/me/wallet-key')
      if (res && res.success) {
        setWalletKey(res)
        setShowKey(true)
      }
    } catch (err) {
      showToast("❌ Không thể lấy khóa ví: " + err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCopyKey = () => {
    if (walletKey?.privateKey) {
      navigator.clipboard.writeText(walletKey.privateKey)
      setCopiedKey(true)
      showToast("Đã sao chép Khóa bí mật ví!")
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full mx-4 overflow-hidden flex flex-col md:flex-row h-[480px]">
        
        {/* Thanh điều hướng Modal bên trái */}
        <div className="w-full md:w-56 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-1.5 shrink-0 justify-between">
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-4">Cài đặt tài khoản</h3>
            
            <button onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-200/50'}`}>
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Thông tin cá nhân</span>
            </button>

            <button onClick={() => setActiveTab("wallet")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'wallet' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-200/50'}`}>
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              <span>Ví Blockchain</span>
            </button>

            <button onClick={() => setActiveTab("password")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'password' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-200/50'}`}>
              <span className="material-symbols-outlined text-lg">lock</span>
              <span>Đổi mật khẩu</span>
            </button>
          </div>

          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-200/80 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-300 transition-colors">
            Đóng
          </button>
        </div>

        {/* Nội dung tương ứng bên phải */}
        <div className="flex-1 p-6 overflow-y-auto relative flex flex-col justify-between">
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h4 className="font-extrabold text-base text-gray-800">Thông tin cá nhân</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Cập nhật hồ sơ sinh viên của bạn trong hệ thống.</p>
                </div>
                <div className="h-px bg-gray-100 my-2" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Họ và tên</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Lớp học</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      placeholder="VD: D16-QLĐất đai" value={className} onChange={e => setClassName(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Niên khóa (Khóa)</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      placeholder="VD: K16" value={cohort} onChange={e => setCohort(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Ngày sinh</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      placeholder="VD: 15/08/2004" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={busy}
                className="w-full mt-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-opacity">
                {busy ? "Đang cập nhật..." : "Cập nhật hồ sơ"}
              </button>
            </form>
          )}

          {/* TAB 2: VÍ BLOCKCHAIN */}
          {activeTab === "wallet" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h4 className="font-extrabold text-base text-gray-800">Ví Blockchain cá nhân</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Quản lý và sao lưu tài sản UGC của bạn.</p>
                </div>
                <div className="h-px bg-gray-100 my-2" />

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">info</span> Địa chỉ ví của bạn
                  </p>
                  <p className="font-mono text-[11px] text-emerald-700 bg-white border border-emerald-100 rounded-lg p-2 break-all select-all font-bold">
                    {user?.wallet_address || "—"}
                  </p>
                </div>

                {!showKey ? (
                  <div className="border border-orange-200 bg-orange-50/50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs text-orange-800 font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">warning</span> Cảnh báo bảo mật
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Khóa bí mật (Private Key) cho phép truy cập trực tiếp vào tài sản tín chỉ của bạn. Tuyệt đối không chia sẻ khóa này cho bất kỳ ai!
                    </p>
                    <button type="button" onClick={handleRevealKey} disabled={busy}
                      className="py-2 px-4 bg-orange-600 text-white rounded-xl font-bold text-[11px] hover:bg-orange-700 transition-colors shadow-sm">
                      {busy ? "Đang kết nối..." : "Hiện Khóa Bí Mật (Private Key)"}
                    </button>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50/30 rounded-2xl p-4 space-y-3">
                    <p className="text-xs text-red-800 font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">vpn_key</span> Khóa bí mật của ví
                    </p>
                    <div className="flex items-center gap-2 bg-white border border-red-100 rounded-lg p-2">
                      <p className="font-mono text-[10px] text-red-700 break-all select-all font-bold flex-1">
                        {walletKey?.privateKey || "—"}
                      </p>
                      <button type="button" onClick={handleCopyKey} className="text-gray-400 hover:text-gray-700 shrink-0">
                        <span className="material-symbols-outlined text-base">{copiedKey ? "check" : "content_copy"}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Đường dẫn ví: <code className="bg-gray-150 rounded px-1 text-[9px]">{walletKey?.path}</code>
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 text-center font-medium mt-4">
                Mạng: Hardhat Localhost (Chain ID: 31337)
              </div>
            </div>
          )}

          {/* TAB 3: ĐỔI MẬT KHẨU */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h4 className="font-extrabold text-base text-gray-800">Đổi mật khẩu</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Đảm bảo mật khẩu mạnh để bảo vệ tài khoản.</p>
                </div>
                <div className="h-px bg-gray-100 my-2" />

                <div className="space-y-2">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Mật khẩu cũ</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      type={showOldPass ? "text" : "password"} required
                      value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-6 text-gray-400 hover:text-gray-600 flex items-center">
                      <span className="material-symbols-outlined text-base">{showOldPass ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Mật khẩu mới</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                        type={showNewPass ? "text" : "password"} required
                        value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-6 text-gray-400 hover:text-gray-600 flex items-center">
                        <span className="material-symbols-outlined text-base">{showNewPass ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Xác nhận mật khẩu</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                        type="password" required
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={busy}
                className="w-full mt-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-opacity">
                {busy ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </button>
            </form>
          )}

        </div>
      </div>
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
