import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  
  const [activeTab, setActiveTab] = useState('stats') // 'stats' or 'users'
  
  // Stats state
  const [stats, setStats] = useState({ users: 0, events: 0, claims: 0, approved: 0 })
  const [tokenStats, setTokenStats] = useState({ issued: 0, burned: 0, supply: 0, contract: 'Loading...' })
  
  // Users state
  const [users, setUsers] = useState([])
  const [busy, setBusy] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'student', status: 'active' })
  const [selectedCardImage, setSelectedCardImage] = useState(null)

  async function loadStats() {
    try {
      setBusy(true)
      const s = await api('/analytics/overview')
      setStats(s)
      const c = await api('/wallet/contract')
      const b = await api('/wallet/balance')
      setTokenStats(prev => ({
        ...prev,
        contract: c.address,
        supply: b.balance,
        issued: s.token?.totalIssued ?? prev.issued,
        burned: s.token?.totalBurned ?? prev.burned
      }))
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

  useEffect(() => {
    loadUsers() // Load on mount to get pending count badges
  }, [])

  useEffect(() => { 
    if (activeTab === 'stats') {
      loadStats() 
    } else {
      loadUsers()
    }
  }, [activeTab])

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
        // PUT
        await api(`/admin/users/${editingUser.id}`, 'PUT', userForm)
        showToast('✅ Cập nhật tài khoản thành công')
      } else {
        // POST
        await api('/admin/users', 'POST', userForm)
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

  const handleToggleStatus = async (u) => {
    if (u.id === user.id) {
      showToast('⚠️ Không thể khóa chính mình')
      return
    }
    const newStatus = u.status === 'active' ? 'disabled' : 'active'
    if (!window.confirm(`Bạn có chắc muốn ${newStatus === 'active' ? 'MỞ KHÓA' : 'KHÓA'} tài khoản ${u.username}?`)) return
    try {
      setBusy(true)
      await api(`/admin/users/${u.id}`, 'PUT', { status: newStatus })
      showToast(`✅ Đã ${newStatus === 'active' ? 'mở khóa' : 'khóa'} tài khoản`)
      loadUsers()
    } catch (err) {
      showToast(`⚠️ Lỗi: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn PHÊ DUYỆT tài khoản sinh viên này và cấp ví Blockchain?')) return
    try {
      setBusy(true)
      await api(`/admin/users/${userId}/approve`, 'POST')
      showToast('✅ Phê duyệt thành công! Ví Blockchain đã được cấp.')
      loadUsers()
    } catch (err) {
      showToast(`⚠️ Lỗi phê duyệt: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn TỪ CHỐI tài khoản sinh viên này?')) return
    try {
      setBusy(true)
      await api(`/admin/users/${userId}/reject`, 'POST')
      showToast('❌ Đã từ chối tài khoản sinh viên.')
      loadUsers()
    } catch (err) {
      showToast(`⚠️ Lỗi từ chối: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in relative">

      {/* Page Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Governance Hub</p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Trung tâm Quản trị</h1>
        </div>
        <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl shadow-sm border border-outline-variant/10">
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Tổng quan Stats
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Quản lý Người dùng
          </button>
          <button 
            onClick={() => setActiveTab('pending')} 
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'} flex items-center gap-1.5`}
          >
            Duyệt Sinh Viên
            {users.filter(u => u.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                {users.filter(u => u.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-end mb-4 gap-2">
            <button onClick={() => showToast('Đang xuất báo cáo...')} className="btn btn--secondary px-4 py-2 text-xs">Xuất báo cáo</button>
            <button onClick={loadStats} disabled={busy} className="btn btn--primary px-4 py-2 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
            </button>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Tổng Users" value={stats.users} trend="+8.4%" icon="group" trendColor="text-primary" />
            <StatCard label="Sự kiện" value={stats.events} trend="Đang diễn ra" icon="event_available" trendColor="text-on-surface-variant/40" />
            <StatCard label="Claims" value={stats.claims} trend="Chờ duyệt" icon="pending_actions" trendColor="text-tertiary" />
            <StatCard label="Đã Approved" value={stats.approved} trend="UGC Credits" icon="verified_user" trendColor="text-primary" />
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
                  <Bar h="75%" />
                  <Bar h="50%" />
                  <Bar h="65%" />
                  <Bar h="83%" highlight />
                  <Bar h="33%" />
                  <Bar h="100%" current />
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
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg border border-white/20">
                  <img className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-700"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUV-j2VHKybDkVguFFQ7jOKsKRRgT_-PwPfiQlnsW2moWzJFPIxLZ_6XuF3_sp30Cafs9VdZY3uS7BxGm02mfgxo89VAAxCr8kH9jsB7CwL9SuXXi1VTipzDUWsG23553M4o8fLirOMxP9jVHgY35UiIAiWqR8P2YwijHt_8LSwwCdK9hSL_O4vf-Ba3JnPaz09Lgg1aqNLWhEhEOo-VmNMjKJXfjsUFJUYd7LcrgBtIkme7TKGeoERzesG6PTNOE1sVteTQYJgH0"
                    alt="Amazon" />
                  <p className="p-3 bg-surface-container-high text-[10px] font-bold text-on-surface-variant italic">Amazon Basin Reforestation</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-full h-full editorial-gradient opacity-[0.02] pointer-events-none"></div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-headline font-black">Danh sách Tài khoản</h2>
            <div className="flex gap-2">
              <button onClick={loadUsers} disabled={busy} className="btn btn--secondary px-4 py-2 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
              <button onClick={openNewUserModal} className="btn btn--primary px-4 py-2 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Tạo tài khoản mới
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant/60 font-bold">
                    <th className="p-4 border-b border-outline-variant/10">User</th>
                    <th className="p-4 border-b border-outline-variant/10">Ví Blockchain</th>
                    <th className="p-4 border-b border-outline-variant/10 text-right">Số dư UGC</th>
                    <th className="p-4 border-b border-outline-variant/10 text-center">Trạng thái</th>
                    <th className="p-4 border-b border-outline-variant/10 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.filter(u => u.status === 'active' || u.status === 'disabled').map(u => (
                    <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
                            ${u.role === 'admin' ? 'bg-error' : u.role === 'verifier' ? 'bg-primary' : 'bg-tertiary'}
                          `}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{u.full_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-on-surface-variant">@{u.username}</p>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded
                                ${u.role === 'admin' ? 'bg-error/10 text-error' : u.role === 'verifier' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}
                              `}>{u.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-surface-container-low px-2 py-1 rounded text-on-surface-variant">
                            {u.wallet_address.substring(0,6)}...{u.wallet_address.substring(38)}
                          </code>
                          <button onClick={() => {
                            navigator.clipboard.writeText(u.wallet_address);
                            showToast('Đã copy địa chỉ ví!');
                          }} className="text-on-surface-variant/40 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right font-headline font-black text-primary">
                        {u.ugc_balance}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full
                          ${u.status === 'active' ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'}
                        `}>
                          <span className="material-symbols-outlined text-[12px]">
                            {u.status === 'active' ? 'check_circle' : 'block'}
                          </span>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditUserModal(u)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Sửa thông tin">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleToggleStatus(u)} className={`p-1.5 rounded-lg transition-colors ${u.status === 'active' ? 'text-on-surface-variant hover:text-error hover:bg-error/10' : 'text-error hover:text-[#2e7d32] hover:bg-[#2e7d32]/10'}`} title={u.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                            <span className="material-symbols-outlined text-[18px]">
                              {u.status === 'active' ? 'lock' : 'lock_open'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.status === 'active' || u.status === 'disabled').length === 0 && !busy && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-on-surface-variant">Chưa có người dùng nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-headline font-black">Yêu cầu Phê duyệt Sinh viên</h2>
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
                  {users.filter(u => u.status === 'pending' || u.status === 'rejected').map(u => (
                    <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg bg-indigo-600">
                            {u.full_name.charAt(0).toUpperCase()}
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
                          ${u.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}
                        `}>
                          <span className="material-symbols-outlined text-[12px]">
                            {u.status === 'pending' ? 'hourglass_empty' : 'block'}
                          </span>
                          {u.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(u.id)} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Duyệt
                          </button>
                          {u.status === 'pending' && (
                            <button 
                              onClick={() => handleReject(u.id)} 
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition-all active:scale-95"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                              Từ chối
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.status === 'pending' || u.status === 'rejected').length === 0 && !busy && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-on-surface-variant">Không có yêu cầu nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
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
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Tên đăng nhập (Username)</label>
                <input 
                  type="text" 
                  required 
                  disabled={!!editingUser}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Mật khẩu {editingUser && '(Bỏ trống nếu không đổi)'}</label>
                <input 
                  type="password" 
                  required={!editingUser}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Họ và Tên</label>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Vai trò</label>
                  <select 
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
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
                    onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                    disabled={editingUser && editingUser.id === user.id} // cannot change own status
                  >
                    <option value="active">Active (Hoạt động)</option>
                    <option value="disabled">Disabled (Khóa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-outline-variant/10 flex justify-end gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn--secondary px-5 py-2.5">
                  Hủy
                </button>
                <button type="submit" disabled={busy} className="btn btn--primary px-5 py-2.5 flex items-center gap-2">
                  {busy ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : null}
                  {editingUser ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Card Image Viewer Modal */}
      {selectedCardImage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedCardImage(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
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

function StatCard({ label, value, trend, icon, trendColor }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/5 shadow-md relative overflow-hidden hover:shadow-lg transition-shadow">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-headline font-black text-on-surface">{value}</span>
        <span className={`text-[9px] font-bold ${trendColor}`}>{trend}</span>
      </div>
      <span className="material-symbols-outlined absolute top-4 right-4 text-2xl opacity-[0.08]">{icon}</span>
    </div>
  )
}

function Bar({ h, highlight, current }) {
  return (
    <div className={`flex-grow rounded-t-lg transition-all duration-500 ${current ? 'bg-primary' : highlight ? 'bg-primary/40' : 'bg-surface-container-highest'}`} style={{ height: h }}></div>
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
