import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'

function shortHash(h) {
  if (!h) return ''
  return h.slice(0, 10) + '...' + h.slice(-8)
}

export default function ClaimsPage() {
  const { api, user } = useAuth()
  const [claims, setClaims] = useState([])
  const [status, setStatus] = useState('submitted')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function load() {
    setError('')
    try {
      const q = user.role === 'student' ? '' : `?status=${status}`
      const data = await api(`/claims${q}`)
      setClaims(data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [status])

  async function approve(id) {
    setBusyId(id)
    setError('')
    try {
      await api(`/claims/${id}/approve`, { method:'POST' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId('')
    }
  }

  async function reject(id) {
    setBusyId(id)
    setError('')
    try {
      await api(`/claims/${id}/reject`, { method:'POST' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Ghi nhận (Claims)</h2>
          <div className="text-muted">
            {user.role === 'student'
              ? 'Các yêu cầu ghi nhận của bạn.'
              : 'Duyệt các yêu cầu ghi nhận để cấp tín chỉ (mint on-chain).'}
          </div>
        </div>
        <button className="btn btn-outline-primary" onClick={load}>Reload</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {user.role !== 'student' && (
        <div className="mb-3 d-flex align-items-center gap-2">
          <span className="text-muted">Lọc trạng thái:</span>
          <select className="form-select form-select-sm" style={{width: 200}} value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="submitted">submitted (chờ duyệt)</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          {claims.length === 0 ? (
            <div className="text-muted">Không có dữ liệu.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Event</th>
                    <th>Activity</th>
                    <th>Credits</th>
                    <th>Status</th>
                    <th>Evidence</th>
                    <th>Tx</th>
                    {user.role !== 'student' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {claims.map(c => (
                    <tr key={c.id}>
                      <td>{c.student_name}</td>
                      <td>{c.event_title}</td>
                      <td>{c.activity_name}</td>
                      <td className="fw-bold">{c.credit_amount}</td>
                      <td>
                        {c.status === 'approved' && <span className="badge bg-success">approved</span>}
                        {c.status === 'submitted' && <span className="badge bg-secondary">submitted</span>}
                        {c.status === 'rejected' && <span className="badge bg-danger">rejected</span>}
                      </td>
                      <td>
                        {c.evidence_path
                          ? <a href={`/api/uploads/${c.evidence_path}`} target="_blank" rel="noreferrer">file</a>
                          : <span className="text-muted">-</span>}
                      </td>
                      <td>{c.approved_tx_hash ? <code>{shortHash(c.approved_tx_hash)}</code> : <span className="text-muted">-</span>}</td>
                      {user.role !== 'student' && (
                        <td>
                          {c.status === 'submitted' ? (
                            <div className="d-flex gap-2">
                              <button className="btn btn-success btn-sm" disabled={busyId===c.id} onClick={()=>approve(c.id)}>
                                {busyId===c.id ? '...' : 'Approve'}
                              </button>
                              <button className="btn btn-outline-danger btn-sm" disabled={busyId===c.id} onClick={()=>reject(c.id)}>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="small text-muted">
            Approve = ghi giao dịch <b>issue()</b> lên blockchain và cập nhật tx hash vào claim.
          </div>
        </div>
      </div>
    </div>
  )
}
