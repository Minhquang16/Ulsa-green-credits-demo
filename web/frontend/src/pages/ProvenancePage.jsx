import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

const API = '/api'

function shortHash(h) {
  if (!h) return '—'
  return h.slice(0, 10) + '...' + h.slice(-8)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function unixToDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Provenance Detail Modal ───────────────────────────────────────────────────
function ProvenanceDetailModal({ claimId, onClose, token, isAdmin }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showTech, setShowTech] = useState(false)

  useEffect(() => {
    if (!claimId) return
    setLoading(true); setErr(null)
    fetch(`${API}/provenance/claim/${claimId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [claimId, token])

  const steps = data ? [
    {
      icon: '🌿',
      label: 'Hoạt động xanh',
      color: '#22c55e',
      content: (
        <div>
          <p className="prov-step-title">{data.claim?.activity_name || '—'}</p>
          <p className="prov-step-desc">{data.claim?.activity_description || ''}</p>
          <span className="prov-badge credit">{data.claim?.credit_amount || 0} tín chỉ xanh</span>
        </div>
      )
    },
    {
      icon: '📅',
      label: 'Sự kiện',
      color: '#3b82f6',
      content: (
        <div>
          <p className="prov-step-title">{data.claim?.event_title || '—'}</p>
          <p className="prov-step-desc">{data.claim?.event_description || ''}</p>
          <div className="prov-meta-row">
            <span>📍 {data.claim?.location || 'Không có địa điểm'}</span>
            <span>🕒 {formatDate(data.claim?.start_at)}</span>
          </div>
        </div>
      )
    },
    {
      icon: '📄',
      label: 'Minh chứng',
      color: '#f59e0b',
      content: (
        <div>
          {data.claim?.evidence_path ? (
            <a
              href={`${API}/uploads/${data.claim.evidence_path}`}
              target="_blank" rel="noopener noreferrer"
              className="prov-link"
            >
              🔗 Xem file minh chứng
            </a>
          ) : (
            <p className="prov-step-desc">Không có file đính kèm</p>
          )}
          {data.claim?.note && <p className="prov-step-desc mt-1">📝 {data.claim.note}</p>}
          
          {showTech && (
            <div className="prov-hash-box mt-2">
              <span className="prov-hash-label">SHA-256 Hash (off-chain):</span>
              <code className="prov-hash">{data.claim?.evidence_hash ? '0x' + data.claim.evidence_hash.slice(0,32) + '...' : '—'}</code>
            </div>
          )}
        </div>
      )
    },
    {
      icon: '✅',
      label: 'Phê duyệt',
      color: '#10b981',
      content: (
        <div>
          <p className="prov-step-title">{data.claim?.approver_name || '—'}</p>
          <div className="prov-meta-row">
            <span>👤 Vai trò: {data.claim?.approver_role === 'verifier' ? 'Verifier (Đoàn/Hội)' : 'Admin'}</span>
            <span>🕒 {formatDate(data.claim?.decided_at)}</span>
          </div>
          {showTech && data.claim?.approver_wallet && (
            <div className="prov-hash-box mt-2">
              <span className="prov-hash-label">Địa chỉ ví (Approver):</span>
              <code className="prov-hash">{data.claim.approver_wallet}</code>
            </div>
          )}
        </div>
      )
    },
    {
      icon: '🛡️',
      label: 'Lưu trữ Blockchain',
      color: '#6366f1',
      content: (
        <div>
          {data.onChainRecord ? (
            <>
              <div className="prov-verify-badge ok" style={{marginBottom: '12px'}}>
                ✅ Tín chỉ xanh đã được lưu trữ vĩnh viễn và minh chứng không thể giả mạo
              </div>
              
              <button className="prov-link mt-2" onClick={() => setShowTech(!showTech)}>
                {showTech ? '▲ Ẩn chi tiết kỹ thuật' : '▼ Xem chi tiết kỹ thuật (dành cho chuyên gia)'}
              </button>

              {showTech && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="prov-hash-box">
                    <span className="prov-hash-label">TX Hash (Cấp tín chỉ - MINT):</span>
                    <code className="prov-hash">{data.claim.approved_tx_hash || '—'}</code>
                  </div>
                  <div className="prov-hash-box mt-2">
                    <span className="prov-hash-label">TX Hash (Lưu Provenance):</span>
                    <code className="prov-hash">{data.claim.provenance_tx_hash || '—'}</code>
                  </div>
                  
                  <div className="prov-meta-grid mt-3">
                    <div className="prov-meta-item">
                      <span className="prov-hash-label">Block Timestamp:</span>
                      <code className="prov-hash">{unixToDate(data.onChainRecord.timestamp)}</code>
                    </div>
                  </div>

                  {data.evidenceVerified !== null && (
                    <div className={`prov-verify-badge mt-3 ${data.evidenceVerified ? 'ok' : 'fail'}`}>
                      {data.evidenceVerified
                        ? '✅ Hash minh chứng on-chain KHỚP với dữ liệu hệ thống'
                        : '⚠️ Hash minh chứng KHÔNG KHỚP'}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : data.onChainError ? (
            <div className="prov-verify-badge fail">
              ⚠️ Lỗi kết nối Blockchain
            </div>
          ) : (
            <p className="prov-step-desc text-yellow-400">Đang chờ đồng bộ lên blockchain...</p>
          )}
        </div>
      )
    }
  ] : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="prov-modal" onClick={e => e.stopPropagation()}>
        <div className="prov-modal-header">
          <div>
            <h2 className="prov-modal-title">🔍 Truy xuất nguồn gốc tín chỉ xanh</h2>
            {data?.claim && (
              <p className="prov-modal-subtitle">
                {data.claim.activity_name} · {data.claim.event_title}
                {isAdmin && data.claim.student_name && ` · SV: ${data.claim.student_name}`}
              </p>
            )}
          </div>
          <button className="prov-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="prov-modal-body">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="prov-spinner" />
              <span className="ml-3 text-gray-400">Đang tải dữ liệu provenance...</span>
            </div>
          )}
          {err && <div className="prov-verify-badge fail">❌ {err}</div>}

          {!loading && !err && data && (
            <div className="prov-timeline">
              {steps.map((step, i) => (
                <div key={i} className="prov-step">
                  <div className="prov-step-left">
                    <div className="prov-step-icon" style={{ background: step.color + '22', border: `2px solid ${step.color}55` }}>
                      <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                    </div>
                    {i < steps.length - 1 && <div className="prov-step-line" />}
                  </div>
                  <div className="prov-step-right">
                    <p className="prov-step-label" style={{ color: step.color }}>{step.label}</p>
                    <div className="prov-step-card">
                      {step.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Provenance Certificate Card ───────────────────────────────────────────────
function CertCard({ item, onClick, isAdmin }) {
  const hasProvenance = !!item.provenance_tx_hash
  return (
    <div className="prov-cert-card" onClick={onClick}>
      <div className="prov-cert-glow" />
      <div className="prov-cert-header">
        <div className="prov-cert-icon">🌿</div>
        <div className="prov-cert-status-badges">
          <span className={`prov-cert-badge ${hasProvenance ? 'verified' : 'pending'}`}>
            {hasProvenance ? '🛡️ Bảo vệ bởi Blockchain' : '⏳ Bản ghi cũ'}
          </span>
        </div>
      </div>

      <h3 className="prov-cert-title">{item.activity_name}</h3>
      <p className="prov-cert-event">{item.event_title}</p>

      {isAdmin && item.student_name && (
        <p className="prov-cert-student">👤 {item.student_name}</p>
      )}

      <div className="prov-cert-credits">
        <span className="prov-credits-num">{item.credit_amount}</span>
        <span className="prov-credits-label">Tín chỉ xanh</span>
      </div>

      <div className="prov-cert-meta">
        <span>📅 {formatDate(item.decided_at)}</span>
        {item.approver_name && <span>✅ {item.approver_name}</span>}
      </div>

      <div className="prov-cert-action">
        <span>Xem chuỗi nguồn gốc</span>
        <span>→</span>
      </div>
    </div>
  )
}

// ─── Verify TX Bar ─────────────────────────────────────────────────────────────
function VerifyBar({ token }) {
  const [txInput, setTxInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (!txInput.trim()) return
    setLoading(true); setResult(null)
    try {
      const r = await fetch(`${API}/provenance/verify/${txInput.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await r.json()
      setResult(d)
    } catch (e) {
      setResult({ error: e.message })
    }
    setLoading(false)
  }

  return (
    <div className="prov-verify-bar">
      <div className="prov-verify-bar-inner">
        <span className="prov-verify-icon">🔎</span>
        <input
          id="prov-verify-input"
          className="prov-verify-input"
          placeholder="Dán TX Hash để xác minh giao dịch blockchain..."
          value={txInput}
          onChange={e => setTxInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verify()}
        />
        <button id="prov-verify-btn" className="prov-verify-btn" onClick={verify} disabled={loading}>
          {loading ? '...' : 'Xác minh'}
        </button>
      </div>
      {result && (
        <div className={`prov-verify-result ${result.error ? 'fail' : result.receipt?.status === 1 ? 'ok' : 'fail'}`}>
          {result.error ? (
            <span>❌ Lỗi: {result.error}</span>
          ) : result.receipt?.status === 1 ? (
            <span>
              ✅ Giao dịch hợp lệ — Block #{result.receipt.blockNumber}
              {result.claim && ` | ${result.claim.activity_name} · ${result.claim.student_name}`}
              {result.blockTimestamp && ` · ${unixToDate(result.blockTimestamp)}`}
            </span>
          ) : (
            <span>⚠️ Không tìm thấy hoặc giao dịch thất bại</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProvenancePage() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClaimId, setSelectedClaimId] = useState(null)
  const [filter, setFilter] = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'verifier'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/provenance/my`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!r.ok) throw new Error((await r.json()).error)
      setRecords(await r.json())
    } catch (e) {
      showToast('error', 'Lỗi tải provenance: ' + e.message)
    }
    setLoading(false)
  }, [token, showToast])

  useEffect(() => { load() }, [load])

  const filtered = records.filter(r => {
    const q = filter.toLowerCase()
    return !q
      || r.activity_name?.toLowerCase().includes(q)
      || r.event_title?.toLowerCase().includes(q)
      || r.approver_name?.toLowerCase().includes(q)
      || r.student_name?.toLowerCase().includes(q)
      || r.approved_tx_hash?.toLowerCase().includes(q)
  })

  const totalCredits = records.reduce((sum, r) => sum + (r.credit_amount || 0), 0)
  const onChainCount = records.filter(r => r.provenance_tx_hash).length

  return (
    <>
      <style>{PROV_STYLES}</style>
      <div className="prov-page">

        {/* Header */}
        <div className="prov-header">
          <div className="prov-header-left">
            <h1 className="prov-page-title">
              <span className="prov-title-icon">🔍</span>
              Truy xuất nguồn gốc tín chỉ xanh
            </h1>
            <p className="prov-page-sub">
              {isAdmin
                ? 'Toàn bộ chuỗi minh chứng và quy trình tạo ra mỗi tín chỉ xanh trong hệ thống'
                : 'Chuỗi minh chứng và quy trình tạo ra các tín chỉ xanh của bạn'}
            </p>
          </div>
          <div className="prov-stats">
            <div className="prov-stat-item">
              <span className="prov-stat-num">{records.length}</span>
              <span className="prov-stat-label">Tín chỉ đã cấp</span>
            </div>
            <div className="prov-stat-item">
              <span className="prov-stat-num">{totalCredits}</span>
              <span className="prov-stat-label">Tổng UGC</span>
            </div>
            <div className="prov-stat-item">
              <span className="prov-stat-num prov-stat-green">{onChainCount}</span>
              <span className="prov-stat-label">On-chain</span>
            </div>
          </div>
        </div>

        {/* Content */}

        {/* Filter */}
        <div className="prov-filter-row">
          <input
            id="prov-filter-input"
            className="prov-filter-input"
            placeholder="🔍  Lọc theo hoạt động, sự kiện, người duyệt, TX hash..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <span className="prov-filter-count">{filtered.length} kết quả</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="prov-loading">
            <div className="prov-spinner" />
            <span>Đang tải dữ liệu provenance...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="prov-empty">
            <div className="prov-empty-icon">🌱</div>
            <p className="prov-empty-text">
              {filter ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có tín chỉ nào được cấp phát'}
            </p>
            {!filter && (
              <p className="prov-empty-sub">
                Tham gia các hoạt động xanh và nhận phê duyệt để xem chuỗi nguồn gốc ở đây.
              </p>
            )}
          </div>
        ) : (
          <div className="prov-grid">
            {filtered.map(item => (
              <CertCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onClick={() => setSelectedClaimId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedClaimId && (
        <ProvenanceDetailModal
          claimId={selectedClaimId}
          token={token}
          isAdmin={isAdmin}
          onClose={() => setSelectedClaimId(null)}
        />
      )}
    </>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const PROV_STYLES = `
/* ── Page Layout ── */
.prov-page {
  padding: 32px 40px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

/* ── Header ── */
.prov-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.prov-page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px 0;
}
.prov-title-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 12px rgba(34,197,94,0.5));
}
.prov-page-sub {
  color: #64748b;
  font-size: 0.92rem;
  margin: 0;
}

/* ── Stats ── */
.prov-stats {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}
.prov-stat-item {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  padding: 12px 20px;
  text-align: center;
  min-width: 80px;
}
.prov-stat-num {
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  color: #16a34a;
  line-height: 1;
}
.prov-stat-green { color: #7c3aed !important; }
.prov-stat-label {
  font-size: 0.72rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

/* ── Verify Bar ── */
.prov-verify-bar {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border: 1px solid #4338ca44;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.prov-verify-bar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.prov-verify-icon { font-size: 1.25rem; }
.prov-verify-input {
  flex: 1;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 10px 16px;
  color: #e2e8f0;
  font-size: 0.85rem;
  font-family: monospace;
  outline: none;
  transition: border 0.2s;
}
.prov-verify-input::placeholder { color: #94a3b8; }
.prov-verify-input:focus { border-color: #818cf8; }
.prov-verify-btn {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 22px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  white-space: nowrap;
}
.prov-verify-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.prov-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.prov-verify-result {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}
.prov-verify-result.ok { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.prov-verify-result.fail { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }

/* ── Filter Row ── */
.prov-filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.prov-filter-input {
  flex: 1;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 11px 18px;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
  transition: border 0.2s;
}
.prov-filter-input:focus { border-color: #22c55e; }
.prov-filter-count {
  font-size: 0.8rem;
  color: #94a3b8;
  white-space: nowrap;
  font-weight: 600;
}

/* ── Grid ── */
.prov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

/* ── Certificate Card ── */
.prov-cert-card {
  position: relative;
  background: linear-gradient(145deg, #ffffff, #f0fdf4);
  border: 1.5px solid #bbf7d0;
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.prov-cert-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(34,197,94,0.15);
  border-color: #4ade80;
}
.prov-cert-glow {
  position: absolute;
  top: -40px; right: -40px;
  width: 140px; height: 140px;
  background: radial-gradient(circle, rgba(34,197,94,0.15), transparent 70%);
  pointer-events: none;
}
.prov-cert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.prov-cert-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 8px rgba(34,197,94,0.4));
}
.prov-cert-status-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.prov-cert-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 99px;
  letter-spacing: 0.03em;
}
.prov-cert-badge.verified { background: #ede9fe; color: #7c3aed; }
.prov-cert-badge.approved { background: #dcfce7; color: #16a34a; }
.prov-cert-badge.pending { background: #fef9c3; color: #92400e; }

.prov-cert-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px 0;
}
.prov-cert-event {
  font-size: 0.82rem;
  color: #475569;
  margin: 0 0 6px 0;
}
.prov-cert-student {
  font-size: 0.8rem;
  color: #6366f1;
  font-weight: 600;
  margin: 0 0 10px 0;
}
.prov-cert-credits {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 14px 0;
}
.prov-credits-num {
  font-size: 2.5rem;
  font-weight: 900;
  color: #16a34a;
  line-height: 1;
  background: linear-gradient(135deg, #16a34a, #4ade80);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.prov-credits-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.prov-cert-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 10px;
  gap: 8px;
  flex-wrap: wrap;
}
.prov-cert-hash {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.72rem;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
  overflow: hidden;
}
.prov-cert-hash code {
  font-family: monospace;
  color: #6366f1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prov-cert-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  color: #16a34a;
  font-size: 0.8rem;
  font-weight: 700;
}

/* ── Loading / Empty ── */
.prov-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: #94a3b8;
  font-size: 0.95rem;
}
.prov-spinner {
  width: 32px; height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.prov-empty {
  text-align: center;
  padding: 80px 24px;
}
.prov-empty-icon { font-size: 4rem; margin-bottom: 16px; }
.prov-empty-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 8px 0;
}
.prov-empty-sub {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

/* ── Modal Backdrop ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.18s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

/* ── Detail Modal ── */
.prov-modal {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 40px 120px rgba(0,0,0,0.6);
  animation: slideUp 0.22s ease;
}
@keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.prov-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 28px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.prov-modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 4px 0;
}
.prov-modal-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
}
.prov-modal-close {
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  width: 32px; height: 32px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.15s;
  flex-shrink: 0;
}
.prov-modal-close:hover { background: rgba(255,255,255,0.15); color: #f1f5f9; }
.prov-modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
}

/* ── Timeline Steps ── */
.prov-timeline { display: flex; flex-direction: column; }
.prov-step { display: flex; gap: 16px; }
.prov-step-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.prov-step-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prov-step-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
  margin: 6px 0;
  min-height: 16px;
}
.prov-step-right {
  flex: 1;
  padding-bottom: 24px;
}
.prov-step-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 8px 0;
}
.prov-step-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px 16px;
}
.prov-step-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 4px 0;
}
.prov-step-desc {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0 0 8px 0;
  line-height: 1.5;
}
.prov-step-desc:last-child { margin-bottom: 0; }
.mt-1 { margin-top: 6px; }
.prov-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.prov-badge.credit { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.prov-meta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #94a3b8;
}
.prov-meta-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.prov-meta-item { display: flex; flex-direction: column; gap: 2px; }
.prov-hash-box {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  overflow: hidden;
}
.prov-hash-label {
  display: block;
  font-size: 0.68rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
  font-weight: 700;
}
.prov-hash {
  font-family: monospace;
  font-size: 0.76rem;
  color: #818cf8;
  word-break: break-all;
}
.prov-link {
  color: #60a5fa;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 6px;
}
.prov-link:hover { text-decoration: underline; color: #93c5fd; }
.prov-verify-badge {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  margin-top: 6px;
}
.prov-verify-badge.ok { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.prov-verify-badge.fail { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }

@media (max-width: 640px) {
  .prov-page { padding: 20px 16px; }
  .prov-header { flex-direction: column; }
  .prov-stats { justify-content: flex-start; }
  .prov-modal { border-radius: 16px; }
  .prov-modal-header { padding: 18px 20px; }
  .prov-modal-body { padding: 16px 20px; }
}
`
