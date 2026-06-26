import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth.jsx'
import { ToastProvider, useToast } from './context/ToastContext.jsx'

// Global Error Catcher for debugging White Screen
window.addEventListener('error', (e) => {
  const errDiv = document.createElement('div');
  errDiv.style = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#fef2f2;color:#991b1b;padding:20px;border-bottom:2px solid #ef4444;font-family:monospace;font-size:12px;white-space:pre-wrap;box-shadow:0 4px 6px rgba(0,0,0,0.1);";
  errDiv.innerHTML = `<b>🚨 Ứng dụng bị sập (Crash):</b><br/>${e.message}<br/><br/><i>${e.filename}:${e.lineno}</i><br/><br/><button onclick="this.parentElement.remove()" style="padding:4px 12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;">Đóng</button>`;
  document.body.appendChild(errDiv);
});

// Polyfill process for browser
window.process = { env: { NODE_ENV: 'development' } }

import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import AdminEvents from './pages/admin/AdminEvents.jsx'
import StudentEvents from './pages/student/StudentEvents.jsx'
import AdminClaims from './pages/admin/AdminClaims.jsx'
import StudentClaims from './pages/student/StudentClaims.jsx'
import AdminRewards from './pages/admin/AdminRewards.jsx'
import StudentRewards from './pages/student/StudentRewards.jsx'
import VerifyPage from './pages/public/VerifyPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import TreasuryPage from './pages/admin/TreasuryPage.jsx'
import ProvenancePage from './pages/admin/ProvenancePage.jsx'
import TrainingPointsPage from './pages/shared/TrainingPointsPage.jsx'
import ProfilePage from './pages/shared/ProfilePage.jsx'
import AttendancePage from './pages/student/AttendancePage.jsx'
import HelpPage from './pages/student/HelpPage.jsx' // Force rebuild
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ChatBot from './components/ChatBot.jsx'
// Prototype Styles
import './styles/base.css'
import './styles/style.css'
import './styles/components.css'
import StudentSidebar from './components/StudentSidebar.jsx'
import AdminSidebar from './components/AdminSidebar.jsx'
import { InputGroup, InputGroupAddon, InputGroupInput } from './components/ui/input-group.jsx'
import { Search } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
function Layout({ children }) {
  const { user, logout, api } = useAuth()
  const { showToast } = useToast()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const [studentStats, setStudentStats] = useState({ pending: 0, totalEarned: 0 })
  const [adminStats, setAdminStats] = useState({ pendingClaims: 0 })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true)
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])
  const loc = useLocation()
  const nav = useNavigate()

  const handleGlobalSearch = (event) => {
    event.preventDefault()
    const query = headerSearch.trim()
    if (!query) return

    if (user?.role === 'student') {
      nav(`/student/events?search=${encodeURIComponent(query)}`)
      return
    }

    if (user?.role === 'verifier') {
      nav(`/verifier/dashboard?search=${encodeURIComponent(query)}`)
      return
    }

    nav(`/admin/dashboard?search=${encodeURIComponent(query)}`)
  }

  useEffect(() => {
    if (user?.role === 'student') {
      api('/me/claims').then(res => {
        const claims = res || []
        const pending = claims.filter(c => c.status === 'submitted').length
        const totalEarned = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.credit_amount || 0), 0)
        setStudentStats({ pending, totalEarned })
      }).catch(console.error)
    } else if (user?.role) {
      api('/dashboard/stats?period=month').then(res => {
        setAdminStats({ pendingClaims: res?.pendingClaims ?? 0 })
      }).catch(() => setAdminStats({ pendingClaims: 0 }))
    }
  }, [user, api])

  const notificationCount = user?.role === 'student' ? studentStats.pending : adminStats.pendingClaims

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
    <div
      className="bg-surface text-on-surface min-h-screen font-body flex flex-row"
      data-sidebar={isSidebarCollapsed ? 'collapsed' : 'expanded'}
    >

      {/* Student Sidebar + Phantom spacer (shadcn pattern) */}
      {user.role === 'student' && (
        <>
          {/* Phantom div: invisible, holds space in flex row so main content doesn't shift */}
          <div
            className="hidden lg:block flex-shrink-0 transition-[width] duration-300"
            style={{ width: isSidebarCollapsed ? '65px' : '220px' }}
          />
          <StudentSidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        </>
      )}
      {/* Admin/Verifier Sidebar */}
      {user.role !== 'student' && (
        <>
          <div
            className="hidden lg:block flex-shrink-0 transition-[width] duration-300"
            style={{ width: isSidebarCollapsed ? '65px' : '220px' }}
          />
          <AdminSidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isAdmin={isAdmin}
          />
        </>
      )}

      {/* Mobile Admin overlay */}
      {user.role !== 'student' && mobileAdminMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden" onClick={() => setMobileAdminMenuOpen(false)} />
      )}

      {/* Admin Mobile Topbar */}
      {user.role !== 'student' && (
        <header className="lg:hidden w-full sticky top-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 bg-gray-100/80 hover:bg-gray-200 transition-colors"
              title="Menu"
            >
              <span className="material-symbols-outlined">{mobileAdminMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className="h-[20px] flex items-center" onClick={() => nav('/')}>
              <img src={new URL('./logo_web.png', import.meta.url).href} alt="ULSA Logo" className="h-full object-contain" />
            </div>
          </div>
        </header>
      )}

      {/* Main content: flex-1 + min-w-0 — NO padding-left anymore, space is handled by phantom divs above */}
      <div className="flex-1 min-w-0 transition-all duration-300 min-h-screen flex flex-col">

        {/* Top Header Area (Search, Notifications, Profile) */}
        {true && (
          <header className={`${user.role !== 'student' ? 'hidden lg:flex' : 'flex'} sticky top-0 z-40 bg-white border-b border-gray-100 h-20 pr-8 transition-all duration-300 items-center justify-between ${isSidebarCollapsed ? 'pl-[52px]' : 'pl-3'}`}>
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2">
              <Breadcrumb className="hidden lg:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {{
                        '/student/dashboard': 'Trang chủ',
                        '/student/events': 'Hoạt động',
                        '/student/claims': 'Ghi nhận',
                        '/student/rewards': 'Ưu đãi',
                        '/profile': 'Hồ sơ',
                        '/training-points': 'Điểm rèn luyện',
                        '/admin/dashboard': 'Dashboard',
                        '/admin/events': 'Quản lý Hoạt động',
                        '/admin/claims': 'Phê duyệt Claims',
                        '/admin/rewards': 'Ưu đãi & Quà tặng',
                        '/admin/users': 'Quản trị Users & Stats',
                        '/admin/treasury': 'Quản lý Kho quỹ',
                        '/admin/provenance': 'Nguồn gốc tín chỉ',
                        '/verifier/dashboard': 'Dashboard',
                        '/verifier/events': 'Quản lý Hoạt động',
                        '/verifier/claims': 'Phê duyệt Claims',
                        '/verifier/rewards': 'Ưu đãi & Quà tặng',
                        '/verifier/provenance': 'Nguồn gốc tín chỉ'
                      }[loc.pathname] || 'Trang chủ'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Right: Search, Help, Notifications & Profile */}
            <div className="flex items-center gap-5">
              {/* Search Bar */}
              <form onSubmit={handleGlobalSearch} className="hidden md:block w-72">
                <InputGroup className="bg-gray-50 border-gray-100 rounded-full h-10 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                  <InputGroupAddon className="bg-transparent border-none">
                    <button type="submit" aria-label="Tìm kiếm" className="flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                      <Search className="w-4 h-4" />
                    </button>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={headerSearch}
                    onChange={e => setHeaderSearch(e.target.value)}
                    placeholder="Tìm kiếm hoạt động..."
                    className="border-none focus-visible:ring-0 shadow-none px-0 text-[13px]"
                  />
                </InputGroup>
              </form>

              {/* Help */}
              <button
                onClick={() => nav('/help')}
                className="hidden md:flex items-center justify-center transition-all text-gray-500 hover:text-gray-800"
                aria-label="Trợ giúp"
              >
                <span className="material-symbols-outlined text-[24px]">help_outline</span>
              </button>

              {/* Notifications */}
              <div className="relative flex items-center">
                <button
                  onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
                  className={`relative flex items-center justify-center transition-all ${showNotif ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <span className="material-symbols-outlined text-[24px]">notifications</span>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white px-1">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotif && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                    <div className="absolute right-0 top-10 mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 py-0 z-50 animate-in fade-in duration-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                        <h3 className="font-bold text-[14px] text-gray-800">Thông báo</h3>
                        <button onClick={() => setShowNotif(false)} className="text-[12px] text-gray-500 hover:text-gray-800 font-medium">Đóng</button>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto flex flex-col">
                        {notificationCount > 0 && (
                          <div className="flex gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 bg-orange-50/50 cursor-pointer" onClick={() => { setShowNotif(false); nav('/claims'); }}>
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 border border-orange-200">
                              <span className="material-symbols-outlined text-orange-600 text-[20px]">pending_actions</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-[13px] text-gray-800 font-bold">Yêu cầu chờ xử lý</p>
                              <p className="text-[13px] text-gray-600 mt-0.5">Bạn có <span className="font-bold text-orange-600">{notificationCount} yêu cầu</span> đang đợi xác nhận.</p>
                            </div>
                          </div>
                        )}
                        {user?.role === 'student' && studentStats.totalEarned > 0 && (
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
                        {notificationCount === 0 && (!user || user.role !== 'student' || studentStats.totalEarned === 0) && (
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
                >
                  <Avatar className="w-10 h-10 shadow-sm border border-emerald-100">
                    <AvatarImage src={user.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : user.avatar_url) : ''} alt={user.full_name || 'SV'} className="object-cover" />
                    <AvatarFallback className="text-white font-black text-[12px]" style={{ backgroundColor: '#2a3d34' }}>
                      {user.full_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                    </AvatarFallback>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500"></span>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left justify-center">
                    <span className="text-[14px] font-extrabold text-[#111214] leading-tight">{user.full_name || 'Sinh viên ULSA'}</span>
                    <span className="text-[12.5px] text-gray-500 font-semibold leading-tight mt-0.5">{user.email || 'student@ulsa.edu.vn'}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 text-[20px] hidden md:block">expand_more</span>
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
                          onClick={() => { setShowProfile(false); nav('/profile'); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-xs text-gray-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">person</span>
                          <span>Hồ sơ cá nhân</span>
                        </button>
                        <button
                          onClick={() => { setShowProfile(false); setShowSettings(true) }}
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
          </header>
        )}

        <main className="flex-1 w-full relative">
          {children}
        </main>

        <footer className="mt-auto py-8 text-center border-t border-gray-100">
          <p className="text-on-surface-variant/50 text-[11px] leading-relaxed">
            © 2024 ULSA Green Credit. Phát triển bởi Ban Công nghệ Thông tin.<br />
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

const COHORTS = [
  { id: "D17", label: "Khóa D17 (2021 – 2025)" },
  { id: "D18", label: "Khóa D18 (2022 – 2026)" },
  { id: "D19", label: "Khóa D19 (2023 – 2027)" },
  { id: "D20", label: "Khóa D20 (2024 – 2028)" },
  { id: "D21", label: "Khóa D21 (2025 – 2029)" },
];

const MAJORS = [
  { code: "CN", name: "Công nghệ thông tin" },
  { code: "CT", name: "Công tác xã hội" },
  { code: "QL", name: "Quản trị nhân lực" },
  { code: "KT", name: "Kế toán" },
  { code: "QK", name: "Quản trị kinh doanh" },
  { code: "TC", name: "Tài chính - Ngân hàng" },
  { code: "LK", name: "Luật kinh tế" },
  { code: "TL", name: "Tâm lý học" },
  { code: "NA", name: "Ngôn ngữ Anh" },
  { code: "QD", name: "Quản trị Dịch vụ Du lịch và Lữ hành" },
  { code: "KL", name: "Kiểm toán" },
  { code: "HQ", name: "Hệ thống thông tin quản lý" },
  { code: "KM", name: "Kinh tế" },
  { code: "BH", name: "Bảo hiểm" },
  { code: "BT", name: "Bảo trợ xã hội" }
];

const CLASS_COUNTS = {
  CN: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  CT: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  QL: { default: 8, D18: 8, D19: 8, D20: 9, D21: 13 },
  KT: { default: 7, D18: 7, D19: 8, D20: 9, D21: 7 },
  QK: { default: 5, D18: 5, D19: 6, D20: 5, D21: 6 },
  TC: { default: 3, D18: 3, D19: 3, D20: 3, D21: 4 },
  LK: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  TL: { default: 2, D18: 2, D19: 2, D20: 2, D21: 3 },
  NA: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  QD: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  KL: { default: 2, D18: 2, D19: 2, D20: 2, D21: 2 },
  HQ: { default: 1, D18: 1, D19: 1, D20: 1, D21: 1 },
  KM: { default: 1, D18: 1, D19: 1, D20: 1, D21: 1 },
  BH: { default: 1, D18: 1, D19: 1, D20: 2, D21: 1 },
  BT: { default: 1, D18: 1, D19: 2, D20: 2, D21: 1 },
};

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse string value (DD/MM/YYYY) to Date
  const parseValue = (val) => {
    if (!val) return new Date();
    const parts = val.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date();
  };

  const selectedDate = value ? parseValue(value) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    if (value) {
      setViewDate(parseValue(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-11

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectMonth = (m) => {
    setViewDate(new Date(currentYear, m, 1));
  };

  const handleSelectYear = (y) => {
    setViewDate(new Date(y, currentMonth, 1));
  };

  // Generate calendar days
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 (Sun) to 6 (Sat)

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Prev month padding
  const prevMonthDaysCount = getDaysInMonth(currentYear, currentMonth - 1);
  const prevMonthDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: prevMonthDaysCount - i,
      month: currentMonth === 0 ? 11 : currentMonth - 1,
      year: currentMonth === 0 ? currentYear - 1 : currentYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  const currentMonthDays = [];
  for (let i = 1; i <= daysCount; i++) {
    currentMonthDays.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill grid (6 rows of 7 days = 42 cells)
  const totalCells = 42;
  const nextMonthDaysCount = totalCells - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push({
      day: i,
      month: currentMonth === 11 ? 0 : currentMonth + 1,
      year: currentMonth === 11 ? currentYear + 1 : currentYear,
      isCurrentMonth: false,
    });
  }

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const handleSelectDay = (dayObj) => {
    const newDate = new Date(dayObj.year, dayObj.month, dayObj.day);
    const dStr = String(newDate.getDate()).padStart(2, '0');
    const mStr = String(newDate.getMonth() + 1).padStart(2, '0');
    const yStr = newDate.getFullYear();
    onChange(`${dStr}/${mStr}/${yStr}`);
    setOpen(false);
  };

  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  // Year range: 1970 to currentYear
  const years = [];
  const startY = 1970;
  const endY = new Date().getFullYear();
  for (let y = endY; y >= startY; y--) {
    years.push(y);
  }

  const isToday = (day, month, year) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day, month, year) => {
    return selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800 text-left flex items-center justify-between hover:bg-gray-100/50 transition-colors cursor-pointer"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || "VD: 15/08/2004"}
        </span>
        <span className="material-symbols-outlined text-gray-400 text-base">calendar_today</span>
      </button>

      {open && (
        <div className="absolute z-[110] mt-1 bg-white border border-gray-150 rounded-2xl shadow-xl p-2.5 w-[260px] right-0 top-full animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header controls */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>

            <div className="flex items-center gap-1">
              <select
                value={currentMonth}
                onChange={(e) => handleSelectMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => handleSelectYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((wd, i) => (
              <span key={i} className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                {wd}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((dayObj, idx) => {
              const current = isSelected(dayObj.day, dayObj.month, dayObj.year);
              const today = isToday(dayObj.day, dayObj.month, dayObj.year);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(dayObj)}
                  className={`
                    h-[30px] w-[30px] rounded-lg text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer
                    ${!dayObj.isCurrentMonth ? "text-gray-300 hover:bg-gray-50" : ""}
                    ${dayObj.isCurrentMonth && !current && !today ? "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700" : ""}
                    ${today && !current ? "border border-emerald-500 text-emerald-600 font-extrabold bg-emerald-50/30" : ""}
                    ${current ? "bg-emerald-600 text-white shadow-sm font-extrabold" : ""}
                  `}
                >
                  {dayObj.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsModal({ isOpen, onClose, api, user, showToast }) {
  const [activeTab, setActiveTab] = useState("profile") // profile | wallet | password
  const [busy, setBusy] = useState(false)
  const { setUser } = useAuth()

  // Hồ sơ sinh viên
  const [fullName, setFullName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || (user?.username?.includes('@') ? user.username : ""))
  const [className, setClassName] = useState("")
  const [cohort, setCohort] = useState("")
  const [birthDate, setBirthDate] = useState("")

  // Thêm các state hỗ trợ dropdown ULSA
  const [selectedCohort, setSelectedCohort] = useState("")
  const [selectedMajor, setSelectedMajor] = useState("")
  const [customClassName, setCustomClassName] = useState("")
  const [isCustomClass, setIsCustomClass] = useState(false)

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

  // Trả về danh sách lớp học thực tế gợi ý từ văn bản của trường ULSA
  const getClassOptions = (cohortId, majorCode) => {
    if (!cohortId || !majorCode) return [];
    const config = CLASS_COUNTS[majorCode];
    if (!config) return [];
    const count = config[cohortId] || config.default || 2;
    const options = [];
    for (let i = 1; i <= count; i++) {
      const numStr = String(i).padStart(2, '0');
      options.push(`${cohortId}${majorCode}${numStr}`);
    }
    return options;
  };

  // Gọi API tải thêm chi tiết hồ sơ từ DB khi mở Modal
  useEffect(() => {
    if (isOpen) {
      api('/me').then(res => {
        if (res) {
          setFullName(res.full_name || "")
          setEmail(res.email || (res.username?.includes('@') ? res.username : ""))
          setClassName(res.class_name || "")
          setCohort(res.cohort || "")
          setBirthDate(res.birth_date || "")

          // Phân tích thông tin để chọn dropdown tự động
          if (res.cohort) {
            const matchedC = res.cohort.match(/D\d+/)?.[0] || "";
            if (matchedC) {
              setSelectedCohort(matchedC);
            }
          }
          if (res.class_name) {
            const match = res.class_name.match(/^D\d+([A-Z]+)\d+$/);
            if (match) {
              const majorCode = match[1];
              const foundMajor = MAJORS.find(m => m.code === majorCode);
              if (foundMajor) {
                setSelectedMajor(majorCode);
                setIsCustomClass(false);
              } else {
                setIsCustomClass(true);
                setCustomClassName(res.class_name);
              }
            } else {
              setIsCustomClass(true);
              setCustomClassName(res.class_name);
            }
          }
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
          email: email, // Gửi email lên backend (cần update backend để hỗ trợ lưu email)
          class_name: className,
          cohort: cohort,
          birth_date: birthDate
        })
      })
      if (res && res.success) {
        showToast("✅ Cập nhật thông tin thành công!")
        if (res.user) {
          setUser(res.user)
        }
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
                  <p className="text-xs text-gray-500 mt-0.5">{user?.role === 'admin' ? "Cập nhật thông tin quản trị viên của bạn." : "Cập nhật hồ sơ sinh viên của bạn trong hệ thống."}</p>
                </div>
                <div className="h-px bg-gray-100 my-2" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Họ và tên</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                      value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Ngày sinh</label>
                    <DatePicker value={birthDate} onChange={setBirthDate} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Địa chỉ Email</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                    type="email" placeholder={user?.role === 'admin' ? "Ví dụ: admin@ulsa.edu.vn" : "Ví dụ: student@ulsa.edu.vn"} value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                {user?.role !== 'admin' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Niên khóa (Khóa)</label>
                        <div className="relative">
                          <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-3 pr-10 text-xs outline-none text-gray-800 appearance-none cursor-pointer"
                            value={selectedCohort}
                            onChange={e => {
                              const val = e.target.value;
                              setSelectedCohort(val);
                              setCohort(val);
                              if (!isCustomClass && val && selectedMajor) {
                                const opts = getClassOptions(val, selectedMajor);
                                if (opts.length > 0) {
                                  setClassName(opts[0]);
                                }
                              }
                            }}
                          >
                            <option value="">-- Chọn Khóa --</option>
                            {COHORTS.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-2 text-gray-400 pointer-events-none text-base">expand_more</span>
                        </div>
                      </div>

                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Ngành học</label>
                        <div className="relative">
                          <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-3 pr-10 text-xs outline-none text-gray-800 appearance-none cursor-pointer"
                            value={selectedMajor}
                            onChange={e => {
                              const val = e.target.value;
                              setSelectedMajor(val);
                              if (!isCustomClass && selectedCohort && val) {
                                const opts = getClassOptions(selectedCohort, val);
                                if (opts.length > 0) {
                                  setClassName(opts[0]);
                                }
                              }
                            }}
                          >
                            <option value="">-- Chọn Ngành --</option>
                            {MAJORS.map(m => (
                              <option key={m.code} value={m.code}>{m.name}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-2 text-gray-400 pointer-events-none text-base">expand_more</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Lớp học (Hành chính/Lớp học phần)</label>
                      {!isCustomClass && selectedCohort && selectedMajor ? (
                        <div className="relative">
                          <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-3 pr-10 text-xs outline-none text-gray-800 appearance-none cursor-pointer"
                            value={className}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "custom") {
                                setIsCustomClass(true);
                                setClassName(customClassName || getClassOptions(selectedCohort, selectedMajor)[0]);
                              } else {
                                setClassName(val);
                              }
                            }}
                          >
                            {getClassOptions(selectedCohort, selectedMajor).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            <option value="custom">-- Nhập lớp học khác --</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-2 text-gray-400 pointer-events-none text-base">expand_more</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none text-gray-800"
                            placeholder="VD: D19QT1, D20KT2..."
                            value={isCustomClass ? customClassName : className}
                            onChange={e => {
                              const val = e.target.value;
                              if (isCustomClass) {
                                setCustomClassName(val);
                              }
                              setClassName(val);
                            }}
                          />
                          {selectedCohort && selectedMajor && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomClass(false);
                                const opts = getClassOptions(selectedCohort, selectedMajor);
                                if (opts.length > 0) {
                                  setClassName(opts[0]);
                                }
                              }}
                              className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
                            >
                              Gợi ý lớp
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
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


function IndexRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (user.role === 'verifier') return <Navigate to="/verifier/dashboard" replace />
  return <Navigate to="/student/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<IndexRedirect />} />
            <Route path="/dashboard" element={<IndexRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:query" element={<VerifyPage />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/events" element={<RequireAuth><AdminEvents /></RequireAuth>} />
            <Route path="/admin/claims" element={<RequireAuth><AdminClaims /></RequireAuth>} />
            <Route path="/admin/rewards" element={<RequireAuth><AdminRewards /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth><AdminPage /></RequireAuth>} />
            <Route path="/admin/treasury" element={<RequireAuth><TreasuryPage /></RequireAuth>} />
            <Route path="/admin/provenance" element={<RequireAuth><ProvenancePage /></RequireAuth>} />

            {/* Verifier Routes */}
            <Route path="/verifier/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/verifier/events" element={<RequireAuth><AdminEvents /></RequireAuth>} />
            <Route path="/verifier/claims" element={<RequireAuth><AdminClaims /></RequireAuth>} />
            <Route path="/verifier/rewards" element={<RequireAuth><AdminRewards /></RequireAuth>} />
            <Route path="/verifier/provenance" element={<RequireAuth><ProvenancePage /></RequireAuth>} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
            <Route path="/student/events" element={<RequireAuth><StudentEvents /></RequireAuth>} />
            <Route path="/student/claims" element={<RequireAuth><StudentClaims /></RequireAuth>} />
            <Route path="/student/rewards" element={<RequireAuth><StudentRewards /></RequireAuth>} />
            <Route path="/attendance" element={<RequireAuth><AttendancePage /></RequireAuth>} />

            {/* Shared */}
            <Route path="/help" element={<RequireAuth><HelpPage /></RequireAuth>} />
            <Route path="/training-points" element={<RequireAuth><TrainingPointsPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

            <Route path="*" element={<IndexRedirect />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AuthProvider>
  )
}
