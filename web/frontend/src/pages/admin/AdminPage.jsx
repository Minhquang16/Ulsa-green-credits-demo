import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/admin/admin.css'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AdminUsersTab from './AdminUsersTab.jsx'

export default function AdminPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('stats')

  // ── Stats ──────────────────────────────────────────────
  const [stats, setStats] = useState({ users: 0, events: 0, claims: 0, approvedClaims: 0 })
  const [weeklyData, setWeeklyData] = useState([])

  // ── Users ──────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [busy, setBusy] = useState(false)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [selectedCardImage, setSelectedCardImage] = useState(null)

  // Per-row loading state helper
  const setProcessing = (id, on) => {
    setProcessingIds(prev => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }

  // Derived stats from users list
  const verifiedStudents = useMemo(() =>
    users.filter(u => u.role === 'student' && u.status === 'active').length, [users])
  const pendingCount = useMemo(() =>
    users.filter(u => u.status === 'pending').length, [users])

  // ── Load functions ─────────────────────────────────────
  async function loadStats() {
    try {
      setBusy(true)
      const [s, weekly] = await Promise.all([
        api('/analytics/overview'),
        api('/analytics/weekly-claims').catch(() => [])
      ])
      setStats(s)
      setWeeklyData(Array.isArray(weekly) ? weekly : [])
    } catch (e) {
      showToast('⚠️ Lỗi tải dữ liệu quản trị')
    } finally {
      setBusy(false)
    }
  }

  async function loadUsers() {
    try {
      setBusy(true)
      const res = await api('/admin/users')
      setUsers(res)
    } catch (e) {
      showToast('⚠️ Lỗi tải danh sách người dùng')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { loadUsers() }, [])
  useEffect(() => {
    if (activeTab === 'stats') loadStats()
    else loadUsers()
  }, [activeTab])

  // ── Approve / Reject ───────────────────────────────────
  const handleApprove = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn PHÊ DUYỆT tài khoản sinh viên này và cấp ví Blockchain?')) return
    setProcessing(userId, true)
    try {
      await api(`/admin/users/${userId}/approve`, { method: 'POST' })
      showToast('✅ Phê duyệt thành công! Ví Blockchain đã được cấp.')
      // Optimistic update – dòng sinh viên chuyển sang trạng thái active
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u))
    } catch (err) {
      showToast(`⚠️ Lỗi phê duyệt: ${err.message}`)
    } finally {
      setProcessing(userId, false)
    }
  }

  const handleReject = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn TỪ CHỐI tài khoản sinh viên này?')) return
    setProcessing(userId, true)
    try {
      await api(`/admin/users/${userId}/reject`, { method: 'POST' })
      showToast('❌ Đã từ chối tài khoản sinh viên.')
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'rejected' } : u))
    } catch (err) {
      showToast(`⚠️ Lỗi từ chối: ${err.message}`)
    } finally {
      setProcessing(userId, false)
    }
  }

  // ── Export Report ────────────────────────────────────────
  const handleExportReport = () => {
    try {
      showToast('Đang tạo báo cáo...', 'info')
      
      const headers = ['ID', 'Họ và tên', 'Tên đăng nhập', 'Email', 'Vai trò', 'Trạng thái', 'Số dư UGC', 'Ngày tham gia']
      const rows = users.map(u => [
        u.id,
        `"${u.full_name || ''}"`,
        `"${u.username || ''}"`,
        `"${u.email || ''}"`,
        u.role,
        u.status,
        u.ugc_balance || 0,
        `"${new Date(u.created_at || Date.now()).toLocaleDateString('vi-VN')}"`
      ])
      
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `bao-cao-ugc-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('✅ Đã tải xuống báo cáo thành công!')
    } catch (error) {
      console.error(error)
      showToast('⚠️ Lỗi khi tải báo cáo!')
    }
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-4 pb-8 animate-in relative">

      {/* Page Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#16a34a] text-[16px]">shield_person</span>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#16a34a]">GOVERNANCE HUB</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Trung tâm Quản trị</h1>
          <p className="text-xs font-medium text-slate-500 max-w-xl">Quản lý người dùng, duyệt yêu cầu xác thực và theo dõi toàn bộ hoạt động trên hệ thống UGC.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-sm border border-slate-200/80">
          <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon="pie_chart">Tổng quan Stats</TabBtn>
          <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="manage_accounts">Quản lý Người dùng</TabBtn>
          <TabBtn active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} icon="fact_check" badge={pendingCount}>Duyệt Sinh Viên</TabBtn>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB: TỔNG QUAN STATS                       */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-end mb-3">
            <button onClick={handleExportReport} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">download</span> Xuất báo cáo
            </button>
          </div>

          {/* 4 Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="TỔNG NGƯỜI DÙNG"
              value={stats.users}
              sub="Tất cả tài khoản"
              icon="group"
              color="blue"
            />
            <StatCard
              label="SINH VIÊN XÁC MINH"
              value={verifiedStudents}
              sub="Tài khoản Active"
              icon="verified_user"
              color="green"
            />
            <StatCard
              label="TỔNG SỐ HOẠT ĐỘNG"
              value={stats.events}
              sub="Dự án xanh hiện có"
              icon="event_note"
              color="lightgreen"
            />
            <StatCard
              label="CHỜ PHÊ DUYỆT"
              value={pendingCount}
              sub="Sinh viên đang chờ"
              icon="assignment_ind"
              color="purple"
            />
          </div>

          {/* Weekly Claims Chart */}
          <div className="bg-white rounded-[24px] p-6 lg:p-8 mb-8 border border-slate-100 shadow-sm relative">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-1">Claims được phê duyệt ({weeklyData.length || 0} ngày gần nhất)</h2>
                <p className="text-[12px] font-medium text-slate-500">Số lượng claims được duyệt theo ngày</p>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-[#16a34a] text-[9px] font-bold uppercase tracking-widest border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
                LIVE DATA
              </span>
            </div>
            <WeeklyChart data={weeklyData} />
          </div>

          {/* New Features: Top Students & Account Stats */}
          <div className="admin-stats-bottom-grid">
            {/* Top Students */}
            <div className="admin-top-students-card">
              <div className="admin-top-students-header">
                <div>
                  <h2 className="admin-top-students-title">Top Sinh Viên Năng Nổ Nhất</h2>
                  <p className="admin-top-students-subtitle">Xếp hạng theo số dư UGC hiện có</p>
                </div>
                <div className="admin-top-students-icon">
                  <span className="material-symbols-outlined">military_tech</span>
                </div>
              </div>
              <div className="admin-top-students-list">
                {users.filter(u => u.role === 'student' && u.status === 'active')
                  .sort((a, b) => (b.ugc_balance || 0) - (a.ugc_balance || 0))
                  .slice(0, 5)
                  .map((u, i) => (
                    <div key={u.id} className="admin-top-student-item">
                      <div className={`admin-top-student-rank rank-${i + 1}`}>
                        #{i + 1}
                      </div>
                      <div className="admin-top-student-avatar">
                        <img src={u.avatar_url || u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random&color=fff&size=150`} alt={u.full_name} />
                      </div>
                      <div className="admin-top-student-info">
                        <p className="admin-top-student-name">{u.full_name}</p>
                        <p className="admin-top-student-username">@{u.username}</p>
                      </div>
                      <div className="admin-top-student-score">
                        <p className="score-value">{u.ugc_balance || 0}</p>
                        <p className="score-label">UGC</p>
                      </div>
                    </div>
                  ))}
                  {users.filter(u => u.role === 'student' && u.status === 'active').length === 0 && (
                    <div className="admin-top-students-empty">
                      <p>Chưa có sinh viên nào.</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Account Status Stats */}
            <div className="admin-account-stats-card">
              <div className="admin-account-stats-header">
                <h2 className="admin-account-stats-title">Cơ cấu Tài khoản</h2>
                <p className="admin-account-stats-subtitle">Phân bố tình trạng các tài khoản trong hệ thống</p>
              </div>
              <div className="admin-account-stats-grid">
                {/* Active */}
                <div className="account-stat-box stat-active">
                  <div className="account-stat-label">
                    <div className="account-stat-icon">
                      <span className="material-symbols-outlined">cancel</span>
                    </div>
                    <span>ĐANG HOẠT ĐỘNG</span>
                  </div>
                  <div className="account-stat-value">
                    <p>{users.filter(u => u.status === 'active').length}</p>
                  </div>
                </div>
                {/* Pending */}
                <div className="account-stat-box stat-pending">
                  <div className="account-stat-label">
                    <div className="account-stat-icon">
                      <span className="material-symbols-outlined">cancel</span>
                    </div>
                    <span>CHỜ DUYỆT</span>
                  </div>
                  <div className="account-stat-value">
                    <p>{users.filter(u => u.status === 'pending').length}</p>
                  </div>
                </div>
                {/* Rejected */}
                <div className="account-stat-box stat-rejected">
                  <div className="account-stat-label">
                    <div className="account-stat-icon">
                      <span className="material-symbols-outlined">cancel</span>
                    </div>
                    <span>ĐÃ TỪ CHỐI</span>
                  </div>
                  <div className="account-stat-value">
                    <p>{users.filter(u => u.status === 'rejected').length}</p>
                  </div>
                </div>
                {/* Disabled */}
                <div className="account-stat-box stat-disabled">
                  <div className="account-stat-label">
                    <div className="account-stat-icon">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <span>ĐÃ KHÓA</span>
                  </div>
                  <div className="account-stat-value">
                    <p>{users.filter(u => u.status === 'disabled').length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB: QUẢN LÝ NGƯỜI DÙNG                   */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <AdminUsersTab 
          users={users} 
          loadUsers={loadUsers} 
          busy={busy} 
          setBusy={setBusy} 
          api={api} 
          showToast={showToast} 
          currentUser={user} 
        />
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB: DUYỆT SINH VIÊN                       */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-headline font-black">Yêu cầu Phê duyệt Sinh viên</h2>
              <p className="text-xs text-on-surface-variant/60 mt-0.5">
                {pendingCount > 0 ? `${pendingCount} sinh viên đang chờ duyệt` : 'Không có yêu cầu mới'}
              </p>
            </div>
            <button onClick={loadUsers} disabled={busy} className="btn btn--secondary px-4 py-2 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Tải lại
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant/60 font-bold">
                    <th className="p-4 border-b border-outline-variant/10">Sinh viên</th>
                    <th className="p-4 border-b border-outline-variant/10">Mã sinh viên</th>
                    <th className="p-4 border-b border-outline-variant/10">Ảnh thẻ SV</th>
                    <th className="p-4 border-b border-outline-variant/10 text-center">Trạng thái</th>
                    <th className="p-4 border-b border-outline-variant/10 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.filter(u => u.status === 'pending' || u.status === 'rejected').map(u => {
                    const isProcessing = processingIds.has(u.id)
                    return (
                      <tr key={u.id} className={`hover:bg-surface-container-lowest transition-colors ${isProcessing ? 'opacity-60' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg bg-indigo-600">
                              {u.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm">{u.full_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-on-surface-variant">@{u.username}</p>
                                <span className="text-[9px] text-slate-400">
                                  Đăng ký: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-slate-700 text-xs">
                          {u.student_id || 'N/A'}
                        </td>
                        <td className="p-4">
                          {u.student_card_image ? (
                            <button
                              onClick={() => setSelectedCardImage(`/api${u.student_card_image}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">image</span>
                              Xem ảnh thẻ
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không có ảnh</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full
                            ${u.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            <span className="material-symbols-outlined text-[12px]">
                              {u.status === 'pending' ? 'hourglass_empty' : 'block'}
                            </span>
                            {u.status === 'pending' ? 'Chờ duyệt' : 'Đã từ chối'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Nút DUYỆT: hiện với cả pending và rejected */}
                            <button
                              id={`btn-approve-${u.id}`}
                              onClick={() => handleApprove(u.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
                            >
                              {isProcessing
                                ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                : <span className="material-symbols-outlined text-sm">check</span>
                              }
                              {isProcessing ? 'Đang xử lý...' : (u.status === 'rejected' ? 'Duyệt lại' : 'Duyệt')}
                            </button>

                            {/* Nút TỪ CHỐI: chỉ hiện với pending */}
                            {u.status === 'pending' && (
                              <button
                                id={`btn-reject-${u.id}`}
                                onClick={() => handleReject(u.id)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition-all active:scale-95"
                              >
                                {isProcessing
                                  ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                  : <span className="material-symbols-outlined text-sm">close</span>
                                }
                                {isProcessing ? 'Đang xử lý...' : 'Từ chối'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.filter(u => u.status === 'pending' || u.status === 'rejected').length === 0 && !busy && (
                    <tr>
                      <td colSpan="5" className="p-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">task_alt</span>
                        <p className="text-on-surface-variant/60 text-sm">Không có yêu cầu nào đang chờ duyệt.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════ */}
      {/* MODAL: XEM ẢNH THẺ SV                     */}
      {/* ══════════════════════════════════════════ */}
      {selectedCardImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedCardImage(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-base font-black text-slate-800">Ảnh thẻ sinh viên</h3>
              <button onClick={() => setSelectedCardImage(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center max-h-[70vh]">
              <img src={selectedCardImage} alt="Thẻ sinh viên" className="max-w-full max-h-[60vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function TabBtn({ children, active, onClick, icon, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap relative
        ${active ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 border border-transparent hover:text-slate-800 hover:bg-white/50'}`}
    >
      {icon && <span className={`material-symbols-outlined text-[16px] ${active ? 'text-[#16a34a]' : 'text-slate-400'}`}>{icon}</span>}
      {children}
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black leading-none shadow-sm">
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    blue: { iconBg: 'bg-blue-50', iconColor: 'text-blue-500', svgFill: '#3b82f6', bgVal: 'text-blue-500' },
    green: { iconBg: 'bg-green-50', iconColor: 'text-green-600', svgFill: '#16a34a', bgVal: 'text-green-700' },
    lightgreen: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', svgFill: '#10b981', bgVal: 'text-emerald-600' },
    purple: { iconBg: 'bg-purple-50', iconColor: 'text-purple-500', svgFill: '#8b5cf6', bgVal: 'text-purple-500' }
  }
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden flex h-full group">
      
      {/* Content wrapper */}
      <div className="flex gap-4 relative z-10 w-full">
        {/* Icon Circle */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${c.iconBg}`}>
          <span className={`material-symbols-outlined text-[22px] ${c.iconColor}`}>{icon}</span>
        </div>
        
        {/* Text Area */}
        <div className="flex-1 flex flex-col items-start pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-800 mb-1.5">{label}</p>
          <div className="flex items-end gap-2 mb-1.5">
            <p className={`text-[32px] font-bold leading-none ${c.bgVal}`}>{value ?? 0}</p>
          </div>
          <p className="text-[11px] font-medium text-slate-500">{sub}</p>
        </div>
      </div>
      
      {/* Decorative Sparkline at bottom right */}
      <div className="absolute bottom-1 right-2 w-28 h-12 pointer-events-none opacity-40">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,30 L0,20 Q10,15 20,22 T40,15 T60,25 T80,10 T100,5 L100,30 Z" fill={`url(#gradient-${color})`} />
          <path d="M0,20 Q10,15 20,22 T40,15 T60,25 T80,10 T100,5" fill="none" stroke={c.svgFill} strokeWidth="1.5" />
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c.svgFill} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={c.svgFill} stopOpacity={0}/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function WeeklyChart({ data }) {
  // Chỉ sử dụng dữ liệu thật từ database
  const chartData = Array.isArray(data) ? data : []

  return (
    <div className="h-64 mt-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            axisLine={{ stroke: '#16a34a', strokeWidth: 1.5 }} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            dy={10} 
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#64748b' }} 
          />
          <Tooltip 
            formatter={(value) => [`${value} claims`, 'Đã phê duyệt']}
            labelFormatter={(label) => `Ngày: ${label}`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
            labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px', fontWeight: '500' }}
            itemStyle={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold', padding: 0 }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#16a34a" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorCount)" 
            dot={{ r: 3, fill: '#ffffff', stroke: '#16a34a', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
