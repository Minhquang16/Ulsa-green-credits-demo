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
      icon: 'eco',
      color: 'emerald',
      title: data.claim?.activity_name || 'Hoạt động xanh',
      desc: data.claim?.activity_description || 'Tham gia hoạt động xanh',
      leftAddon: (
        <span className="inline-block mt-2 bg-emerald-50 text-emerald-600 font-bold text-[11px] px-3 py-1 rounded-full">
          {data.claim?.credit_amount || 0} tín chỉ xanh
        </span>
      ),
      rightCol1: { label: 'THỜI GIAN', value: formatDate(data.claim?.start_at) },
      rightCol2: { label: 'NGƯỜI GHI NHẬN', value: <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> {data.claim?.student_name || '—'}</span> }
    },
    {
      icon: 'event',
      color: 'blue',
      title: 'Sự kiện',
      desc: data.claim?.event_title || '—',
      leftAddon: (
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-2">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {data.claim?.location || 'Không có địa điểm'}</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatDate(data.claim?.start_at)}</span>
        </div>
      ),
      rightCol1: { label: 'GHI CHÚ', value: data.claim?.event_description || 'Không có ghi chú' },
      rightCol2: null
    },
    {
      icon: 'description',
      color: 'amber',
      title: 'Minh chứng',
      desc: data.claim?.evidence_path ? (
        <a href={`${API}/uploads/${data.claim.evidence_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Xem file đính kèm
        </a>
      ) : 'Không có file đính kèm',
      leftAddon: data.claim?.note ? (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium mt-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400">edit_document</span> {data.claim.note}
        </div>
      ) : null,
      rightCol1: { 
        label: 'TRẠNG THÁI', 
        value: <span className="flex items-center gap-1.5 font-semibold text-slate-700"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Đã xác nhận</span> 
      },
      rightCol2: null
    },
    {
      icon: 'verified_user',
      color: 'emerald',
      title: 'Phê duyệt',
      desc: data.claim?.approver_name || '—',
      leftAddon: (
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-2">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person_outline</span> Vai trò: {data.claim?.approver_role === 'verifier' ? 'Verifier' : 'Admin'}</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatDate(data.claim?.decided_at)}</span>
        </div>
      ),
      rightCol1: { 
        label: 'TRẠNG THÁI', 
        value: <span className="flex items-center gap-1.5 font-semibold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã phê duyệt</span> 
      },
      rightCol2: null
    },
    {
      icon: 'security',
      color: 'purple',
      title: 'Lưu trữ Blockchain',
      desc: data.onChainRecord ? 'Đã đồng bộ lên blockchain thành công.' : data.onChainError ? 'Lỗi khi đồng bộ blockchain.' : 'Đang chờ đồng bộ lên blockchain...',
      leftAddon: data.onChainRecord && (
        <button onClick={() => setShowTech(!showTech)} className="mt-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">{showTech ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
          {showTech ? 'Ẩn chi tiết' : 'Xem chi tiết (Hash)'}
        </button>
      ),
      rightCol1: { 
        label: 'TRẠNG THÁI', 
        value: data.onChainRecord ? (
          <span className="flex items-center gap-1.5 font-semibold text-purple-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Đã lưu trữ</span> 
        ) : data.onChainError ? (
          <span className="flex items-center gap-1.5 font-semibold text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> Lỗi</span>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-purple-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Đang xử lý</span>
        )
      },
      rightCol2: null
    }
  ] : []

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center p-4 sm:p-8 py-10 overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-start sticky top-0 z-10 bg-white/80 backdrop-blur-md rounded-t-[32px]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">eco</span>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-slate-900 leading-tight mb-1">
                Truy xuất nguồn gốc tín chỉ xanh
              </h2>
              {data?.claim && (
                <p className="text-[12px] text-slate-500 font-medium">
                  {data.claim.activity_name} • {data.claim.event_title}
                  {isAdmin && data.claim.student_name && ` • SV: ${data.claim.student_name}`}
                </p>
              )}
            </div>
          </div>
          <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-8 pb-8">
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[32px] mr-3">refresh</span>
              <span className="text-sm font-medium">Đang tải dữ liệu provenance...</span>
            </div>
          )}
          {err && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm font-bold border border-red-100 shadow-sm mb-4">{err}</div>}

          {!loading && !err && data && (
            <>
              {/* Hero Card */}
              <div className="bg-gradient-to-r from-emerald-50/80 to-emerald-50/20 rounded-[28px] p-6 mb-10 border border-emerald-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500 border border-emerald-50">
                    <span className="material-symbols-outlined text-[32px]">energy_savings_leaf</span>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-slate-900 mb-1">{data.claim?.activity_name}</h3>
                    <p className="text-[13px] text-slate-600 mb-2">{data.claim?.activity_description}</p>
                    <span className="inline-block bg-emerald-100 text-emerald-700 font-bold text-[11px] px-3 py-1.5 rounded-full">
                      {data.claim?.credit_amount} TÍN CHỈ XANH
                    </span>
                  </div>
                </div>

                <div className="flex gap-8 md:gap-12 md:pl-8 md:border-l border-emerald-100/50">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">ID GIAO DỊCH</p>
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-slate-900">
                      {data.claim?.approved_tx_hash ? shortHash(data.claim.approved_tx_hash) : '—'}
                      {data.claim?.approved_tx_hash && (
                        <button className="text-slate-400 hover:text-slate-600" onClick={() => navigator.clipboard.writeText(data.claim.approved_tx_hash)}>
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">THỜI GIAN TẠO</p>
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-slate-900">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
                      {formatDate(data.claim?.created_at || data.claim?.decided_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-6 sm:pl-[42px] mb-8">
                {/* Vertical line */}
                <div className="absolute left-[34px] sm:left-[62px] top-6 bottom-6 w-0.5 bg-slate-100" />
                
                <div className="space-y-0">
                  {steps.map((step, i) => {
                    const colorMap = {
                      emerald: 'text-emerald-500 bg-emerald-50',
                      blue: 'text-blue-500 bg-blue-50',
                      amber: 'text-amber-500 bg-amber-50',
                      purple: 'text-purple-500 bg-purple-50'
                    }
                    
                    return (
                      <div key={i} className={`relative flex items-start gap-5 sm:gap-8 p-6 ${i !== steps.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        {/* Circle Icon */}
                        <div className={`relative z-10 w-[40px] h-[40px] rounded-2xl flex items-center justify-center flex-shrink-0 bg-white ${colorMap[step.color]}`}>
                          <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                        </div>
                        
                        {/* Content Row */}
                        <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-12">
                          <div className="flex-1">
                            <h4 className="text-[15px] font-bold text-slate-900 mb-1">{step.title}</h4>
                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{step.desc}</p>
                            {step.leftAddon}
                          </div>

                          <div className="flex gap-8 min-w-[280px]">
                            {step.rightCol1 && (
                              <div className="flex-1">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{step.rightCol1.label}</p>
                                <div className="text-[13px] font-bold text-slate-700">{step.rightCol1.value}</div>
                              </div>
                            )}
                            {step.rightCol2 && (
                              <div className="flex-1">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{step.rightCol2.label}</p>
                                <div className="text-[13px] font-bold text-slate-700">{step.rightCol2.value}</div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )
                  })}
                  
                  {/* Tech Details Box for Blockchain Step */}
                  {showTech && data?.onChainRecord && (
                    <div className="ml-16 mr-6 mb-6 mt-[-10px] bg-slate-50 p-5 rounded-2xl border border-slate-100">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">MINT TX HASH</p>
                           <code className="text-[11px] text-slate-600 break-all">{data.claim.approved_tx_hash || '—'}</code>
                         </div>
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">PROVENANCE TX HASH</p>
                           <code className="text-[11px] text-slate-600 break-all">{data.claim.provenance_tx_hash || '—'}</code>
                         </div>
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">EVIDENCE HASH (OFF-CHAIN)</p>
                           <code className="text-[11px] text-slate-600 break-all">{data.claim.evidence_hash || '—'}</code>
                         </div>
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">TRẠNG THÁI TOÀN VẸN (ON-CHAIN VERIFY)</p>
                           {data.evidenceVerified ? (
                             <span className="text-[11px] font-bold text-emerald-600">✅ Khớp với dữ liệu hệ thống</span>
                           ) : (
                             <span className="text-[11px] font-bold text-red-600">❌ Không khớp</span>
                           )}
                         </div>
                       </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-center pt-4 pb-2">
                <button 
                  onClick={onClose}
                  className="px-8 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:shadow-sm transition-all"
                >
                  Đóng
                </button>
              </div>
            </>
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
    <div onClick={onClick} className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group">
      {/* Top Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined">eco</span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-[15px] mb-0.5">{item.activity_name}</h3>
            <p className="text-[11px] text-slate-500 font-medium">{item.event_title}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${hasProvenance ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
           <span className="material-symbols-outlined text-[13px]">{hasProvenance ? 'security' : 'hourglass_empty'}</span>
           {hasProvenance ? 'Bảo vệ bởi Blockchain' : 'Đang chờ on-chain'}
        </div>
      </div>

      {/* User */}
      {isAdmin && item.student_name && (
        <div className="flex items-center gap-2 mb-4 text-blue-600 text-sm font-semibold">
          <span className="material-symbols-outlined text-[16px]">person</span> {item.student_name}
        </div>
      )}

      {/* Amount */}
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-[2.75rem] font-black text-emerald-500 leading-none tracking-tight">{item.credit_amount}</span>
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Tín chỉ xanh</span>
      </div>

      {/* Meta Date & Approver */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium mb-5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {formatDate(item.decided_at)}
        </div>
        {item.approver_name && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <span className="material-symbols-outlined text-[14px]">check_box</span>
            {item.approver_name}
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[13px] font-bold text-emerald-600">
        <span>Xem chuỗi nguồn gốc</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Header & Stats Container */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          
          {/* Header Left */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0">
              <span className="material-symbols-outlined text-[32px]">energy_savings_leaf</span>
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight mb-1">Truy xuất nguồn gốc tín chỉ xanh</h1>
              <p className="text-sm text-slate-500 font-medium">
                {isAdmin
                  ? 'Toàn bộ chuỗi minh chứng và quy trình tạo ra mỗi tín chỉ xanh trong hệ thống'
                  : 'Chuỗi minh chứng và quy trình tạo ra các tín chỉ xanh của bạn'}
              </p>
            </div>
          </div>

          {/* Stats Right */}
          <div className="flex gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
            {/* Stat 1 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 min-w-[200px] shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600 leading-none mb-1">{records.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tín chỉ đã cấp</p>
              </div>
            </div>
            
            {/* Stat 2 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 min-w-[200px] shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">database</span>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600 leading-none mb-1">{totalCredits}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng UGC</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 min-w-[200px] shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">link</span>
              </div>
              <div>
                <p className="text-2xl font-black text-blue-600 leading-none mb-1">{onChainCount}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">On-Chain</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm"
              placeholder="Lọc theo hoạt động, sự kiện, người duyệt, TX hash..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button className="bg-white border border-slate-200 rounded-2xl px-6 py-3 text-sm font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Bộ lọc
          </button>
          <span className="text-sm font-bold text-slate-500 whitespace-nowrap hidden sm:block px-2">
            {filtered.length} kết quả
          </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
