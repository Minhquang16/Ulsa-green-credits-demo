import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

function shortAddr(h) { return h ? h.slice(0, 6) + '...' + h.slice(-4) : '—' }
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'Vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function BarChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-end justify-center gap-3 h-full pb-6">
      {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-gray-100" style={{ height: `${h}%` }} />
          <span className="text-[9px] text-gray-400">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}</span>
        </div>
      ))}
    </div>
  )
  const max = Math.max(...data.map(d => d.total_ugc), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-full pb-6">
      {data.map((d, i) => {
        const pct = Math.max((d.total_ugc / max) * 85, 4)
        const isMax = d.total_ugc === Math.max(...data.map(x => x.total_ugc))
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            {isMax && <span className="text-[9px] font-black text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">{d.total_ugc} UGC</span>}
            {!isMax && <span className="text-[9px] text-transparent">.</span>}
            <div className="w-full rounded-t-xl transition-all duration-700 relative group"
              style={{ height: `${pct}%`, background: isMax ? 'linear-gradient(to top,#16a34a,#4ade80)' : '#e5e7eb' }}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[9px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">{d.total_ugc}</div>
            </div>
            <span className="text-[9px] text-gray-400 font-medium">
              {new Date(d.day).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LineSparkline({ value, positive = true }) {
  const pts = [20, 35, 28, 45, 38, 52, 47, 60].map((y, x) => ({ x: x * 14, y: 80 - y }))
  const d = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`
  return (
    <svg width="80" height="32" viewBox="0 0 98 80" className="overflow-visible">
      <path d={d} fill="none" stroke={positive ? '#16a34a' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function renderTrend(trend, pos, isBottom = false) {
  if (trend === '● Đang kết nối') {
    return <span className={`text-[10px] font-bold ${isBottom ? 'text-black' : 'text-green-600'}`}>{trend}</span>
  }
  if (trend === 'Tất cả đã duyệt') {
    return <span className="text-[10px] font-bold text-black">{trend}</span>
  }
  if (trend === 'Cần xử lý ngay') {
    return <span className="text-[10px] font-bold text-red-500">{trend}</span>
  }
  
  const match = trend?.match(/^(\+\d+(?:\.\d+)?%)(.*)$/)
  if (match) {
    const pct = match[1]
    const rest = match[2]
    return (
      <span className="text-[10px] font-bold text-green-600">
        {pct}
        {rest && <span className="text-black">{rest}</span>}
      </span>
    )
  }
  
  return <span className={`text-[10px] font-bold ${pos ? 'text-green-600' : 'text-red-500'}`}>{trend}</span>
}

export default function DashboardPage() {
  const { api, user, logout } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [contract, setContract] = useState('')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [wallets, setWallets] = useState([])
  const [walletSearch, setWalletSearch] = useState('')
  const [walletRole, setWalletRole] = useState('all')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [timePeriod, setTimePeriod] = useState('month')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const isAdmin = user.role === 'admin' || user.role === 'verifier'

  const timePeriodLabel = { week: '7 ngày qua', month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay' }[timePeriod]

  function exportCSV() {
    if (!wallets.length) { showToast('Không có dữ liệu để xuất'); return }
    const headers = ['Họ và tên', 'Tên đăng nhập', 'Vai trò', 'Địa chỉ ví', 'Số dư UGC']
    const rows = wallets.map(w => [
      w.full_name || '',
      w.username || '',
      w.role === 'admin' ? 'Quản trị viên' : w.role === 'verifier' ? 'Người duyệt' : 'Sinh viên',
      w.wallet_address || '',
      w.ugc_balance ?? 0
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `ugc-wallets-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('✅ Đã xuất file CSV thành công!')
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isAdmin) {
        const [s, b, c, w] = await Promise.all([
          api(`/dashboard/stats?period=${timePeriod}`).catch(() => null),
          api('/wallet/balance').catch(() => ({ balance: null })),
          api('/wallet/contract').catch(() => ({ address: '' })),
          api('/wallets/all').catch(() => []),
        ])
        setStats(s); setBalance(b?.balance ?? null); setContract(c?.address || ''); setWallets(w || [])
      } else {
        const [b, c] = await Promise.all([
          api('/wallet/balance').catch(() => ({ balance: null })),
          api('/wallet/contract').catch(() => ({ address: '' })),
        ])
        setBalance(b?.balance ?? null); setContract(c?.address || '')
      }
    } catch { showToast('⚠️ Lỗi tải dashboard') } finally { setLoading(false) }
  }, [api, isAdmin, showToast, timePeriod])

  useEffect(() => { load() }, [load])

  async function handleApprove(id) {
    setApprovingId(id)
    try { await api(`/claims/${id}/approve`, { method: 'POST' }); showToast('✅ Đã duyệt thành công!'); load() }
    catch { showToast('❌ Lỗi khi duyệt') } finally { setApprovingId(null) }
  }

  // --- STUDENT VIEW ---
  if (!isAdmin) return (
    <div style={{ background: '#ffffff' }} className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Xin chào, {user.full_name?.split(' ').pop()} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Theo dõi tín chỉ xanh và hoạt động của bạn</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 80% 50%,#16a34a,transparent)' }} />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Số dư Tín chỉ Xanh</p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-6xl font-black text-gray-900">{balance ?? '—'}</span>
            <span className="text-xl font-bold text-green-600">UGC</span>
          </div>
          <div className="flex gap-3">
            <Link to="/events" className="flex items-center gap-2 bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-green-700 transition-colors">
              <span className="material-symbols-outlined text-base">eco</span> Tham gia hoạt động
            </Link>
            <Link to="/rewards" className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-gray-200 transition-colors">
              <span className="material-symbols-outlined text-base">redeem</span> Đổi quà
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Địa chỉ ví blockchain</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm text-gray-700 flex-1 truncate">{user.wallet_address || '—'}</p>
            <button onClick={() => { navigator.clipboard.writeText(user.wallet_address); showToast('Đã sao chép!') }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-sm">content_copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // --- ADMIN VIEW ---
  const pending = stats?.pendingClaims ?? 0
  const students = stats?.totalStudents ?? 0
  const supply = stats?.totalSupply ?? 0
  const blockNum = stats?.blockNumber ?? 0

  const kpis = [
    { label: 'Tổng cung UGC', value: loading ? '...' : supply.toLocaleString(), sub: 'Token đang lưu hành', icon: 'token', trend: '+5.2%', pos: true, link: '/treasury' },
    { label: 'Sinh viên tham gia', value: loading ? '...' : students, sub: 'Đã liên kết ví', icon: 'school', trend: '+1.8% thành viên mới', pos: true, link: '/admin' },
    { label: 'Chờ phê duyệt', value: loading ? '...' : pending, sub: 'Claims cần xử lý', icon: 'pending_actions', trend: pending > 0 ? `Cần xử lý ngay` : 'Tất cả đã duyệt', pos: pending === 0, link: '/claims', alert: pending > 0 },
    { label: 'Block hiện tại', value: loading ? '...' : blockNum.toLocaleString(), sub: 'Hardhat network', icon: 'hub', trend: '● Đang kết nối', pos: true, link: null },
  ]

  return (
    <div style={{ background: '#ffffff' }} className="min-h-screen">
      {/* ===== MODALS & DROPDOWNS — outside layout flow ===== */}
        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-800">Trợ giúp & Hướng dẫn</h2>
                <button onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { icon: 'dashboard', title: 'Dashboard', desc: 'Tổng quan số liệu: tổng UGC, sinh viên, claims cần duyệt.' },
                  { icon: 'pending_actions', title: 'Claims', desc: 'Xem và duyệt các yêu cầu tín chỉ từ sinh viên.' },
                  { icon: 'eco', title: 'Sự kiện', desc: 'Quản lý các hoạt động xanh đang diễn ra.' },
                  { icon: 'account_balance', title: 'Ngân sách', desc: 'Phát hành và theo dõi tổng cung UGC token.' },
                  { icon: 'redeem', title: 'Đổi thưởng', desc: 'Xem các phần thưởng sinh viên có thể đổi bằng UGC.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-green-600 text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notification Panel */}
        {showNotif && (
          <div className="fixed inset-0 z-50" onClick={() => setShowNotif(false)}>
            <div className="absolute top-16 right-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 w-[380px] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-[15px] text-gray-800">Thông báo</h3>
                <button className="text-[13px] text-gray-500 hover:text-gray-800 font-medium transition-colors">
                  Đánh dấu tất cả đã đọc
                </button>
              </div>

              {/* Body (Scrollable list) */}
              <div className="max-h-[400px] overflow-y-auto">
                <div className="flex flex-col">
                  {(stats?.pendingClaims ?? 0) > 0 ? (
                    <>
                      {/* Notification Item 1 (Unread) */}
                      <div className="flex gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors bg-blue-50/30">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 border border-orange-200">
                          <span className="material-symbols-outlined text-orange-600 text-[20px]">pending_actions</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] text-gray-800 leading-snug font-bold">
                            Hệ thống cần bạn xử lý
                          </p>
                          <p className="text-[13px] text-gray-600 leading-snug mt-0.5">
                            Bạn có <span className="font-bold text-orange-600">{stats?.pendingClaims} claims</span> mới đang chờ phê duyệt. Vui lòng kiểm tra và xử lý ngay.
                          </p>
                          <p className="text-[12px] text-gray-500 mt-1 font-medium text-blue-600">1 giờ trước</p>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                      {/* Empty state (when there are no notifications) */}
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[32px] text-gray-300">notifications_off</span>
                      </div>
                      <p className="text-[14px] font-medium text-gray-600">Bạn không có thông báo nào</p>
                      <p className="text-[13px] text-gray-400 mt-1">Khi có cập nhật mới, thông báo sẽ hiển thị tại đây.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button 
                  onClick={(e) => { e.preventDefault(); setShowNotif(false); }}
                  className="w-full py-2 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                >
                  Xem tất cả thông báo
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Profile Dropdown */}
        {showProfile && (
          <div className="fixed inset-0 z-50" onClick={() => setShowProfile(false)}>
            <div className="absolute top-16 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Quản trị viên' : user.role === 'verifier' ? 'Người duyệt' : 'Sinh viên'}</p>
                    <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button onClick={() => { setShowProfile(false); showToast('Tính năng đang phát triển') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                  <span className="material-symbols-outlined text-gray-400 text-lg">manage_accounts</span> Cài đặt tài khoản
                </button>
                <button onClick={() => { logout(); nav('/login') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-sm text-red-600 transition-colors">
                  <span className="material-symbols-outlined text-red-400 text-lg">logout</span> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Picker Dropdown */}
        {showTimePicker && (
          <div className="fixed inset-0 z-50" onClick={() => setShowTimePicker(false)}>
            <div className="absolute top-32 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 w-48 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-2">
                {[['week','7 ngày qua'],['month','Tháng này'],['quarter','Quý này'],['year','Năm nay']].map(([val, label]) => (
                  <button key={val} onClick={() => { setTimePeriod(val); setShowTimePicker(false); showToast(`Đang xem: ${label}`) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between ${
                      timePeriod === val ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                    {label}
                    {timePeriod === val && <span className="material-symbols-outlined text-green-600 text-base">check</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-4 pb-8 space-y-7">

        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Tổng quan Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Cập nhật trạng thái hệ thống ULSA Green Credit.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Top Row */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className={`flex items-center bg-white border border-gray-200 rounded-2xl overflow-hidden h-9 shadow-sm transition-all duration-300 ${isSearchOpen ? 'w-[290px]' : 'w-9'}`}>
                <button
                  onClick={() => { setIsSearchOpen(!isSearchOpen); if (!isSearchOpen) setTimeout(() => document.getElementById('headerSearch')?.focus(), 50) }}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px] text-gray-600" style={{fontVariationSettings:"'wght' 300"}}>search</span>
                </button>
                <input
                  id="headerSearch"
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={walletSearch}
                  onChange={e => setWalletSearch(e.target.value)}
                  className={`w-full outline-none focus:ring-0 caret-gray-800 text-[13px] text-gray-700 bg-transparent placeholder-gray-400 pr-3 transition-opacity duration-200 ${isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  onBlur={() => { if (!walletSearch) setIsSearchOpen(false) }}
                />
              </div>

              {/* Help */}
              <button onClick={() => setShowHelp(true)}
                className="w-9 h-9 flex-shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-150">
                <span className="material-symbols-outlined text-[20px] text-gray-600" style={{fontVariationSettings:"'wght' 300"}}>help_outline</span>
              </button>

              {/* Notifications */}
              <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); setShowTimePicker(false) }}
                className={`w-9 h-9 flex-shrink-0 rounded-2xl border shadow-sm flex items-center justify-center relative active:scale-95 transition-all duration-150 ${showNotif ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <span className={`material-symbols-outlined text-[20px] ${showNotif ? 'text-green-600' : 'text-gray-600'}`} style={{fontVariationSettings:"'wght' 300"}}>notifications</span>
                {(stats?.pendingClaims ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">
                    {stats.pendingClaims}
                  </span>
                )}
              </button>

              {/* Profile — circle avatar + chevron only, no text */}
              <div onClick={() => { setShowProfile(!showProfile); setShowNotif(false); setShowTimePicker(false) }}
                className={`flex flex-shrink-0 items-center gap-1 rounded-2xl border shadow-sm cursor-pointer h-9 pl-1 pr-2 active:scale-95 transition-all duration-150 ${showProfile ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <div className="w-7 h-7 rounded-full overflow-hidden">
                  <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showProfile ? 'rotate-180 text-green-600' : 'text-gray-500'}`}>unfold_more</span>
              </div>

              {/* Export CSV */}
              <button onClick={exportCSV}
                className="flex flex-shrink-0 whitespace-nowrap items-center gap-2 px-4 h-9 rounded-2xl text-[13px] font-semibold text-white bg-[#2d7a4f] hover:bg-[#246140] active:scale-95 transition-all duration-150 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
                Xuất CSV
              </button>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center gap-2">
              <div onClick={() => { setShowTimePicker(!showTimePicker); setShowNotif(false); setShowProfile(false) }}
                className={`flex items-center gap-1 rounded-2xl border shadow-sm cursor-pointer px-3 h-8 active:scale-95 transition-all duration-150 ${showTimePicker ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <span className={`text-[13px] font-medium ${showTimePicker ? 'text-green-700' : 'text-gray-700'}`}>{timePeriodLabel}</span>
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showTimePicker ? 'rotate-180 text-green-600' : 'text-gray-500'}`}>expand_more</span>
              </div>

              <button disabled={loading} onClick={() => window.location.reload()}
                className="group flex items-center gap-1.5 px-3 h-8 rounded-2xl text-[13px] font-medium text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className={`material-symbols-outlined text-[16px] text-gray-500 transition-all ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`}>sync</span>
                Làm mới
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 ${k.alert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-black font-semibold">{k.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.alert ? 'bg-red-100' : 'bg-gray-50'}`}>
                  <span className={`material-symbols-outlined text-base ${k.alert ? 'text-red-500' : 'text-gray-400'}`}>{k.icon}</span>
                </div>
              </div>
              <p className={`text-3xl font-black mb-1 ${k.alert ? 'text-red-600' : 'text-gray-900'}`}>{k.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-600 font-medium">{k.sub}</p>
                {k.link
                  ? <Link to={k.link} className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 hover:gap-1 transition-all">Chi tiết <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>north_east</span></Link>
                  : renderTrend(k.trend, k.pos)
                }
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                {renderTrend(k.trend, k.pos, true)}
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Chart + Quick Approve */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Bar Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Tổng quan UGC tiêu thụ</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">
                  {loading ? '...' : ((stats?.txHistory || []).reduce((a, b) => a + (b.total_ugc || 0), 0)).toLocaleString()} UGC
                  <span className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">7 ngày qua</span>
                </p>
              </div>
              <Link to="/rewards" className="text-xs font-bold text-gray-400 hover:text-green-600 flex items-center gap-1 transition-colors">
                ··· <span className="hidden">Xem thêm</span>
              </Link>
            </div>
            <div className="h-52 mt-6">
              <BarChart data={stats?.txHistory || []} />
            </div>
          </div>

          {/* Quick Approve */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Duyệt nhanh</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Claims mới nhất</p>
              </div>
              <Link to="/claims" className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
                Tất cả <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
              </Link>
            </div>
            <div className="space-y-2.5">
              {loading ? (
                <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-gray-300 text-3xl">refresh</span></div>
              ) : (stats?.recentClaims?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-4xl">task_alt</span>
                  <p className="text-sm font-medium">Không có claim nào chờ duyệt</p>
                </div>
              ) : stats.recentClaims.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-xs flex-shrink-0">
                    {c.student_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.student_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.activity_name} · {timeAgo(c.created_at)}</p>
                  </div>
                  <button onClick={() => handleApprove(c.id)} disabled={approvingId === c.id}
                    className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 text-xs font-black">
                    <span className="material-symbols-outlined text-base">{approvingId === c.id ? 'sync' : 'check'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Top Events + Blockchain Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top Events */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Hoạt động nổi bật</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Top chiến dịch đang chạy</p>
              </div>
              <Link to="/events" className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
                Xem tất cả <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
              </Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-gray-300 text-3xl">refresh</span></div>
              ) : (stats?.topEvents?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-4xl">event_busy</span>
                  <p className="text-sm">Chưa có chiến dịch nào</p>
                </div>
              ) : stats.topEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                    }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">{ev.activity_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ev.status === 'published' ? 'bg-green-100 text-green-700' :
                          ev.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                        }`}>{ev.status === 'published' ? 'Đang chạy' : ev.status === 'ended' ? 'Đã kết thúc' : 'Nháp'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-600">{ev.participant_count}</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">Tham gia</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Hạ tầng kỹ thuật</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">Trạng thái Blockchain</p>
            </div>

            {/* Network status */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-xl">lan</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-800 text-sm">Hardhat Node — Đang hoạt động</p>
                <p className="text-green-600 text-[10px] font-medium">http://localhost:8545 · Chain 31337</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            </div>

            {/* Contract + Block */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Block Number</p>
                <p className="font-mono font-black text-gray-800">{loading ? '...' : blockNum.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Gas Price</p>
                <p className="font-mono font-black text-gray-800">1 Gwei</p>
              </div>
            </div>

            {/* Smart contract address */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Địa chỉ Smart Contract (UGC Token)</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-700 flex-1 truncate">{contract || stats?.ugcContractAddress || '—'}</span>
                <button onClick={() => { navigator.clipboard.writeText(contract || ''); showToast('Đã sao chép!') }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>

            {/* Quick nav */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link to="/claims" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-bold text-xs hover:bg-green-700 transition-colors">
                <span className="material-symbols-outlined text-sm">pending_actions</span>Quản lý Claims
              </Link>
              <Link to="/treasury" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors">
                <span className="material-symbols-outlined text-sm">account_balance</span>Ngân sách
              </Link>
            </div>
          </div>
        </div>

        {/* ===== TẦNG 4: QUẢN LÝ VÍ BLOCKCHAIN ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Kho quỹ & Hạ tầng</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Quản lý Ví Blockchain</p>
                <p className="text-xs text-gray-400 mt-0.5">{wallets.length} địa chỉ ví trong hệ thống · Số dư UGC theo thời gian thực</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
                  <input
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 bg-gray-50 w-48"
                    placeholder="Tìm tên, địa chỉ..."
                    value={walletSearch} onChange={e => setWalletSearch(e.target.value)}
                  />
                </div>
                <select
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 bg-gray-50 font-semibold text-gray-600"
                  value={walletRole} onChange={e => setWalletRole(e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="student">Sinh viên</option>
                  <option value="admin">Admin</option>
                  <option value="verifier">Verifier</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Người dùng</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Vai trò</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Địa chỉ ví</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Số dư UGC</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-16 text-center">
                    <span className="material-symbols-outlined animate-spin text-gray-300 text-4xl">refresh</span>
                  </td></tr>
                ) : wallets
                  .filter(w => {
                    const q = walletSearch.toLowerCase()
                    const matchSearch = !q || w.full_name?.toLowerCase().includes(q) || w.wallet_address?.toLowerCase().includes(q) || w.username?.toLowerCase().includes(q)
                    const matchRole = walletRole === 'all' || w.role === walletRole
                    return matchSearch && matchRole
                  })
                  .map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-xs flex-shrink-0">
                            {w.full_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || '??'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{w.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">@{w.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${w.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            w.role === 'verifier' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                          }`}>{w.role === 'admin' ? 'Admin' : w.role === 'verifier' ? 'Verifier' : 'Sinh viên'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {w.wallet_address ? w.wallet_address.slice(0, 10) + '...' + w.wallet_address.slice(-6) : '—'}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(w.wallet_address || ''); showToast('Đã sao chép địa chỉ!') }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all">
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-black ${w.ugc_balance > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>{w.ugc_balance.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">UGC</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <a
                          href={`https://etherscan.io/address/${w.wallet_address}`}
                          target="_blank" rel="noreferrer"
                          onClick={e => { e.preventDefault(); showToast('Hardhat local — không hỗ trợ Etherscan thật') }}
                          className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center justify-center gap-0.5">
                          Xem on-chain <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Tổng UGC lưu hành: <strong className="text-green-600 font-black">{wallets.reduce((a, w) => a + w.ugc_balance, 0).toLocaleString()} UGC</strong>
            </span>
            <span className="text-xs text-gray-400">{wallets.filter(w => w.ugc_balance > 0).length} ví đang có số dư</span>
          </div>
        </div>

      </div>
    </div>
  )
}
