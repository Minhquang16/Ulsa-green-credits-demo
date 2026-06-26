import React, { useState, useMemo } from 'react'
import '../../styles/admin/admin-users-tab.css'

export default function AdminUsersTab({ users, loadUsers, busy, setBusy, api, showToast, currentUser }) {
  // ── TRẠNG THÁI (STATE) CỦA TRANG ──────────────────────────────────
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'student', status: 'active' })
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // ── XỬ LÝ DỮ LIỆU (LỌC & TÌM KIẾM) ─────────────────────────────────
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

  // ── CÁC HÀM XỬ LÝ (FUNCTIONS) ─────────────────────────────────────
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

  const handleToggleStatus = async (u) => {
    if (u.id === currentUser.id) { showToast('⚠️ Không thể khóa chính mình'); return }
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

  // ── GIAO DIỆN (UI) ────────────────────────────────────────────────
  return (
    <div className="admin-users-tab">
      
      {/* 1. Phần Tiêu đề và Nút thao tác */}
      <div className="admin-users-header">
        <h2 className="admin-users-title">Danh sách Tài khoản</h2>
        <div className="admin-users-actions">
          <button onClick={loadUsers} disabled={busy} className="admin-btn admin-btn-secondary">
            <span className="material-symbols-outlined">refresh</span>
          </button>
          <button onClick={openNewUserModal} className="admin-btn admin-btn-primary">
            <span className="material-symbols-outlined">add</span> Tạo tài khoản mới
          </button>
        </div>
      </div>

      {/* 2. Phần Thanh công cụ Tìm kiếm và Lọc */}
      <div className="admin-users-toolbar">
        <div className="admin-users-search">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            id="user-search"
            type="text"
            placeholder="Tìm theo tên, tài khoản, mã SV..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="admin-input"
          />
        </div>

        <select
          id="role-filter"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="admin-select"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="student">Sinh viên</option>
          <option value="verifier">Verifier</option>
          <option value="admin">Admin</option>
        </select>

        {(searchQuery || roleFilter !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setRoleFilter('all') }}
            className="admin-btn-clear"
          >
            <span className="material-symbols-outlined">close</span> Xóa lọc
          </button>
        )}
      </div>

      {/* 3. Phần Bảng danh sách người dùng */}
      <div className="admin-users-table-container">
        <div className="admin-users-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-info-cell">
                      <div className="user-avatar">
                        {u.avatar_url || u.avatar ? (
                          <img src={u.avatar_url || u.avatar} alt="Avatar" />
                        ) : (
                          u.full_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="user-details">
                        <p className="user-name">{u.full_name}</p>
                        <p className="user-email">{u.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="user-username">@{u.username}</p>
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`status-badge status-${u.status}`}>
                      <span className="material-symbols-outlined">
                        {u.status === 'active' ? 'check_circle' : 'lock'}
                      </span>
                      {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button 
                        onClick={() => openEditUserModal(u)}
                        className="action-btn edit-btn"
                        title="Sửa thông tin"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => handleToggleStatus(u)}
                          className={`action-btn toggle-btn ${u.status === 'active' ? 'lock-btn' : 'unlock-btn'}`}
                          title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          <span className="material-symbols-outlined">
                            {u.status === 'active' ? 'lock' : 'lock_open'}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && !busy && (
                <tr>
                  <td colSpan="5" className="empty-message">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: Cửa sổ bật lên để Tạo/Sửa User */}
      {showUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            
            <div className="admin-modal-header">
              <h3>{editingUser ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới'}</h3>
              <button onClick={() => setShowUserModal(false)} className="close-btn">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="admin-modal-form">
              
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  className="admin-input"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu {editingUser && '(Bỏ trống nếu không đổi)'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  className="admin-input"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Họ và Tên</label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  value={userForm.full_name}
                  onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vai trò</label>
                  <select
                    className="admin-select"
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="student">Sinh viên</option>
                    <option value="verifier">Verifier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    className="admin-select"
                    value={userForm.status}
                    onChange={e => setUserForm({ ...userForm, status: e.target.value })}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="disabled">Khóa</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setShowUserModal(false)} className="modal-btn-cancel">
                  Hủy
                </button>
                <button type="submit" disabled={busy} className="modal-btn-save">
                  {busy ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
