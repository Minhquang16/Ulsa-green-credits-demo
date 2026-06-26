import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import QRScanner from '../../components/QRScanner.jsx'
import QRGenerator from '../../components/QRGenerator.jsx'
import '../../styles/admin/admin-events.css'
import headerIllustration from '../../assets/img_sidebar/anh.png'


function formatDate(s) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} — ${date}`
  } catch { return s }
}

function getEventStatus(start_at, end_at) {
  if (!start_at || !end_at) return 'ongoing';
  const now = new Date();
  if (now < new Date(start_at)) return 'upcoming';
  if (now > new Date(end_at)) return 'completed';
  return 'ongoing';
}

function toDatetimeLocal(s) {
  if (!s) return ''
  try {
    const d = new Date(s)
    const pad = n => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}

const EMPTY_FORM = { activity_type_id: '', title: '', description: '', location: '', latitude: '', longitude: '', start_at: '', end_at: '' }
const EMPTY_AT = { name: '', credit_amount: '', description: '' }

export default function AdminEvents() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [activityTypes, setActivityTypes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showNewAT, setShowNewAT] = useState(false)
  const [atForm, setAtForm] = useState(EMPTY_AT)
  const [atFile, setAtFile] = useState(null)
  const [atEditId, setAtEditId] = useState(null)
  const [atBusy, setAtBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 4

  async function loadAll() {
    setError('')
    try {
      const [ev, at] = await Promise.all([api('/events'), api('/activity-types')])
      setEvents(ev && ev.events ? ev.events : (Array.isArray(ev) ? ev : []))
      setActivityTypes(Array.isArray(at) ? at : [])
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải dữ liệu')
    }
  }

  useEffect(() => { loadAll() }, [])

  const selectedAT = activityTypes.find(a => String(a.id) === String(form.activity_type_id))

  function handleEdit(ev) {
    setEditId(ev.id)
    setForm({
      activity_type_id: ev.activity_type_id || '',
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      latitude: ev.latitude || '',
      longitude: ev.longitude || '',
      start_at: toDatetimeLocal(ev.start_at),
      end_at: toDatetimeLocal(ev.end_at)
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  function handleEditAT() {
    if (!selectedAT) return
    setAtEditId(selectedAT.id)
    setAtForm({ name: selectedAT.name, credit_amount: String(selectedAT.credit_amount), description: selectedAT.description })
    setShowNewAT(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteEvent(id) {
    if (!window.confirm('Xóa sự kiện này?')) return
    try {
      await api(`/events/${id}`, { method: 'DELETE' })
      showToast('✅ Đã xóa sự kiện')
      loadAll()
    } catch { showToast('❌ Lỗi xóa sự kiện') }
  }

  async function createActivityType(e) {
    e.preventDefault()
    if (!atForm.name || !atForm.credit_amount) { showToast('⚠️ Vui lòng nhập Tên và Credits'); return }
    setAtBusy(true)
    try {
      let desc = atForm.description || ''
      if (atFile) {
        const fd = new FormData()
        fd.append('file', atFile)
        const res = await api('/upload', { method: 'POST', body: fd })
        desc = res.url
      }
      if (atEditId) {
        await api(`/activity-types/${atEditId}`, { method: 'PUT', body: JSON.stringify({ name: atForm.name, credit_amount: Number(atForm.credit_amount), description: desc }) })
        showToast('✅ Đã cập nhật loại nhiệm vụ!')
      } else {
        await api('/activity-types', { method: 'POST', body: JSON.stringify({ name: atForm.name, credit_amount: Number(atForm.credit_amount), description: desc }) })
        showToast('✅ Đã tạo loại nhiệm vụ mới!')
      }
      setAtEditId(null)
      await loadAll() // Reload all events and activity types to reflect the new image across all event cards
      if (!atEditId) {
        const at = await api('/activity-types')
        const newAT = at.find(a => a.name === atForm.name)
        if (newAT) setForm(f => ({ ...f, activity_type_id: String(newAT.id) }))
      }
      setAtForm(EMPTY_AT); setAtFile(null); setShowNewAT(false)
    } catch (err) { showToast('❌ Lỗi: ' + err.message) } finally { setAtBusy(false) }
  }

  async function createEvent(e) {
    e.preventDefault()
    if (!form.activity_type_id) { showToast('⚠️ Chọn loại nhiệm vụ'); return }
    setBusy(true); setError('')
    try {
      const payload = { ...form }
      payload.start_at = payload.start_at ? (() => { const d = new Date(payload.start_at); return isNaN(d.getTime()) ? null : d.toISOString() })() : null
      payload.end_at = payload.end_at ? (() => { const d = new Date(payload.end_at); return isNaN(d.getTime()) ? null : d.toISOString() })() : null
      payload.latitude = payload.latitude ? parseFloat(payload.latitude) : null
      payload.longitude = payload.longitude ? parseFloat(payload.longitude) : null
      if (editId) {
        await api(`/events/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        showToast('✅ Đã cập nhật sự kiện!')
        setEditId(null)
      } else {
        await api('/events', { method: 'POST', body: JSON.stringify(payload) })
        showToast('✅ Đã tạo sự kiện thành công!')
      }
      setForm(EMPTY_FORM)
      await loadAll()
    } catch (e) {
      setError(e.message)
      showToast(editId ? '❌ Lỗi cập nhật' : '❌ Lỗi tạo sự kiện')
    } finally { setBusy(false) }
  }

  async function submitClaim(eventId, file, note, token) {
    setBusy(true)
    try {
      const fd = new FormData()
      if (file) fd.append('evidence', file)
      fd.append('note', note || '')
      fd.append('token', token || '')
      await api(`/events/${eventId}/claims`, { method: 'POST', body: fd })
      showToast('🎉 Đã nộp minh chứng! Chờ duyệt để nhận UGC.')
      return true
    } catch (e) {
      showToast(`❌ ${e.message}`)
      return false
    } finally { setBusy(false) }
  }

  const filteredEvents = useMemo(() => {
    let result = Array.isArray(events) ? [...events] : []
    if (statusFilter !== 'all' && statusFilter !== 'latest' && statusFilter !== 'near') {
      result = result.filter(ev => getEventStatus(ev.start_at, ev.end_at) === statusFilter)
    }
    if (searchQuery) {
      result = result.filter(ev => ev.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (statusFilter === 'latest') {
      result.sort((a, b) => new Date(b.created_at || b.start_at) - new Date(a.created_at || a.start_at))
    }
    return result
  }, [events, statusFilter, searchQuery])

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const getPaginationGroup = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  const stats = {
    total: events.length,
    ongoing: events.filter(e => getEventStatus(e.start_at, e.end_at) === 'ongoing').length,
    upcoming: events.filter(e => getEventStatus(e.start_at, e.end_at) === 'upcoming').length,
    completed: events.filter(e => getEventStatus(e.start_at, e.end_at) === 'completed').length,
  };

  return (
    <div className="admin-events">
      <main className="admin-events__main">
        {error && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-medium">{error}</div>}

        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="max-w-2xl z-10">
            <h1 className="text-[28px] font-extrabold text-slate-900 mb-3 tracking-tight">Quản lý Hoạt động</h1>
            <p className="text-slate-600 text-[14px] leading-relaxed">
              Chọn loại nhiệm vụ có sẵn và tạo sự kiện. Nếu chưa có loại phù hợp, hãy tạo mới ngay bên dưới.
            </p>
          </div>
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[160px] opacity-90 pointer-events-none">
            <img src={headerIllustration} alt="Illustration" className="w-full h-full object-contain object-right" onError={(e) => e.target.style.display = 'none'} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">event_note</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng hoạt động</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{stats.total}</span>
                <span className="text-[10px] font-bold text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded flex items-center mb-0.5">↑ 12%</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đang diễn ra</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{stats.ongoing}</span>
                <span className="text-[10px] font-bold text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded flex items-center mb-0.5">↑ 8%</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">schedule</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sắp diễn ra</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{stats.upcoming}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center mb-0.5">→ 0%</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">check_circle</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đã kết thúc</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{stats.completed}</span>
                <span className="text-[10px] font-bold text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded flex items-center mb-0.5">↑ 4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="admin-events__layout">

          {/* Left Column - Event List */}
          <div className="admin-events__col-left">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Danh sách hoạt động</h2>

            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex items-center justify-between gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors min-w-[160px]">
                      <span>{
                        statusFilter === 'all' ? 'Tất cả trạng thái' :
                          statusFilter === 'ongoing' ? 'Đang diễn ra' :
                            statusFilter === 'upcoming' ? 'Sắp diễn ra' :
                              statusFilter === 'completed' ? 'Đã kết thúc' : 'Tất cả trạng thái'
                      }</span>
                      <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[180px] rounded-xl p-1 border border-slate-200">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2 text-sm">Tất cả trạng thái</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('upcoming')} className="rounded-md cursor-pointer py-2 text-sm">Sắp diễn ra</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('ongoing')} className="rounded-md cursor-pointer py-2 text-sm">Đang diễn ra</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('completed')} className="rounded-md cursor-pointer py-2 text-sm">Đã kết thúc</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                  <button className="p-1 rounded-md bg-[#006A31] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
                  <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">view_list</span></button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {paginatedEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} userRole={user.role}
                  onSubmitClaim={submitClaim} busy={busy}
                  onEdit={() => handleEdit(ev)} onDelete={() => deleteEvent(ev.id)} />
              ))}
              {filteredEvents.length === 0 && (
                <div className="py-16 text-center text-slate-400 bg-white rounded-[24px] border border-slate-100">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-30">event_busy</span>
                  <p className="text-sm">Không tìm thấy sự kiện nào.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 py-4 border-t border-slate-100">
                <div className="text-[14px] font-semibold text-slate-800">
                  Page {currentPage} of {totalPages}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all bg-white shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_left</span>
                  </button>

                  <button
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all bg-white shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>

                  <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all bg-white shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>

                  <button
                    onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all bg-white shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form & Widgets */}
          <div className="admin-events__col-right">

            {/* Create Event Form */}
            <div className="event-form">
              <div className="event-form__bg-decor"></div>

              <div className="event-form__header">
                <div className="event-form__icon-box">
                  <span className="material-symbols-outlined text-[24px]">add_box</span>
                </div>
                <div>
                  <h3 className="event-form__title">Tạo sự kiện mới</h3>
                  <p className="event-form__subtitle">Điền thông tin để tạo sự kiện mới</p>
                </div>
              </div>

              <form onSubmit={createEvent}>
                {/* 1. Nhiệm vụ xanh */}
                <div className="event-form__group">
                  <div className="event-form__label-header">
                    <label className="event-form__label">
                      1. Nhiệm vụ xanh
                    </label>
                    <button type="button" onClick={() => setShowNewAT(v => !v)} className="text-[11px] font-bold text-[#006A31] hover:underline">
                      {showNewAT ? '– Đóng' : '+ Tạo mới'}
                    </button>
                  </div>

                  {showNewAT && (
                    <div className="event-form__new-task-panel">
                      <p className="event-form__new-task-title">
                        <span className="material-symbols-outlined text-[16px]">eco</span>
                        Nhiệm vụ xanh mới
                      </p>
                      <div className="event-form__grid-2">
                        <input className="event-form__new-task-input" placeholder="Tên (VD: Đạp xe)" value={atForm.name} onChange={e => setAtForm(f => ({ ...f, name: e.target.value }))} required={showNewAT} />
                        <input className="event-form__new-task-input" type="number" placeholder="Credits (VD: 6)" value={atForm.credit_amount} onChange={e => setAtForm(f => ({ ...f, credit_amount: e.target.value }))} required={showNewAT} />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#006A31] block mb-1">Ảnh bìa cho nhiệm vụ</label>
                        <input type="file" accept="image/*" onChange={e => setAtFile(e.target.files[0])} className="event-form__new-task-file" />
                      </div>
                      <button type="button" onClick={createActivityType} disabled={atBusy} className="event-form__btn-task-submit">
                        {atBusy ? 'Đang lưu...' : (atEditId ? '✓ Cập nhật' : '✓ Tạo & chọn')}
                      </button>
                    </div>
                  )}

                  <div className="event-form__select-wrapper">
                    <select className="event-form__select" value={form.activity_type_id} onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))} required>
                      <option value="">-- Chọn nhiệm vụ --</option>
                      {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name} ({at.credit_amount} UGC)</option>)}
                    </select>
                    <span className="material-symbols-outlined event-form__select-icon">expand_more</span>
                  </div>
                </div>

                {/* 2. Tiêu đề */}
                <div className="event-form__group">
                  <label className="event-form__label">
                    2. Tiêu đề sự kiện
                  </label>
                  <input className="event-form__input" placeholder="VD: Hiến máu nhân đạo" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>

                {/* 3. Địa điểm */}
                <div className="event-form__group">
                  <label className="event-form__label">
                    3. Địa điểm
                  </label>
                  <input className="event-form__input" placeholder="Khu A — Hội trường" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>

                {/* 4. Bắt đầu - 5. Kết thúc */}
                <div className="event-form__grid-2">
                  <div>
                    <label className="event-form__label">
                      4. Bắt đầu
                    </label>
                    <input className="event-form__input event-form__input--time" type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
                  </div>
                  <div>
                    <label className="event-form__label">
                      5. Kết thúc
                    </label>
                    <input className="event-form__input event-form__input--time" type="datetime-local" value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
                  </div>
                </div>

                {/* 6. Mô tả */}
                <div className="event-form__group--large">
                  <label className="event-form__label">
                    6. Mô tả
                  </label>
                  <textarea rows="3" className="event-form__textarea" placeholder="Mô tả chi tiết sự kiện..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* Submit button */}
                <div className="event-form__actions">
                  <button type="submit" disabled={busy} className="event-form__btn-submit">
                    {busy ? 'Đang lưu...' : (editId ? 'Cập nhật sự kiện' : <><span className="material-symbols-outlined text-[14px]">add_circle</span> Tạo sự kiện</>)}
                  </button>
                  {editId && (
                    <button type="button" onClick={cancelEdit} className="event-form__btn-cancel">
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Widget: Tổng quan hoạt động */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6">
              <h3 className="font-extrabold text-slate-800 text-[14px] mb-4">Tổng quan hoạt động</h3>
              <div className="flex items-center gap-5">
                {/* CSS Pie Chart placeholder */}
                <div className="relative w-20 h-20 rounded-full border-[6px] border-slate-100 shrink-0 flex items-center justify-center" style={{ borderTopColor: '#16a34a', borderRightColor: '#f59e0b', transform: 'rotate(45deg)' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
                    <span className="text-xl font-black text-slate-800 leading-none">{stats.total}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Tổng số</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-[#16a34a]"></span> Đang diễn ra</span>
                    <span className="font-bold text-slate-800">{stats.ongoing} <span className="text-slate-400 font-normal text-[10px]">({stats.total ? Math.round(stats.ongoing / stats.total * 100) : 0}%)</span></span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Sắp diễn ra</span>
                    <span className="font-bold text-slate-800">{stats.upcoming} <span className="text-slate-400 font-normal text-[10px]">({stats.total ? Math.round(stats.upcoming / stats.total * 100) : 0}%)</span></span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Đã kết thúc</span>
                    <span className="font-bold text-slate-800">{stats.completed} <span className="text-slate-400 font-normal text-[10px]">({stats.total ? Math.round(stats.completed / stats.total * 100) : 0}%)</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget: Thao tác nhanh */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6">
              <h3 className="font-extrabold text-slate-800 text-[14px] mb-4">Thao tác nhanh</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-[#006A31]/30 hover:bg-[#006A31]/5 transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-[#006A31] group-hover:scale-110 transition-transform">description</span>
                  <span className="text-xs font-semibold text-slate-700">Xuất báo cáo</span>
                </button>
                <button className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-[#006A31]/30 hover:bg-[#006A31]/5 transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-[#006A31] group-hover:scale-110 transition-transform">calendar_month</span>
                  <span className="text-xs font-semibold text-slate-700">Lịch hoạt động</span>
                </button>
                <button className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-[#006A31]/30 hover:bg-[#006A31]/5 transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-[#006A31] group-hover:scale-110 transition-transform">upload_file</span>
                  <span className="text-xs font-semibold text-slate-700">Import sự kiện</span>
                </button>
                <button className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-[#006A31]/30 hover:bg-[#006A31]/5 transition-colors text-left group">
                  <span className="material-symbols-outlined text-[18px] text-[#006A31] group-hover:scale-110 transition-transform">settings</span>
                  <span className="text-xs font-semibold text-slate-700">Cài đặt</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

function EventDetailsModal({ ev, imgSrc, onClose, onCheckIn, userRole, showQRScanner }) {
  const status = getEventStatus(ev.start_at, ev.end_at);
  const isOngoing = status === 'ongoing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="relative h-48 shrink-0 bg-slate-100 flex items-center justify-center">
          <img alt={ev.title} className="w-full h-full object-contain" src={imgSrc} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">{ev.activity_name}</span>
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">+{ev.credit_amount} UGC</span>
          </div>

          <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-4 leading-tight">{ev.title}</h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Địa điểm</p>
                <p className="text-sm">{ev.location || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">schedule</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Thời gian</p>
                <p className="text-sm">Bắt đầu: {formatDate(ev.start_at)}</p>
                <p className="text-sm">Kết thúc: {formatDate(ev.end_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">description</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Nhiệm vụ của bạn</p>
                <p className="text-sm whitespace-pre-line leading-relaxed">{ev.description || 'Tham gia sự kiện và quét mã QR tại địa điểm tổ chức để nhận UGC.'}</p>
              </div>
            </div>
          </div>

          {userRole === 'student' && (
            <div className="pt-4 border-t border-outline-variant/20">
              {status === 'upcoming' && (
                <div className="p-4 rounded-xl bg-orange-50 text-orange-800 text-sm font-medium text-center border border-orange-100">
                  ⏳ Nhiệm vụ chưa bắt đầu. Hãy quay lại sau nhé!
                </div>
              )}
              {status === 'completed' && (
                <div className="p-4 rounded-xl bg-surface-variant text-on-surface-variant text-sm font-medium text-center">
                  ✅ Nhiệm vụ đã kết thúc.
                </div>
              )}
              {isOngoing && (
                <button onClick={() => { onClose(); showQRScanner(); }}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 transition-all">
                  <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                  Quét QR Check-in Nhận UGC
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EventCard({ ev, userRole, onSubmitClaim, busy, onEdit, onDelete }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [checkedInStatus, setCheckedInStatus] = useState(false)
  const { showToast } = useToast()

  const status = getEventStatus(ev.start_at, ev.end_at)

  const statusConfig = {
    upcoming: { modifier: 'event-card__badge-top--upcoming', label: 'SẮP DIỄN RA', icon: 'event' },
    ongoing: { modifier: 'event-card__badge-top--ongoing', label: 'ĐANG DIỄN RA', icon: 'local_fire_department' },
    completed: { modifier: 'event-card__badge-top--completed', label: 'ĐÃ KẾT THÚC', icon: 'check_circle' }
  }

  // Derive some tags
  const tags = ['Sự kiện']
  if (ev.activity_name?.toLowerCase().includes('đạp xe')) tags.push('Cá nhân', 'Hàng ngày')
  else if (ev.activity_name?.toLowerCase().includes('tái chế')) tags.push('Nhóm', 'Cuối tuần')
  else tags.push('Nhóm', 'Dài hạn')

  const imageMap = {
    'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
    'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
    'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs'
  }
  const defaultImg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8'
  const activityLower = ev.activity_name?.toLowerCase() || ''

  let imgSrc = imageMap[Object.keys(imageMap).find(k => activityLower.includes(k))] || defaultImg
  if (ev.activity_description && ev.activity_description.startsWith('/uploads')) {
    imgSrc = `/api${ev.activity_description}`
  }

  // Calculate days remaining
  const start = new Date(ev.start_at);
  const now = new Date();
  const diffTime = start - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let timeStr = 'Đang diễn ra';
  if (status === 'upcoming') {
    timeStr = `Bắt đầu sau ${diffDays} ngày`;
    if (diffDays === 0) timeStr = `Bắt đầu sau ${diffHours} giờ`;
  } else if (status === 'completed') {
    timeStr = 'Đã kết thúc';
  } else {
    const end = new Date(ev.end_at);
    const diffE = Math.floor((end - now) / (1000 * 60 * 60 * 24));
    const diffEH = Math.floor(((end - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timeStr = `Còn ${diffE} ngày ${diffEH} giờ`;
  }

  return (
    <>
      <div className="event-card">
        {/* Left: Image Box */}
        <div className="event-card__image" onClick={() => setShowDetails(true)}>
          <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />

          {/* Top Badge */}
          <div className={`event-card__badge-top ${statusConfig[status].modifier}`}>
            <span className="material-symbols-outlined text-[12px]">{statusConfig[status].icon}</span>
            {statusConfig[status].label}
          </div>

          {/* Bottom Badge */}
          <div className="event-card__badge-bottom">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {ev.credit_amount} UGC
          </div>
        </div>

        {/* Middle: Content */}
        <div className="event-card__content" onClick={() => setShowDetails(true)}>
          <span className="event-card__activity-name">{ev.activity_name}</span>
          <h3 className="event-card__title">{ev.title}</h3>
          <p className="event-card__desc">{ev.description || 'Tham gia sự kiện xanh...'}</p>

          <div className="event-card__meta">
            <div className="event-card__meta-item">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span className="truncate">{ev.location || 'Chưa cập nhật'}</span>
            </div>
            <div className="event-card__meta-item">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{new Date(ev.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="event-card__tags">
            {tags.map(t => (
              <span key={t} className="event-card__tag">{t}</span>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="event-card__actions">
          <div className="event-card__actions-text">
            <div className="event-card__ugc">
              +{ev.credit_amount} UGC
            </div>
            <div className="event-card__time">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeStr}
            </div>
          </div>

          <div className="event-card__btn-container">
            <button onClick={() => setShowQR(true)} className="event-card__btn-qr">
              <span className="material-symbols-outlined text-[16px]">qr_code_2</span> Mã QR Check-in
            </button>
            <div className="event-card__btn-group">
              <button onClick={onEdit} className="event-card__btn-edit">
                <span className="material-symbols-outlined text-[14px]">edit</span> Sửa
              </button>
              <button onClick={onDelete} className="event-card__btn-delete">
                <span className="material-symbols-outlined text-[14px]">delete</span> Xóa
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDetails && (
        createPortal(
          <EventDetailsModal
            ev={ev}
            imgSrc={imgSrc}
            userRole={userRole}
            onClose={() => setShowDetails(false)}
            showQRScanner={() => setShowScanner(true)}
          />,
          document.body
        )
      )}

      {showQR && createPortal(<QRGenerator eventId={ev.id} onClose={() => setShowQR(false)} />, document.body)}
      {showScanner && createPortal(
        <QRScanner eventId={ev.id} onClose={() => setShowScanner(false)}
          onSuccess={(msg, isOffline) => {
            setShowScanner(false);
            showToast(isOffline ? '⚠️ ' + msg : '✅ ' + msg);
            setCheckedInStatus(isOffline ? 'offline' : 'online');
            if (!isOffline) setOpen(true);
          }} />,
        document.body
      )}
    </>
  )
}
