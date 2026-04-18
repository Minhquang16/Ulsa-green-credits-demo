import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

function formatDate(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString('vi-VN') } catch { return s }
}

export default function EventsPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [activityTypes, setActivityTypes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // create event form
  const [form, setForm] = useState({ activity_type_id: '', title: '', description: '', location: '' })

  async function load() {
    setError('')
    try {
      const ev = await api('/events')
      setEvents(ev)
      if (user.role !== 'student') {
        const ats = await api('/activity-types')
        setActivityTypes(ats)
        if (!form.activity_type_id && ats[0]) setForm(f => ({ ...f, activity_type_id: ats[0].id }))
      }
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải danh sách hoạt động')
    }
  }

  useEffect(() => { load() }, [])

  async function createEvent(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/events', { method: 'POST', body: JSON.stringify(form) })
      setForm({ activity_type_id: form.activity_type_id, title: '', description: '', location: '' })
      await load()
      showToast('✅ Sự kiện đã được tạo thành công!')
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tạo sự kiện')
    } finally {
      setBusy(false)
    }
  }

  async function submitClaim(eventId, file, note, token) {
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      if (file) fd.append('evidence', file)
      fd.append('note', note || '')
      fd.append('token', token || '')
      await api(`/events/${eventId}/claims`, { method: 'POST', body: fd })
      showToast('📝 Claim đã được gửi! Chờ Verifier duyệt.')
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi gửi claim')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 animate-in">
      
      {error && <div className="mb-8 p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium">{error}</div>}

      {/* Admin/Verifier Form (1:1 Prototype) */}
      {user.role !== 'student' && (
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Verifier / Admin Portal</span>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-4">Tạo Hoạt động mới</h1>
            <p className="text-on-surface-variant text-base leading-relaxed max-w-md">
              Xác định các mốc môi trường và phân bổ tín chỉ xanh để khuyến khích sinh viên tham gia tích cực.
            </p>
          </div>
          
          <div className="bg-surface-container-low rounded-3xl p-8 shadow-xl shadow-black/5 border border-outline-variant/10">
            <form id="createEventForm" className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={createEvent}>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-2">Loại hoạt động</label>
                <select className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
                  value={form.activity_type_id} onChange={e => setForm(f => ({...f, activity_type_id: e.target.value}))}>
                  {activityTypes.map(at => (
                    <option key={at.id} value={at.id}>{at.name} ({at.credit_amount} UGC)</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-2">Tiêu đề sự kiện</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="VD: Hiến máu nhân đạo tháng 4" type="text"
                  value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-2">Địa điểm</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="Khu A — Hội trường" type="text"
                  value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block px-2">Mô tả</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="Mô tả ngắn" type="text"
                  value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="md:col-span-2 pt-2">
                <button className="w-full bg-primary text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg shadow-primary/10 active:scale-[0.98] transition-all"
                  disabled={busy} type="submit">
                  {busy ? 'Đang tạo...' : 'Tạo hoạt động mới'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Grid Header (1:1 Prototype) */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Danh sách hoạt động xanh</h2>
          <p className="text-on-surface-variant text-sm mt-1">Tham gia sự kiện để nhận tín chỉ xanh được xác nhận on-chain</p>
        </div>
        <button onClick={load} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>
      </div>

      {/* Grid Cards (1:1 Prototype) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {events.map(ev => (
          <EventCard key={ev.id} ev={ev} userRole={user.role} onSubmitClaim={submitClaim} busy={busy} />
        ))}
      </div>
    </main>
  )
}

function EventCard({ ev, userRole, onSubmitClaim, busy }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)

  const imageMap = {
    'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
    'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
    'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs'
  }
  const defaultImg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8'
  
  const activityLower = ev.activity_name?.toLowerCase() || ''
  const imgSrc = imageMap[Object.keys(imageMap).find(k => activityLower.includes(k))] || defaultImg

  return (
    <article className="group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-card border border-outline-variant/5 hover:-translate-y-2 transition-all duration-300">
      <div className="relative h-56 overflow-hidden">
        <img alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={imgSrc}/>
        <div className="absolute top-4 left-4 bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          {ev.credit_amount} UGC
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      
      <div className="p-7">
        <div className="mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface line-clamp-1 mb-1">{ev.title}</h3>
          <p className="text-xs font-bold text-primary uppercase tracking-wide">{ev.activity_name}</p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-lg opacity-50">location_on</span>
            <span className="text-sm font-medium">{ev.location || '-'}</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-lg opacity-50">schedule</span>
            <span className="text-sm font-medium">{formatDate(ev.start_at)}</span>
          </div>
        </div>

        {userRole !== 'student' && (
          <div className="mb-4 p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30 flex justify-between items-center">
            <span className="text-[10px] font-bold tracking-widest text-[#161d16]/40 uppercase">Token:</span>
            <code className="text-xs font-mono text-primary font-bold">{ev.qr_token}</code>
          </div>
        )}

        {userRole === 'student' && (
          <div>
            <button onClick={() => setOpen(!open)} 
              className="w-full py-4 rounded-2xl bg-surface-container text-on-surface font-headline font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-variant transition-all">
              Gửi yêu cầu ghi nhận
              <span className={`material-symbols-outlined text-lg transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {open && (
              <div className="mt-4 p-5 rounded-2xl bg-surface-container-low space-y-4 animate-in">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Minh chứng (Ảnh/PDF)</label>
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Ghi chú</label>
                    <input className="w-full bg-surface-container-highest border-none rounded-xl py-2.5 px-4 text-xs text-on-surface outline-none"
                      placeholder="VD: Đã hoàn thành 250ml máu..." type="text"
                      value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <button className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg shadow-primary/10 active:scale-95 transition-all"
                  disabled={busy} onClick={() => onSubmitClaim(ev.id, file, note, ev.qr_token)}>
                  {busy ? 'Đang gửi...' : 'Xác nhận gửi'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
