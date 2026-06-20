import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/admin/admin.css'


export default function AdminPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('stats')

  // ── Stats ──────────────────────────────────────────────
  const [stats, setStats] = useState({ users: 0, events: 0, claims: 0, approvedClaims: 0 })
  const [tokenStats, setTokenStats] = useState({ issued: 0, burned: 0, supply: 0, contract: 'Loading...' })
  const [weeklyData, setWeeklyData] = useState([])

  // ── Users ──────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [busy, setBusy] = useState(false)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'student', status: 'active' })
  const [selectedCardImage, setSelectedCardImage] = useState(null)

  // ── Search & Filter ────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

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

  // Filtered users for Users tab
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => u.status === 'active' || u.status === 'disabled')
      .filter(u => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false
        const q = searchQuery.toLowerCase().trim()
        if (!q) return true
        return (
          u.full_name?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.student_id?.toLowerCase().includes(q)
        )
      })
  }, [users, searchQuery, roleFilter])

  // ── Load functions ─────────────────────────────────────
  async function loadStats() {
    try {
      setBusy(true)
      const [s, weekly] = await Promise.all([
        api('/analytics/overview'),
        api('/analytics/weekly-claims').catch(() => [])
      ])
      setStats(s)
      setTokenStats({
        contract: s.token?.contract || 'N/A',
        supply: s.token?.totalSupply ?? 0,
        issued: s.token?.totalIssued ?? 0,
        burned: s.token?.totalBurned ?? 0
      })
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

  // ── User Modal ─────────────────────────────────────────
  const openNewUserModal = () => {
    setEditingUser(null)
    setUserForm({ username: '', password: '', full_name: '', role: 'student', status: 'active' })
    setShowUserModal(true)
  }
  const openEditUserModal = (u) => {
    setEditingUser(u)
    setUserForm({ username: u.username, password: '', full_name: u.full_name, role: u.role, status: u.status })
    setShowUserModal(true)
  }
  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      setBusy(true)
      if (editingUser) {
        await api(`/admin/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(userForm) })
        showToast('✅ Cập nhật tài khoản thành công')
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify(userForm) })
        showToast('✅ Tạo tài khoản mới thành công')
      }
      setShowUserModal(false)
      loadUsers()
    } catch (err) {
      showToast(`⚠️ Lỗi: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  // ── Toggle lock/unlock ─────────────────────────────────
  const handleToggleStatus = async (u) => {
    if (u.id === user.id) { showToast('⚠️ Không thể khóa chính mình'); return }
    const newStatus = u.status === 'active' ? 'disabled' : 'active'
    if (!window.confirm(`Bạn có chắc muốn ${newStatus === 'active' ? 'MỞ KHÓA' : 'KHÓA'} tài khoản ${u.username}?`)) return
    try {
      setBusy(true)
      await api(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
      showToast(`✅ Đã ${newStatus === 'active' ? 'mở khóa' : 'khóa'} tài khoản`)
      loadUsers()
    } catch (err) {
      showToast(`⚠️ Lỗi: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

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

  // ── Render ─────────────────────────────────────────────
  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in relative">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Governance Hub</p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Trung tâm Quản trị</h1>
        </div>
        <div className="flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-xl shadow-sm border border-outline-variant/10">
          <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Tổng quan Stats</TabBtn>
          <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Quản lý Người dùng</TabBtn>
          <TabBtn active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} badge={pendingCount}>Duyệt Sinh Viên</TabBtn>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB: TỔNG QUAN STATS                       */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-end mb-4 gap-2">
            <button onClick={() => showToast('Đang xuất báo cáo...')} className="btn btn--secondary px-4 py-2 text-xs">Xuất báo cáo</button>
            <button onClick={loadStats} disabled={busy} className="btn btn--primary px-4 py-2 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
            </button>
          </div>

          {/* 4 Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Tổng người dùng"
              value={stats.users}
              sub="Tất cả tài khoản"
              icon="group"
              accent="#3b82f6"
            />
            <StatCard
              label="Sinh viên xác minh"
              value={verifiedStudents}
              sub="Tài khoản Active"
              icon="verified_user"
              accent="#16a34a"
            />
            <StatCard
              label="Tín chỉ xanh đã cấp"
              value={tokenStats.issued}
              sub="UGC Credits on-chain"
              icon="eco"
              accent="#059669"
            />
            <StatCard
              label="Chờ phê duyệt"
              value={pendingCount}
              sub="Sinh viên đang chờ"
              icon="pending_actions"
              accent={pendingCount > 0 ? '#f59e0b' : '#94a3b8'}
              urgent={pendingCount > 0}
            />
          </div>

          {/* Weekly Claims Chart */}
          <div className="bg-white rounded-3xl p-6 mb-6 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="font-headline text-base font-black text-on-surface">Claims được phê duyệt (28 ngày gần nhất)</h2>
                <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Số lượng claims được duyệt theo ngày</p>
              </div>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">Live Data</span>
            </div>
            <WeeklyChart data={weeklyData} />
          </div>

          {/* Token Panel */}
          <div className="bg-surface-container-low rounded-3xl p-8 mb-10 border border-outline-variant/10 shadow-xl shadow-black/5 relative overflow-hidden group">
            <div className="flex flex-col lg:flex-row gap-8 relative z-10">
              <div className="lg:flex-grow">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="font-headline text-xl font-black text-on-surface mb-1">Token stats (on-chain)</h2>
                    <p className="text-[10px] font-mono text-primary opacity-60">Contract: <code>{tokenStats.contract}</code></p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Hardhat local</span>
                </div>
                <div className="flex items-end gap-3 h-48 mb-10 px-4">
                  <Bar h="75%" /><Bar h="50%" /><Bar h="65%" /><Bar h="83%" highlight /><Bar h="33%" /><Bar h="100%" current />
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <Metric label="Total Issued" value={`${tokenStats.issued} UGC`} />
                  <Metric label="Total Burned" value={`${tokenStats.burned} UGC`} />
                  <Metric label="Supply (balance)" value={`${tokenStats.supply} UGC`} primary />
                </div>
              </div>

              <div className="lg:w-80 flex flex-col justify-between">
                <div className="mb-8">
                  <h3 className="font-headline text-sm font-black text-on-surface uppercase tracking-widest mb-4 opacity-40">Global Impact</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">CO₂ Offset tổng</p>
                      <p className="text-xl font-headline font-black text-on-surface">42,810 Tấn</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Dự án đang hoạt động</p>
                      <p className="text-xl font-headline font-black text-on-surface">214 Global</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Tổng Claims đã duyệt</p>
                      <p className="text-xl font-headline font-black text-on-surface">{stats.approvedClaims ?? 0}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg border border-white/20">
                  <img
                    className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-700"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUV-j2VHKybDkVguFFQ7jOKsKRRgT_-PwPfiQlnsW2moWzJFPIxLZ_6XuF3_sp30Cafs9VdZY3uS7BxGm02mfgxo89VAAxCr8kH9jsB7CwL9SuXXi1VTipzDUWsG23553M4o8fLirOMxP9jVHgY35UiIAiWqR8P2YwijHt_8LSwwCdK9hSL_O4vf-Ba3JnPaz09Lgg1aqNLWhEhEOo-VmNMjKJXfjsUFJUYd7LcrgBtIkme7TKGeoERzesG6PTNOE1sVteTQYJgH0"
                    alt="Amazon"
                  />
                  <p className="p-3 bg-surface-container-high text-[10px] font-bold text-on-surface-variant italic">Amazon Basin Reforestation</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-full h-full editorial-gradient opacity-[0.02] pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB: QUẢN LÝ NGƯỜI DÙNG                   */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
            <h2 className="text-xl font-headline font-black">Danh sách Tài khoản</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={loadUsers} disabled={busy} className="btn btn--secondary px-3 py-2 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
              <button onClick={openNewUserModal} className="btn btn--primary px-4 py-2 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Tạo tài khoản mới
              </button>
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/40">search</span>
              <input
                id="user-search"
                type="text"
                placeholder="Tìm theo tên, tài khoản, mã SV..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-outline-variant/20 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 text-sm bg-white border border-outline-variant/20 rounded-xl focus:outline-none focus:border-primary shadow-sm font-medium text-on-surface-variant"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="student">Sinh viên</option>
              <option value="verifier">Verifier</option>
              <option value="admin">Admin</option>
            </select>
            {(searchQuery || roleFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setRoleFilter('all') }}
                className="px-3 py-2 text-xs text-on-surface-variant hover:text-error border border-outline-variant/20 rounded-xl bg-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">close</span> Xóa lọc
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant/60 font-bold">
                    <th className="p-4 border-b border-outline-variant/10">Người dùng</th>
                    <th className="p-4 border-b border-outline-variant/10">Mã SV / Username</th>
                    <th className="p-4 border-b border-outline-variant/10">Ví Blockchain</th>
                    <th className="p-4 border-b border-outline-variant/10 text-right">Số dư UGC</th>
                    <th className="p-4 border-b border-outline-variant/10 text-center">Trạng thái</th>
                    <th className="p-4 border-b border-outline-variant/10 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {u.student_card_image ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-slate-200">
                              <img src={`/api${u.student_card_image}`} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0
                              ${u.role === 'admin' ? 'bg-error' : u.role === 'verifier' ? 'bg-primary' : 'bg-tertiary'}`}>
                              {u.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-on-surface text-sm">{u.full_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-on-surface-variant">@{u.username}</p>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded
                                ${u.role === 'admin' ? 'bg-error/10 text-error' : u.role === 'verifier' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                                {u.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">
                          {u.student_id || `@${u.username}`}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.wallet_address ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-surface-container-low px-2 py-1 rounded text-on-surface-variant">
                              {u.wallet_address.substring(0, 6)}...{u.wallet_address.substring(38)}
                            </code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(u.wallet_address); showToast('Đã copy địa chỉ ví!') }}
                              className="text-on-surface-variant/40 hover:text-primary transition-colors"
                              title="Copy địa chỉ ví"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40 italic">Chưa có ví</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-headline font-black text-primary">
                        {u.ugc_balance ?? 0}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full
                          ${u.status === 'active' ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'}`}>
                          <span className="material-symbols-outlined text-[12px]">
                            {u.status === 'active' ? 'check_circle' : 'block'}
                          </span>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Chỉnh sửa vai trò"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.status === 'active'
                              ? 'text-on-surface-variant hover:text-error hover:bg-error/10'
                              : 'text-error hover:text-[#2e7d32] hover:bg-[#2e7d32]/10'}`}
                            title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {u.status === 'active' ? 'lock' : 'lock_open'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && !busy && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">person_search</span>
                        <p className="text-on-surface-variant/60 text-sm">
                          {searchQuery || roleFilter !== 'all' ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có người dùng nào.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > 0 && (
              <div className="px-4 py-3 bg-surface-container-lowest border-t border-outline-variant/10 text-xs text-on-surface-variant/60">
                Hiển thị <strong>{filteredUsers.length}</strong> / {users.filter(u => u.status === 'active' || u.status === 'disabled').length} người dùng
              </div>
            )}
          </div>
        </div>
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
      {/* MODAL: TẠO / SỬA USER                     */}
      {/* ══════════════════════════════════════════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-black">
                {editingUser ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Tên đăng nhập</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Mật khẩu {editingUser && '(Bỏ trống nếu không đổi)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Họ và Tên</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={userForm.full_name}
                  onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Vai trò</label>
                  <select
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="student">Student (Sinh viên)</option>
                    <option value="verifier">Verifier (Người duyệt)</option>
                    <option value="admin">Admin (Quản trị viên)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Trạng thái</label>
                  <select
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    value={userForm.status}
                    onChange={e => setUserForm({ ...userForm, status: e.target.value })}
                    disabled={editingUser && editingUser.id === user.id}
                  >
                    <option value="active">Active (Hoạt động)</option>
                    <option value="disabled">Disabled (Khóa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-outline-variant/10 flex justify-end gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn--secondary px-5 py-2.5">Hủy</button>
                <button type="submit" disabled={busy} className="btn btn--primary px-5 py-2.5 flex items-center gap-2">
                  {busy && <span className="material-symbols-outlined animate-spin text-sm">refresh</span>}
                  {editingUser ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
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

function TabBtn({ children, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap
        ${active ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
    >
      {children}
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ label, value, sub, icon, accent, urgent }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all relative overflow-hidden
      ${urgent ? 'border-amber-200 bg-amber-50' : 'border-outline-variant/10 bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 leading-tight pr-2">{label}</p>
        <span className="material-symbols-outlined text-xl flex-shrink-0 opacity-50" style={{ color: accent }}>{icon}</span>
      </div>
      <p className="text-3xl font-headline font-black mb-1" style={{ color: accent }}>{value ?? 0}</p>
      <p className="text-[11px] text-on-surface-variant/50">{sub}</p>
    </div>
  )
}

function WeeklyChart({ data }) {
  const hasData = data && data.length > 0
  const chartData = hasData ? data : Array(7).fill(null).map((_, i) => ({
    day: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i] || '--',
    count: 0
  }))
  const max = Math.max(...chartData.map(d => Number(d.count || 0)), 1)

  return (
    <div className="relative">
      <div className="flex items-end gap-1.5 h-36 px-2">
        {chartData.map((d, i) => {
          const count = Number(d.count || 0)
          const pct = (count / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
              <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                {count > 0 && (
                  <span className="absolute -top-5 text-[9px] font-bold text-primary opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                    {count}
                  </span>
                )}
                <div
                  className={`w-full rounded-t-md transition-all duration-500
                    ${count > 0 ? 'bg-primary/80 hover:bg-primary cursor-pointer' : 'bg-surface-container-high'}`}
                  style={{ height: `${Math.max(pct, count > 0 ? 4 : 1)}%`, minHeight: '2px' }}
                  title={`${d.day}: ${count} claims duyệt`}
                />
              </div>
              <span className="text-[9px] text-on-surface-variant/50 font-medium truncate w-full text-center">{d.day}</span>
            </div>
          )
        })}
      </div>
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-on-surface-variant/40 italic">Chưa có dữ liệu claims được duyệt</p>
        </div>
      )}
    </div>
  )
}

function Bar({ h, highlight, current }) {
  return (
    <div
      className={`flex-grow rounded-t-lg transition-all duration-500
        ${current ? 'bg-primary' : highlight ? 'bg-primary/40' : 'bg-surface-container-highest'}`}
      style={{ height: h }}
    />
  )
}

function Metric({ label, value, primary }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1">{label}</p>
      <p className={`text-xl font-headline font-black ${primary ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
    </div>
  )
}
