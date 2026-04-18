import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'

function shortHash(h) {
  if (!h) return ''
  return h.slice(0, 10) + '...' + h.slice(-8)
}

export default function RewardsPage() {
  const { api, user } = useAuth()
  const [rewards, setRewards] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [retireAmount, setRetireAmount] = useState(1)
  const [retireReason, setRetireReason] = useState('Đã sử dụng cho mục đích xanh')

  async function load() {
    setError('')
    try {
      const data = await api('/rewards')
      setRewards(data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function redeem(id) {
    setBusyId(id)
    setError('')
    try {
      const r = await api(`/rewards/${id}/redeem`, { method:'POST' })
      alert(` Redeem thành công! Tx: ${r.tx_hash}`)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId('')
    }
  }

  async function retire(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await api('/wallet/retire', { method:'POST', body: JSON.stringify({ amount: Number(retireAmount), reason: retireReason }) })
      alert(` Retire thành công! Tx: ${r.tx_hash}`)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Đổi ưu đãi</h2>
          <div className="text-muted">
            {user.role === 'student'
              ? 'Redeem sẽ burn tín chỉ (on-chain).'
              : 'Admin có thể tạo reward trong tab Admin.'}
          </div>
        </div>
        <button className="btn btn-outline-primary" onClick={load}>Reload</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        {rewards.map(r => (
          <div className="col-lg-6" key={r.id}>
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="mb-1">{r.title}</h5>
                    <div className="text-muted small">{r.description}</div>
                  </div>
                  <span className={"badge " + (r.status==='active'?'bg-success':'bg-secondary')}>{r.status}</span>
                </div>

                <div className="mt-2">
                  <div>Cost: <b>{r.cost_credits}</b> credits</div>
                  <div>Stock: <b>{r.stock}</b></div>
                </div>

                {user.role === 'student' && (
                  <div className="mt-3">
                    <button className="btn btn-warning btn-sm" disabled={busyId===r.id || r.stock<=0 || r.status!=='active'} onClick={()=>redeem(r.id)}>
                      {busyId===r.id ? '...' : 'Redeem (burn)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {user.role === 'student' && (
        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <div className="fw-bold mb-2">Retire tín chỉ (burn type = RETIRE)</div>
            <form className="row g-2" onSubmit={retire}>
              <div className="col-md-2">
                <label className="form-label">Amount</label>
                <input type="number" className="form-control" min="1" value={retireAmount} onChange={e=>setRetireAmount(e.target.value)} />
              </div>
              <div className="col-md-8">
                <label className="form-label">Reason</label>
                <input className="form-control" value={retireReason} onChange={e=>setRetireReason(e.target.value)} />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-outline-danger w-100">Retire</button>
              </div>
            </form>
            <div className="small text-muted mt-2">
              Retire dùng khi tín chỉ đã được “ghi nhận/khóa sổ” cho báo cáo KPI hoặc đã dùng cho mục đích nội bộ.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
