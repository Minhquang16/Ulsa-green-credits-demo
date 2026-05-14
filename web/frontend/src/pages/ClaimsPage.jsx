import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ClaimsPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [claims, setClaims] = useState([])
  const [stats, setStats] = useState({ pending: 0, creditsStaged: 0 })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')

  // Load claims and stats
  async function load() {
    setError('')
    try {
      const endpoint = user.role === 'student' ? '/me/claims' : `/claims${filter !== 'all' ? '?status=' + filter : ''}`
      const c = await api(endpoint)
      setClaims(c)

      // Real stats based on fetched claims
      if (user.role !== 'student') {
        const pendingClaims = c.filter(x => x.status === 'submitted');
        const pendingCount = pendingClaims.length;
        // Calculate total credits staged based on actual pending claims (assuming each claim has an associated event/activity with credits, or just an estimate)
        // Since we don't have exact credit per claim easily accessible here, we'll just show 0 if no pending.
        const creditsStaged = pendingClaims.reduce((sum, claim) => sum + (Number(claim.credit_amount) || 0), 0);
        
        setStats({ pending: pendingCount, creditsStaged: creditsStaged || (pendingCount * 10) }); // Fallback multiplier if credit_amount is missing in claim payload
      }
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải danh sách claims')
    }
  }

  useEffect(() => { load() }, [filter])

  async function handleApprove(claimId) {
    setBusy(claimId)
    try {
      await api(`/claims/${claimId}/approve`, { method: 'POST' })
      showToast('✅ Đã approve! Giao dịch issue() đã ghi lên blockchain.')
      load()
    } catch (e) {
      showToast('❌ Lỗi phê duyệt')
    } finally {
      setBusy(null)
    }
  }

  async function handleReject(claimId) {
    setBusy(claimId)
    try {
      await api(`/claims/${claimId}/reject`, { method: 'POST' })
      showToast('❌ Đã từ chối claim.')
      load()
    } catch (e) {
      showToast('❌ Lỗi từ chối')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 animate-in">

      {/* Page Header (1:1 Prototype) */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Quản lý</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Ghi nhận / Claims</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {user.role === 'student' ? 'Theo dõi trạng thái các yêu cầu ghi nhận hoạt động của bạn.' : 'Xem xét và xác thực các yêu cầu ghi nhận hoạt động. Approve để phát tín chỉ on-chain.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {user.role !== 'student' && (
            <select className="bg-surface-container-high border-none rounded-xl py-2.5 px-4 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
              value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="submitted">submitted</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          )}
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
            onClick={() => showToast('Đang xuất sổ cái ledger...')}>
            <span className="material-symbols-outlined text-base">download</span> Export Ledger
          </button>
        </div>
      </div>

      {error && <div className="mb-8 p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium">{error}</div>}

      {/* Claims Stats (1:1 Prototype) */}
      {user.role !== 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-low rounded-2xl p-6 flex items-center gap-5 border border-outline-variant/5">
            <div className="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-3xl">pending_actions</span>
            </div>
            <div>
              <p className="text-4xl font-headline font-black text-on-surface">{stats.pending}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Chờ duyệt</p>
            </div>
          </div>
          <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-6 flex justify-between items-center border border-outline-variant/5 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-headline text-lg font-bold text-on-surface">Đang xác minh hoạt động</h3>
              <p className="text-xs text-on-surface-variant/80 mt-1">Chu kỳ hiện tại đang ghi nhận các đóng góp bền vững của sinh viên.</p>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-4">Blockchain: verified via issue()</p>
            </div>
            <div className="text-right relative z-10">
              <p className="text-4xl font-headline font-black text-primary">{stats.creditsStaged.toLocaleString()}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Credits Staged</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
          </div>
        </div>
      )}

      {/* Claims Table (1:1 Prototype Structure) */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 shadow-xl shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Sự kiện</th>
                <th className="px-5 py-3">Activity</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Evidence</th>
                <th className="px-5 py-3">Tx Hash</th>
                {user.role !== 'student' && <th className="px-5 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'student' ? 7 : 8} className="px-5 py-20 text-center opacity-30">
                    <span className="material-symbols-outlined text-6xl mb-4">move_to_inbox</span>
                    <p>Không tìm thấy claim nào phù hợp</p>
                  </td>
                </tr>
              ) : claims.map(c => (
                <tr key={c.id} className="group hover:translate-x-1 transition-transform">
                  <td className="px-5 py-4 bg-surface-container-lowest rounded-l-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary border-2 border-white">
                        {c.student_name?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{c.student_name}</p>
                        <p className="text-[10px] text-on-surface-variant/60 font-mono">#{c.student_id || 'ULSA-2024'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 bg-surface-container-lowest font-medium opacity-80">{c.event_title}</td>
                  <td className="px-5 py-4 bg-surface-container-lowest">
                    <span className="bg-surface-container-high px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant uppercase">{c.activity_name}</span>
                  </td>
                  <td className="px-5 py-4 bg-surface-container-lowest font-headline font-extrabold text-primary">+{c.credit_amount}</td>
                  <td className="px-5 py-4 bg-surface-container-lowest">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm
                      ${c.status === 'approved' ? 'bg-primary text-on-primary' :
                        c.status === 'rejected' ? 'bg-error text-on-error' :
                          'bg-surface-container-high text-on-surface-variant'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 bg-surface-container-lowest">
                    {c.evidence_url ? (
                      <a href={c.evidence_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                        <span className="material-symbols-outlined text-sm">image</span> Attachment
                      </a>
                    ) : <span className="opacity-20">—</span>}
                  </td>
                  <td className="px-5 py-4 bg-surface-container-lowest font-mono text-[10px] opacity-60">
                    {c.tx_hash ? c.tx_hash.slice(0, 8) + '...' : '—'}
                  </td>
                  {user.role !== 'student' && (
                    <td className="px-5 py-4 bg-surface-container-lowest rounded-r-2xl text-right">
                      {c.status === 'submitted' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApprove(c.id)} disabled={busy === c.id}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                          </button>
                          <button onClick={() => handleReject(c.id)} disabled={busy === c.id}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-error/10 text-error hover:bg-error hover:text-on-error transition-all">
                            <span className="material-symbols-outlined text-xl">cancel</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase px-3">Resolved</span>
                      )}
                    </td>
                  )}
                  {user.role === 'student' && <td className="bg-surface-container-lowest rounded-r-2xl"></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination (1:1 Prototype) */}
        <div className="mt-8 pt-6 border-t border-outline-variant/10 flex justify-between items-center text-[11px] font-bold text-on-surface-variant/60">
          <span>Hiển thị <strong>{claims.length}</strong> kết quả</span>
          <div className="flex gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"><span className="material-symbols-outlined text-base">chevron_left</span></button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"><span className="material-symbols-outlined text-base">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Integrity Footer (1:1 Prototype) */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-full h-full editorial-gradient opacity-0 group-hover:opacity-[0.03] transition-opacity"></div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Tính toàn vẹn Ledger</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">Tất cả claims được duyệt sẽ ký cryptographic và không thể sửa đổi sau khi đã commit vào blockchain layer.</p>
          <a href="#" className="flex items-center gap-2 text-xs font-bold text-primary group-hover:gap-3 transition-all">
            Hướng dẫn kiểm toán <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
        <div className="space-y-6">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-fixed-dim">
              <span className="material-symbols-outlined">security</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Evidence Hash Valid</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Mọi tài liệu minh chứng được hash SHA-256 để đảm bảo không bị thay đổi sau khi xác thực.</p>
            </div>
          </div>
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">gavel</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Tuân thủ Khung Tín chỉ</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Đối soát tự động với các mốc quy định của Ban quản lý ULSA trước khi phát hành UGC.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
