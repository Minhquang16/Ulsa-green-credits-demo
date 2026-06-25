import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/admin/admin-provenance.css'

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
          <p className="prov-timeline__step-title">{data.claim?.activity_name || '—'}</p>
          <p className="prov-timeline__step-desc">{data.claim?.activity_description || ''}</p>
          <span className="prov-timeline__badge prov-timeline__badge--credit">{data.claim?.credit_amount || 0} tín chỉ xanh</span>
        </div>
      )
    },
    {
      icon: '📅',
      label: 'Sự kiện',
      color: '#3b82f6',
      content: (
        <div>
          <p className="prov-timeline__step-title">{data.claim?.event_title || '—'}</p>
          <p className="prov-timeline__step-desc">{data.claim?.event_description || ''}</p>
          <div className="prov-timeline__meta-row">
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
              className="prov-timeline__link"
            >
              🔗 Xem file minh chứng
            </a>
          ) : (
            <p className="prov-timeline__step-desc">Không có file đính kèm</p>
          )}
          {data.claim?.note && <p className="prov-timeline__step-desc mt-1">📝 {data.claim.note}</p>}

          {showTech && (
            <div className="prov-timeline__hash-box mt-2">
              <span className="prov-timeline__hash-label">SHA-256 Hash (off-chain):</span>
              <code className="prov-timeline__hash">{data.claim?.evidence_hash ? '0x' + data.claim.evidence_hash.slice(0, 32) + '...' : '—'}</code>
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
          <p className="prov-timeline__step-title">{data.claim?.approver_name || '—'}</p>
          <div className="prov-timeline__meta-row">
            <span>👤 Vai trò: {data.claim?.approver_role === 'verifier' ? 'Verifier (Đoàn/Hội)' : 'Admin'}</span>
            <span>🕒 {formatDate(data.claim?.decided_at)}</span>
          </div>
          {showTech && data.claim?.approver_wallet && (
            <div className="prov-timeline__hash-box mt-2">
              <span className="prov-timeline__hash-label">Địa chỉ ví (Approver):</span>
              <code className="prov-timeline__hash">{data.claim.approver_wallet}</code>
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
              <div className="prov-timeline__verify-badge prov-timeline__verify-badge--ok" style={{ marginBottom: '12px' }}>
                ✅ Tín chỉ xanh đã được lưu trữ vĩnh viễn và minh chứng không thể giả mạo
              </div>

              <button className="prov-timeline__link mt-2" onClick={() => setShowTech(!showTech)}>
                {showTech ? '▲ Ẩn chi tiết kỹ thuật' : '▼ Xem chi tiết kỹ thuật (dành cho chuyên gia)'}
              </button>

              {showTech && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="prov-timeline__hash-box">
                    <span className="prov-timeline__hash-label">TX Hash (Cấp tín chỉ - MINT):</span>
                    <code className="prov-timeline__hash">{data.claim.approved_tx_hash || '—'}</code>
                  </div>
                  <div className="prov-timeline__hash-box mt-2">
                    <span className="prov-timeline__hash-label">TX Hash (Lưu Provenance):</span>
                    <code className="prov-timeline__hash">{data.claim.provenance_tx_hash || '—'}</code>
                  </div>

                  <div className="prov-timeline__meta-grid mt-3">
                    <div className="prov-timeline__meta-item">
                      <span className="prov-timeline__hash-label">Block Timestamp:</span>
                      <code className="prov-timeline__hash">{unixToDate(data.onChainRecord.timestamp)}</code>
                    </div>
                  </div>

                  {data.evidenceVerified !== null && (
                    <div className={`prov-timeline__verify-badge mt-3 ${data.evidenceVerified ? 'prov-timeline__verify-badge--ok' : 'prov-timeline__verify-badge--fail'}`}>
                      {data.evidenceVerified
                        ? '✅ Hash minh chứng on-chain KHỚP với dữ liệu hệ thống'
                        : '⚠️ Hash minh chứng KHÔNG KHỚP'}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : data.onChainError ? (
            <div className="prov-timeline__verify-badge prov-timeline__verify-badge--fail">
              ⚠️ Lỗi kết nối Blockchain
            </div>
          ) : (
            <p className="prov-timeline__step-desc text-yellow-400">Đang chờ đồng bộ lên blockchain...</p>
          )}
        </div>
      )
    }
  ] : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="prov-modal" onClick={e => e.stopPropagation()}>
        <div className="prov-modal__header">
          <div>
            <h2 className="prov-modal__title">🔍 Truy xuất nguồn gốc tín chỉ xanh</h2>
            {data?.claim && (
              <p className="prov-modal__subtitle">
                {data.claim.activity_name} · {data.claim.event_title}
                {isAdmin && data.claim.student_name && ` · SV: ${data.claim.student_name}`}
              </p>
            )}
          </div>
          <button className="prov-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="prov-modal__body">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="prov-page__spinner" />
              <span className="ml-3 text-gray-400">Đang tải dữ liệu provenance...</span>
            </div>
          )}
          {err && <div className="prov-timeline__verify-badge prov-timeline__verify-badge--fail">❌ {err}</div>}

          {!loading && !err && data && (
            <div className="prov-timeline">
              {steps.map((step, i) => (
                <div key={i} className="prov-timeline__step">
                  <div className="prov-timeline__step-left">
                    <div className="prov-timeline__step-icon" style={{ background: step.color + '22', border: `2px solid ${step.color}55` }}>
                      <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                    </div>
                    {i < steps.length - 1 && <div className="prov-timeline__step-line" />}
                  </div>
                  <div className="prov-timeline__step-right">
                    <p className="prov-timeline__step-label" style={{ color: step.color }}>{step.label}</p>
                    <div className="prov-timeline__step-card">
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
      <div className="prov-cert-card__glow" />
      <div className="prov-cert-card__header">
        <div className="prov-cert-card__icon">🌿</div>
        <div className="prov-cert-card__status-badges">
          <span className={`prov-cert-card__badge ${hasProvenance ? 'prov-cert-card__badge--verified' : 'prov-cert-card__badge--pending'}`}>
            {hasProvenance ? '🛡️ Bảo vệ bởi Blockchain' : '⏳ Bản ghi cũ'}
          </span>
        </div>
      </div>

      <h3 className="prov-cert-card__title">{item.activity_name}</h3>
      <p className="prov-cert-card__event">{item.event_title}</p>

      {isAdmin && item.student_name && (
        <p className="prov-cert-card__student">👤 {item.student_name}</p>
      )}

      <div className="prov-cert-card__credits">
        <span className="prov-cert-card__credits-num">{item.credit_amount}</span>
        <span className="prov-cert-card__credits-label">Tín chỉ xanh</span>
      </div>

      <div className="prov-cert-card__meta">
        <span>📅 {formatDate(item.decided_at)}</span>
        {item.approver_name && <span>✅ {item.approver_name}</span>}
      </div>

      <div className="prov-cert-card__action">
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
      <div className="prov-verify-bar__inner">
        <span className="prov-verify-bar__icon">🔎</span>
        <input
          id="prov-verify-input"
          className="prov-verify-bar__input"
          placeholder="Dán TX Hash để xác minh giao dịch blockchain..."
          value={txInput}
          onChange={e => setTxInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verify()}
        />
        <button id="prov-verify-btn" className="prov-verify-bar__btn" onClick={verify} disabled={loading}>
          {loading ? '...' : 'Xác minh'}
        </button>
      </div>
      {result && (
        <div className={`prov-verify-bar__result ${result.error ? 'prov-verify-bar__result--fail' : result.receipt?.status === 1 ? 'prov-verify-bar__result--ok' : 'prov-verify-bar__result--fail'}`}>
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
      <div className="prov-page">

        {/* Header */}
        <div className="prov-page__header">
          <div className="prov-page__header-left">
            <h1 className="prov-page__title">
              <span className="prov-page__title-icon">🔍</span>
              Truy xuất nguồn gốc tín chỉ xanh
            </h1>
            <p className="prov-page__subtitle">
              {isAdmin
                ? 'Toàn bộ chuỗi minh chứng và quy trình tạo ra mỗi tín chỉ xanh trong hệ thống'
                : 'Chuỗi minh chứng và quy trình tạo ra các tín chỉ xanh của bạn'}
            </p>
          </div>
          <div className="prov-page__stats">
            <div className="prov-page__stat-item">
              <span className="prov-page__stat-num">{records.length}</span>
              <span className="prov-page__stat-label">Tín chỉ đã cấp</span>
            </div>
            <div className="prov-page__stat-item">
              <span className="prov-page__stat-num">{totalCredits}</span>
              <span className="prov-page__stat-label">Tổng UGC</span>
            </div>
            <div className="prov-page__stat-item">
              <span className="prov-page__stat-num prov-page__stat-num--green">{onChainCount}</span>
              <span className="prov-page__stat-label">On-chain</span>
            </div>
          </div>
        </div>

        {/* Content */}

        {/* Filter */}
        <div className="prov-filter">
          <input
            id="prov-filter-input"
            className="prov-filter__input"
            placeholder="🔍  Lọc theo hoạt động, sự kiện, người duyệt, TX hash..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <span className="prov-filter__count">{filtered.length} kết quả</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="prov-page__loading">
            <div className="prov-page__spinner" />
            <span>Đang tải dữ liệu provenance...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="prov-empty">
            <div className="prov-empty__icon">🌱</div>
            <p className="prov-empty__text">
              {filter ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có tín chỉ nào được cấp phát'}
            </p>
            {!filter && (
              <p className="prov-empty__sub">
                Tham gia các hoạt động xanh và nhận phê duyệt để xem chuỗi nguồn gốc ở đây.
              </p>
            )}
          </div>
        ) : (
          <div className="prov-page__grid">
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
