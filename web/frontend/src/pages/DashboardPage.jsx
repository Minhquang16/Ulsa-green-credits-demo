import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'

function shortHash(h) {
  if (!h) return ''
  return h.slice(0, 10) + '...' + h.slice(-8)
}

export default function DashboardPage() {
  const { api, user } = useAuth()
  const [balance, setBalance] = useState(null)
  const [contract, setContract] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const b = await api('/wallet/balance')
      const c = await api('/wallet/contract')
      const h = await api('/wallet/history')
      setBalance(b.balance)
      setContract(c.address)
      setHistory(h.slice(0, 10))
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Dashboard</h2>
          <div className="text-muted">Xin chào, <b>{user.full_name}</b>. Ví: <code>{user.wallet_address}</code></div>
        </div>
        <button className="btn btn-outline-primary" onClick={load}>Reload</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Số dư tín chỉ xanh</div>
              <div className="display-6">{balance === null ? '...' : balance}</div>
              <div className="small text-muted">Token on-chain: <code>{contract ? shortHash(contract) : '...'}</code></div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold">Lịch sử on-chain (mới nhất)</div>
                <span className="badge bg-secondary">Hardhat local</span>
              </div>

              {history.length === 0 ? (
                <div className="text-muted">Chưa có giao dịch.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Ref</th>
                        <th>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, idx) => (
                        <tr key={idx}>
                          <td>{h.type === 'ISSUE' ? <span className="badge bg-success">ISSUE</span> : <span className="badge bg-warning text-dark">BURN</span>}</td>
                          <td className="fw-bold">{h.amount}</td>
                          <td><code>{shortHash(h.refId)}</code></td>
                          <td><code>{shortHash(h.txHash)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="small text-muted">
                Gợi ý demo: vào <b>Hoạt động</b> → Student submit claim → Verifier approve → quay lại đây xem balance tăng.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
