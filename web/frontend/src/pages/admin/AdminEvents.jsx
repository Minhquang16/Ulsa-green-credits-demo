import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import QRScanner from '../../components/QRScanner.jsx'
import QRGenerator from '../../components/QRGenerator.jsx'
import '../../styles/admin/admin-events.css'


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

const EMPTY_FORM = { activity_type_id: '', title: '', description: '', location: '', start_at: '', end_at: '' }
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

  return (
    <div style={{ background: '#ffffff' }} className="min-h-screen w-full">
      <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">
        {error && <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm">{error}</div>}

        
          <section className="mb-12">
            <div className="flex flex-col lg:flex-row justify-between gap-8 items-start">
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Verifier / Admin Portal</span>
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">Quản lý Hoạt động</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                  Chọn loại nhiệm vụ có sẵn và tạo sự kiện. Nếu chưa có loại phù hợp, hãy tạo mới ngay bên dưới.
                </p>
              </div>

              <div className="w-full lg:w-[400px] bg-surface-container-low rounded-3xl p-6 shadow-xl shadow-black/5 border border-outline-variant/10 shrink-0">
                <form onSubmit={createEvent} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-on-primary text-[8px] font-black mr-1.5">1</span>
                        Nhiệm vụ xanh
                      </label>
                      <button type="button" onClick={() => setShowNewAT(v => !v)}
                        className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline">
                        <span className="material-symbols-outlined text-xs">{showNewAT ? 'remove' : 'add'}</span>
                        {showNewAT ? 'Đóng' : 'Tạo mới'}
                      </button>
                    </div>

                    {showNewAT && (
                      <div className="rounded-xl bg-surface-container-highest p-3 space-y-2 border border-primary/20">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">eco</span>Nhiệm vụ xanh mới
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="bg-surface-container border-none rounded-lg py-2 px-3 text-xs outline-none"
                            placeholder="Tên (VD: Đạp xe)" required={showNewAT}
                            value={atForm.name} onChange={e => setAtForm(f => ({ ...f, name: e.target.value }))} />
                          <input className="bg-surface-container border-none rounded-lg py-2 px-3 text-xs outline-none"
                            type="number" min="1" placeholder="Credits (VD: 6)" required={showNewAT}
                            value={atForm.credit_amount} onChange={e => setAtForm(f => ({ ...f, credit_amount: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-primary">{atEditId ? 'Thay đổi ảnh bìa' : 'Ảnh bìa cho nhiệm vụ'}</label>
                          <input type="file" accept="image/*" onChange={e => setAtFile(e.target.files[0])}
                            className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={createActivityType} disabled={atBusy}
                            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs disabled:opacity-50 hover:opacity-90 transition-opacity">
                            {atBusy ? 'Đang lưu...' : (atEditId ? '✓ Cập nhật' : '✓ Tạo & chọn')}
                          </button>
                          {atEditId && (
                            <button type="button" onClick={() => { setAtEditId(null); setAtForm(EMPTY_AT); setShowNewAT(false) }}
                              className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold">Hủy</button>
                          )}
                        </div>
                      </div>
                    )}

                    <select className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      value={form.activity_type_id} onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))} required>
                      <option value="">-- Chọn nhiệm vụ --</option>
                      {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name} ({at.credit_amount} UGC)</option>)}
                    </select>

                    {selectedAT && (
                      <div className="flex items-center justify-between px-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-sm">eco</span>
                          <span className="text-[10px] text-primary font-bold">{selectedAT.name} · {selectedAT.credit_amount} UGC</span>
                        </div>
                        <button type="button" onClick={handleEditAT} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">edit</span>Sửa
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-on-primary text-[8px] font-black mr-1.5">2</span>
                      Tiêu đề sự kiện
                    </label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="VD: Hiến máu nhân đạo" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Địa điểm</label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="Khu A — Hội trường" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Bắt đầu</label>
                      <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs outline-none" type="datetime-local"
                        value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Kết thúc</label>
                      <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs outline-none" type="datetime-local"
                        value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Mô tả</label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="Mô tả chi tiết sự kiện" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={busy}
                      className="flex-1 bg-primary text-on-primary font-headline font-bold py-3 rounded-xl shadow-lg shadow-primary/10 active:scale-[0.98] transition-all text-sm disabled:opacity-50">
                      {busy ? 'Đang lưu...' : (editId ? 'Cập nhật sự kiện' : 'Tạo sự kiện')}
                    </button>
                    {editId && (
                      <button type="button" onClick={cancelEdit}
                        className="px-5 bg-surface-container-highest text-on-surface font-bold py-3 rounded-xl text-sm hover:bg-surface-variant transition-all">Hủy</button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </section>
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary block">Quản lý & Giám sát</span>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-slate-800 mt-1">Danh sách Hoạt động</h2>
            <p className="text-sm text-slate-500 font-medium">Theo dõi, chỉnh sửa và tạo mã QR Check-in cho các sự kiện đang diễn ra.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto self-end lg:pb-2">
            <div className="relative flex-1 lg:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input type="text" placeholder="Tìm kiếm hoạt động..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-[36px] pl-9 pr-4 bg-white border border-solid border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all box-border shadow-sm placeholder:text-slate-400" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex rounded-full overflow-hidden border border-solid border-slate-200 bg-white text-sm font-medium text-slate-700 h-[36px] hover:bg-slate-50 transition-colors items-stretch shadow-sm box-border">
                  <div className="px-4 flex items-center justify-center border-r border-solid border-slate-200">
                    {statusFilter === 'all' && 'Tất cả trạng thái'}
                    {statusFilter === 'upcoming' && 'Sắp diễn ra'}
                    {statusFilter === 'ongoing' && 'Đang diễn ra'}
                    {statusFilter === 'completed' && 'Đã kết thúc'}
                    {statusFilter === 'latest' && 'Mới nhất'}
                    {statusFilter === 'near' && 'Gần tôi'}
                  </div>
                  <div className="px-2.5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 border border-solid border-slate-200">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2">Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('upcoming')} className="rounded-md cursor-pointer py-2">Sắp diễn ra</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ongoing')} className="rounded-md cursor-pointer py-2">Đang diễn ra</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')} className="rounded-md cursor-pointer py-2">Đã kết thúc</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-2 custom-scrollbar">
              {[
                { label: 'Tất cả', value: 'all' },
                { label: 'Đang diễn ra', value: 'ongoing' },
                { label: 'Sắp diễn ra', value: 'upcoming' },
                { label: 'Mới nhất', value: 'latest' },
                { label: 'Gần tôi', value: 'near' }
              ].map((tab) => {
                const isActive = statusFilter === tab.value
                return (
                  <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                    className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${isActive ? 'bg-[#16a34a] text-white font-bold shadow-md shadow-[#16a34a]/20' : 'bg-white text-slate-600 font-medium border border-slate-200 hover:bg-slate-50'}`}>
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-4">
              {filteredEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} userRole={user.role}
                  onSubmitClaim={submitClaim} busy={busy}
                  onEdit={() => handleEdit(ev)} onDelete={() => deleteEvent(ev.id)} />
              ))}
              {filteredEvents.length === 0 && (
                <div className="py-12 text-center text-on-surface-variant bg-white rounded-2xl border border-slate-100">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                  <p>Không tìm thấy sự kiện nào.</p>
                </div>
              )}
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
    upcoming: { color: 'bg-indigo-500 text-white', label: 'SẮP DIỄN RA', icon: 'event' },
    ongoing: { color: 'bg-orange-500 text-white', label: 'ĐANG DIỄN RA', icon: 'local_fire_department' },
    completed: { color: 'bg-slate-500 text-white', label: 'ĐÃ KẾT THÚC', icon: 'check_circle' }
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
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row overflow-hidden group">
        {/* Left: Image Box */}
        <div className="w-full sm:w-[260px] shrink-0 h-[180px] sm:h-[160px] relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setShowDetails(true)}>
          <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          
          {/* Top Badge */}
          <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-sm ${statusConfig[status].color}`}>
            <span className="material-symbols-outlined text-[12px]">{statusConfig[status].icon}</span>
            {statusConfig[status].label}
          </div>

          {/* Bottom Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-lg text-[11px] font-extrabold shadow-md flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {ev.credit_amount} UGC
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 p-5 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-slate-100 cursor-pointer group-hover:bg-slate-50/50 transition-colors" onClick={() => setShowDetails(true)}>
          <span className="text-[10px] font-extrabold text-[#16a34a] uppercase tracking-wider mb-1.5">{ev.activity_name}</span>
          <h3 className="text-base font-extrabold text-slate-800 leading-snug mb-1 line-clamp-1">{ev.title}</h3>
          <p className="text-xs text-slate-500 mb-3 line-clamp-1">{ev.description || 'Tham gia sự kiện xanh...'}</p>
          
          <div className="flex items-center gap-4 mb-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
              <span className="truncate max-w-[120px]">{ev.location || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
              <span>{new Date(ev.start_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} — {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-auto">
            {tags.map(t => (
              <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">{t}</span>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full sm:w-[180px] shrink-0 p-5 flex flex-col items-center justify-center bg-white gap-3">
           <div className="text-center w-full">
             <div className="inline-block px-4 py-1.5 bg-[#f0f9f4] text-[#16a34a] font-extrabold text-sm rounded-lg mb-2">
               +{ev.credit_amount} UGC
             </div>
             <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
               <span className="material-symbols-outlined text-[12px]">schedule</span>
               {timeStr}
             </div>
           </div>

           <div className="w-full flex flex-col gap-2 mt-2">
             <button onClick={() => setShowQR(true)} className="w-full py-2 bg-[#16a34a] text-white text-xs font-bold rounded-lg shadow-sm shadow-[#16a34a]/30 hover:bg-[#15803d] transition-colors flex items-center justify-center gap-1.5">
               <span className="material-symbols-outlined text-[16px]">qr_code_2</span> Mã QR Check-in
             </button>
             <div className="flex gap-2">
               <button onClick={onEdit} className="flex-1 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1 border border-slate-200 transition-colors">
                 <span className="material-symbols-outlined text-[14px]">edit</span> Sửa
               </button>
               <button onClick={onDelete} className="flex-1 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 border border-red-100 transition-colors">
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
