import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function LoginPage() {
  const { login, loading, user } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('student1')
  const [password, setPassword] = useState('student123')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      nav('/dashboard')
    } catch (e) {
      setError(e.message)
    }
  }

  if (user) {
    nav('/dashboard')
    return null
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body">
            <h3 className="card-title mb-2">Đăng nhập</h3>
            <p className="text-muted">
              Demo nội bộ hệ thống <b>tín chỉ xanh</b> (issue → redeem/retire).
            </p>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={onSubmit} className="mb-3">
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input className="form-control" value={username} onChange={e=>setUsername(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="small text-muted">
              <div className="fw-bold mb-1">Tài khoản demo:</div>
              <ul className="mb-0">
                <li>Admin: <code>admin / admin123</code></li>
                <li>Verifier: <code>verifier / verifier123</code></li>
                <li>Student: <code>student1 / student123</code> (hoặc <code>student2 / student123</code>)</li>
              </ul>
            </div>

            <hr />

            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{setUsername('student1'); setPassword('student123')}}>Chọn Student</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{setUsername('verifier'); setPassword('verifier123')}}>Chọn Verifier</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{setUsername('admin'); setPassword('admin123')}}>Chọn Admin</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
