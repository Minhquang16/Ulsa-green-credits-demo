import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'

export default function AdminPage() {
  const { api, user } = useAuth()
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)


  const [at, setAt] = useState({ name:'', description:'', credit_amount:5 })


  const [rw, setRw] = useState({ title:'', description:'', cost_credits:3, stock:50 })

  async function load() {
    setError('')
    try {
      const o = await api('/analytics/overview')
      setOverview(o)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { if (user.role === 'admin') load() }, [])

  async function createActivityType(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/activity-types', { method:'POST', body: JSON.stringify(at) })
      setAt({ name:'', description:'', credit_amount:5 })
      alert(' Đã tạo activity type')
    } catch (e) {
      setError(e.message)
    }
  }

  async function createReward(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/rewards', { method:'POST', body: JSON.stringify(rw) })
      setRw({ title:'', description:'', cost_credits:3, stock:50 })
      alert(' Đã tạo reward')
    } catch (e) {
      setError(e.message)
    }
  }

  if (user.role !== 'admin') {
    return <div className="alert alert-warning">Chỉ Admin mới truy cập trang này.</div>
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Admin</h2>
          <div className="text-muted">Tạo tiêu chí, tạo reward, xem thống kê.</div>
        </div>
        <button className="btn btn-outline-primary" onClick={load}>Reload</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {overview && (
        <div className="row g-3 mb-3">
          <div className="col-lg-3">
            <div className="card shadow-sm"><div className="card-body">
              <div className="text-muted">Users</div>
              <div className="display-6">{overview.users}</div>
            </div></div>
          </div>
          <div className="col-lg-3">
            <div className="card shadow-sm"><div className="card-body">
              <div className="text-muted">Events</div>
              <div className="display-6">{overview.events}</div>
            </div></div>
          </div>
          <div className="col-lg-3">
            <div className="card shadow-sm"><div className="card-body">
              <div className="text-muted">Claims</div>
              <div className="display-6">{overview.claims}</div>
            </div></div>
          </div>
          <div className="col-lg-3">
            <div className="card shadow-sm"><div className="card-body">
              <div className="text-muted">Approved</div>
              <div className="display-6">{overview.approvedClaims}</div>
            </div></div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm"><div className="card-body">
              <div className="fw-bold mb-2">Token stats (on-chain)</div>
              <div>Contract: <code>{overview.token.contract}</code></div>
              <div className="row">
                <div className="col-md-4">Total issued: <b>{overview.token.totalIssued}</b></div>
                <div className="col-md-4">Total burned: <b>{overview.token.totalBurned}</b></div>
                <div className="col-md-4">Total supply: <b>{overview.token.totalSupply}</b></div>
              </div>
            </div></div>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="fw-bold mb-2">Tạo Activity Type</div>
              <form onSubmit={createActivityType}>
                <div className="mb-2">
                  <label className="form-label">Tên</label>
                  <input className="form-control" value={at.name} onChange={e=>setAt(v=>({...v, name:e.target.value}))} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Mô tả</label>
                  <input className="form-control" value={at.description} onChange={e=>setAt(v=>({...v, description:e.target.value}))} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Credits</label>
                  <input type="number" className="form-control" min="0" value={at.credit_amount} onChange={e=>setAt(v=>({...v, credit_amount:Number(e.target.value)}))} />
                </div>
                <button className="btn btn-primary">Tạo</button>
              </form>
              <div className="small text-muted mt-2">Gợi ý: tạo các tiêu chí như đạp xe, phân loại rác, tiết kiệm điện…</div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="fw-bold mb-2">Tạo Reward</div>
              <form onSubmit={createReward}>
                <div className="mb-2">
                  <label className="form-label">Tiêu đề</label>
                  <input className="form-control" value={rw.title} onChange={e=>setRw(v=>({...v, title:e.target.value}))} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Mô tả</label>
                  <input className="form-control" value={rw.description} onChange={e=>setRw(v=>({...v, description:e.target.value}))} />
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Cost credits</label>
                    <input type="number" className="form-control" min="0" value={rw.cost_credits} onChange={e=>setRw(v=>({...v, cost_credits:Number(e.target.value)}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Stock</label>
                    <input type="number" className="form-control" min="0" value={rw.stock} onChange={e=>setRw(v=>({...v, stock:Number(e.target.value)}))} />
                  </div>
                </div>
                <button className="btn btn-primary mt-2">Tạo</button>
              </form>
              <div className="small text-muted mt-2">Reward chỉ là quyền lợi nội bộ, không quy đổi tiền.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
