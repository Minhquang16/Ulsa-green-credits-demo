import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'
import QRScanner from '../components/QRScanner.jsx'
import QRGenerator from '../components/QRGenerator.jsx'

function formatDate(s) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} — ${date}`
  } catch { return s }
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

export default function EventsPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [activityTypes, setActivityTypes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  // inline create activity type
  const [showNewAT, setShowNewAT] = useState(false)
  const [atForm, setAtForm] = useState(EMPTY_AT)
  const [atFile, setAtFile] = useState(null)
  const [atEditId, setAtEditId] = useState(null)
  const [atBusy, setAtBusy] = useState(false)

  async function loadAll() {
    setError('')
    try {
      const [ev, at] = await Promise.all([api('/events'), api('/activity-types')])
      setEvents(ev)
      setActivityTypes(at)
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải dữ liệu')
    }
  }

  useEffect(() => { loadAll() }, [])

  // Khi chọn loại hoạt động -> tự động hiển thị credits
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
    if (!atForm.name || !atForm.credit_amount) {
      showToast('⚠️ Vui lòng nhập Tên và Credits')
      return
    }
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
        await api(`/activity-types/${atEditId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: atForm.name, credit_amount: Number(atForm.credit_amount), description: desc })
        })
        showToast('✅ Đã cập nhật loại hoạt động!')
      } else {
        await api('/activity-types', {
          method: 'POST',
          body: JSON.stringify({ name: atForm.name, credit_amount: Number(atForm.credit_amount), description: desc })
        })
        showToast('✅ Đã tạo loại hoạt động!')
      }

      setAtEditId(null)
      const at = await api('/activity-types')
      setActivityTypes(at)
      if (!atEditId) {
        const newAT = at.find(a => a.name === atForm.name)
        if (newAT) setForm(f => ({ ...f, activity_type_id: String(newAT.id) }))
      }
      setAtForm(EMPTY_AT)
      setAtFile(null)
      setShowNewAT(false)
    } catch (err) { 
      showToast('❌ Lỗi: ' + err.message) 
    } finally { setAtBusy(false) }
  }

  async function createEvent(e) {
    e.preventDefault()
    if (!form.activity_type_id) { showToast('⚠️ Chọn loại hoạt động'); return }
    setBusy(true)
    setError('')
    try {
      const payload = { ...form }
      if (payload.start_at) payload.start_at = new Date(payload.start_at).toISOString()
      if (payload.end_at) payload.end_at = new Date(payload.end_at).toISOString()

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
      showToast('📝 Đã gửi yêu cầu! Chờ duyệt.')
      return true
    } catch (e) {
      showToast(`❌ ${e.message}`)
      return false
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background: '#ffffff' }} className="min-h-screen w-full">
      <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">
        {error && <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm">{error}</div>}

        {user.role !== 'student' && (
          <section className="mb-12">
            <div className="flex flex-col lg:flex-row justify-between gap-8 items-start">

              {/* Left: header */}
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">Verifier / Admin Portal</span>
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">Quản lý Hoạt động</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                  Chọn loại hoạt động có sẵn và tạo sự kiện. Nếu chưa có loại phù hợp, hãy tạo mới ngay bên dưới.
                </p>
              </div>

              {/* Right: unified form */}
              <div className="w-full lg:w-[400px] bg-surface-container-low rounded-3xl p-6 shadow-xl shadow-black/5 border border-outline-variant/10 shrink-0">
                <form onSubmit={createEvent} className="space-y-3">

                  {/* Step 1: Chọn loại hoạt động */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-on-primary text-[8px] font-black mr-1.5">1</span>
                        Loại hoạt động
                      </label>
                      <button type="button" onClick={() => setShowNewAT(v => !v)}
                        className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline">
                        <span className="material-symbols-outlined text-xs">{showNewAT ? 'remove' : 'add'}</span>
                        {showNewAT ? 'Đóng' : 'Tạo mới'}
                      </button>
                    </div>

                    {/* Inline create activity type */}
                    {showNewAT && (
                      <div className="rounded-xl bg-surface-container-highest p-3 space-y-2 border border-primary/20">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">eco</span>Loại hoạt động mới
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
                          <label className="text-[10px] font-bold text-primary">
                            {atEditId ? 'Thay đổi ảnh bìa' : 'Ảnh bìa cho loại hoạt động'}
                          </label>
                          <input type="file" accept="image/*" onChange={e => setAtFile(e.target.files[0])}
                            className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={createActivityType} disabled={atBusy}
                            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs disabled:opacity-50 hover:opacity-90 transition-opacity">
                            {atBusy ? 'Đang lưu...' : (atEditId ? '✓ Cập nhật' : '✓ Tạo & chọn loại này')}
                          </button>
                          {atEditId && (
                            <button type="button" onClick={() => { setAtEditId(null); setAtForm(EMPTY_AT); setShowNewAT(false) }}
                              className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold">
                              Hủy
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <select
                      className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      value={form.activity_type_id}
                      onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))}
                      required
                    >
                      <option value="">-- Chọn loại hoạt động --</option>
                      {activityTypes.map(at => (
                        <option key={at.id} value={at.id}>{at.name} ({at.credit_amount} UGC)</option>
                      ))}
                    </select>

                    {selectedAT && (
                      <div className="flex items-center justify-between px-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-sm">eco</span>
                          <span className="text-[10px] text-primary font-bold">{selectedAT.name} · {selectedAT.credit_amount} UGC</span>
                        </div>
                        <button type="button" onClick={handleEditAT} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">edit</span>
                          Sửa loại này
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Thông tin sự kiện */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-on-primary text-[8px] font-black mr-1.5">2</span>
                      Tiêu đề sự kiện
                    </label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="VD: Hiến máu nhân đạo" required
                      value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Địa điểm</label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="Khu A — Hội trường"
                      value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Bắt đầu</label>
                      <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs outline-none"
                        type="datetime-local"
                        value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Kết thúc</label>
                      <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs outline-none"
                        type="datetime-local"
                        value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-1">Mô tả</label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-3 text-xs text-on-surface outline-none"
                      placeholder="Mô tả chi tiết sự kiện"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={busy}
                      className="flex-1 bg-primary text-on-primary font-headline font-bold py-3 rounded-xl shadow-lg shadow-primary/10 active:scale-[0.98] transition-all text-sm disabled:opacity-50">
                      {busy ? 'Đang lưu...' : (editId ? 'Cập nhật sự kiện' : 'Tạo sự kiện')}
                    </button>
                    {editId && (
                      <button type="button" onClick={cancelEdit}
                        className="px-5 bg-surface-container-highest text-on-surface font-bold py-3 rounded-xl text-sm hover:bg-surface-variant transition-all">
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* Grid Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Danh sách hoạt động xanh</h2>
            <p className="text-on-surface-variant text-xs mt-1">Tham gia sự kiện để nhận tín chỉ xanh được xác nhận on-chain</p>
          </div>
          <button onClick={loadAll} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-8 justify-center md:justify-start">
          {events.map(ev => (
            <EventCard key={ev.id} ev={ev} userRole={user.role}
              onSubmitClaim={submitClaim} busy={busy}
              onEdit={() => handleEdit(ev)} onDelete={() => deleteEvent(ev.id)} />
          ))}
        </div>
      </main>
    </div>
  )
}

function EventCard({ ev, userRole, onSubmitClaim, busy, onEdit, onDelete }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [checkedInStatus, setCheckedInStatus] = useState(false) // false | 'offline' | 'online'
  const { showToast } = useToast()

  useEffect(() => {
    // Check if there is an offline checkin for this event on mount
    const queue = JSON.parse(localStorage.getItem('offline_checkin_queue') || '[]')
    const found = queue.find(q => q.event_id === ev.id)
    
    if (found && checkedInStatus !== 'online') {
      if (navigator.onLine) {
        setCheckedInStatus('online')
        setOpen(true)
        showToast('Mạng đã khôi phục! Hệ thống đang đồng bộ Check-in, vui lòng nộp minh chứng.')
      } else {
        setCheckedInStatus('offline')
      }
    }

    // Polling is much more reliable than the 'online' event across React re-renders
    const interval = setInterval(() => {
      if (navigator.onLine && checkedInStatus === 'offline') {
        setCheckedInStatus('online')
        setOpen(true)
        showToast('Mạng đã khôi phục! Hệ thống đang đồng bộ Check-in, vui lòng nộp minh chứng.')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [ev.id, checkedInStatus, showToast])

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

  return (
    <article className="w-[333px] min-h-[377px] flex flex-col group bg-surface-container-lowest rounded-[28px] shadow-card border border-outline-variant/5 hover:-translate-y-2 transition-all duration-300 shrink-0">
      <div className="relative h-[160px] shrink-0 overflow-hidden rounded-t-[28px]">
        <img alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={imgSrc} />
        <div className="absolute top-4 left-4 bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          {ev.credit_amount} UGC
        </div>
        {userRole !== 'student' && (
          <div className="absolute top-3 right-3 flex gap-2 z-20">
            <button onClick={onEdit} title="Sửa" className="w-8 h-8 rounded-full bg-white/90 text-primary shadow flex items-center justify-center hover:bg-white transition-all hover:scale-110">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onClick={onDelete} title="Xóa" className="w-8 h-8 rounded-full bg-white/90 text-error shadow flex items-center justify-center hover:bg-white transition-all hover:scale-110">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="font-headline text-lg font-bold text-on-surface line-clamp-1 mb-1">{ev.title}</h3>
          <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{ev.activity_name}</p>
        </div>
        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-2.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-base opacity-50">location_on</span>
            <span className="text-xs font-medium">{ev.location || '-'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-base opacity-50">schedule</span>
            <span className="text-xs font-medium">{formatDate(ev.start_at)}</span>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {userRole !== 'student' && (
            <button onClick={() => setShowQR(true)}
              className="w-full py-3 rounded-xl bg-surface-container-highest text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-variant transition-all">
              <span className="material-symbols-outlined text-lg">qr_code</span>
              Hiển thị mã QR Check-in
            </button>
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

          {userRole === 'student' && (
            <div className="space-y-2.5">
              {checkedInStatus ? (
                <div className={`w-full py-3 rounded-xl font-headline font-bold text-sm flex flex-col items-center justify-center gap-1 border px-2 text-center ${checkedInStatus === 'offline' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">{checkedInStatus === 'offline' ? 'wifi_off' : 'check_circle'}</span>
                    {checkedInStatus === 'offline' ? 'Đã lưu check-in (Offline)' : 'Bạn đã Check-in thành công!'}
                  </div>
                  {checkedInStatus === 'offline' && (
                    <div className="text-[11px] font-medium opacity-90 mt-1 lowercase first-letter:uppercase">
                      Khi có mạng vào nộp chứng minh + ấn xác nhận
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowScanner(true)}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                  Check-in (Quét QR)
                </button>
              )}
              
              <button onClick={() => setOpen(!open)}
                className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-variant transition-all">
                Nộp minh chứng sau khi check-in
                <span className={`material-symbols-outlined text-base transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {open && (
                <div className="mt-2 p-4 rounded-xl bg-surface-container-low space-y-3 animate-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Minh chứng</label>
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Ghi chú</label>
                    <input className="w-full bg-surface-container-highest border-none rounded-lg py-2 px-3 text-xs text-on-surface outline-none"
                      placeholder="VD: Đã hiến máu..." value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                  <button className="w-full py-2.5 mt-1 rounded-lg bg-primary text-on-primary font-bold text-xs shadow-sm active:scale-95 transition-all"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await onSubmitClaim(ev.id, file, note, ev.qr_token)
                      if (ok) { setOpen(false); setNote(''); setFile(null) }
                    }}>
                    {busy ? 'Đang gửi...' : 'Xác nhận gửi'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
