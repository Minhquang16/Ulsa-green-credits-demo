import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'

function formatDate(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function EventsPage() {
  const { api, user } = useAuth()
  const [events, setEvents] = useState([])
  const [activityTypes, setActivityTypes] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // create event form
  const [form, setForm] = useState({ activity_type_id:'', title:'', description:'', location:'' })

  async function load() {
    setError('')
    try {
      const ev = await api('/events')
      setEvents(ev)
      if (user.role !== 'student') {
        const ats = await api('/activity-types')
        setActivityTypes(ats)
        if (!form.activity_type_id && ats[0]) setForm(f => ({...f, activity_type_id: ats[0].id }))
      }
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function createEvent(e) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await api('/events', { method:'POST', body: JSON.stringify(form) })
      setForm({ activity_type_id: form.activity_type_id, title:'', description:'', location:'' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function submitClaim(eventId, file, note, token) {
    setError('')
    try {
      const fd = new FormData()
      if (file) fd.append('evidence', file)
      fd.append('note', note || '')
      fd.append('token', token || '')

      await api(`/events/${eventId}/claims`, { method:'POST', body: fd })
      alert(' Đã gửi yêu cầu ghi nhận (claim). Chuyển sang tab "Ghi nhận" để xem trạng thái.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Hoạt động xanh</h2>
          <div className="text-muted">
            {user.role === 'student'
              ? 'Chọn sự kiện và gửi minh chứng để được cấp tín chỉ.'
              : 'Tạo sự kiện, tạo QR token và duyệt ghi nhận.'}
          </div>
        </div>
        <button className="btn btn-outline-primary" onClick={load}>Reload</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {user.role !== 'student' && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="fw-bold mb-2">Tạo sự kiện (Verifier/Admin)</div>
            <form className="row g-2" onSubmit={createEvent}>
              <div className="col-md-3">
                <label className="form-label">Loại hoạt động</label>
                <select className="form-select" value={form.activity_type_id} onChange={e=>setForm(f=>({...f, activity_type_id:e.target.value}))}>
                  {activityTypes.map(a => <option key={a.id} value={a.id}>{a.name} ({a.credit_amount} credits)</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Tiêu đề</label>
                <input className="form-control" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} placeholder="VD: Dọn rác cuối tuần" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Địa điểm</label>
                <input className="form-control" value={form.location} onChange={e=>setForm(f=>({...f, location:e.target.value}))} placeholder="VD: Khuôn viên trường" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Mô tả</label>
                <input className="form-control" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} placeholder="..." />
              </div>
              <div className="col-12">
                <button className="btn btn-primary" disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-3">
        {events.map(ev => (
          <EventCard key={ev.id} ev={ev} userRole={user.role} onSubmitClaim={submitClaim} />
        ))}
      </div>
    </div>
  )
}

function EventCard({ ev, userRole, onSubmitClaim }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="col-lg-6">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="mb-1">{ev.title}</h5>
              <div className="text-muted small">
                <b>{ev.activity_name}</b> • {ev.credit_amount} credits
              </div>
            </div>
            <span className="badge bg-info text-dark">published</span>
          </div>

          <div className="mt-2 small">
            <div>Địa điểm: <b>{ev.location || '-'}</b></div>
            <div>Thời gian: {formatDate(ev.start_at)} → {formatDate(ev.end_at)}</div>
          </div>

          {userRole !== 'student' && (
            <div className="mt-2">
              <div className="small text-muted">QR token (demo):</div>
              <code style={{wordBreak:'break-all'}}>{ev.qr_token}</code>
            </div>
          )}

          {userRole === 'student' && (
            <div className="mt-3">
              <button className="btn btn-outline-success btn-sm" onClick={()=>setOpen(o=>!o)}>
                {open ? 'Đóng' : 'Gửi yêu cầu ghi nhận (claim)'}
              </button>

              {open && (
                <div className="mt-2">
                  <div className="mb-2">
                    <label className="form-label small">Ghi chú</label>
                    <input className="form-control form-control-sm" value={note} onChange={e=>setNote(e.target.value)} placeholder="VD: Tôi đã tham gia, có ảnh minh chứng." />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Minh chứng (ảnh/PDF)</label>
                    <input className="form-control form-control-sm" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
                    <div className="form-text">Nếu không upload file, hệ thống sẽ hash từ ghi chú để demo.</div>
                  </div>
                  <button className="btn btn-success btn-sm" onClick={()=>onSubmitClaim(ev.id, file, note, ev.qr_token)}>Submit</button>
                </div>
              )}
            </div>
          )}

          {ev.description && <div className="mt-3 text-muted small">{ev.description}</div>}
        </div>
      </div>
    </div>
  )
}
