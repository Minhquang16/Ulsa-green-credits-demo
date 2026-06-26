import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import ClaimsTable from '../../components/ClaimsTable.jsx'
import '../../styles/admin/admin-claims.css'


export default function AdminClaims() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [claims, setClaims] = useState([])
  const [stats, setStats] = useState({ 
    total: 0, 
    approved: 0, approvedUgc: 0, 
    pending: 0, 
    rejected: 0, 
    totalUgc: 0 
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [tabFilter, setTabFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [rejectClaimId, setRejectClaimId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  async function load() {
    setError('')
    try {
      const c = await api('/claims')
      setClaims(c)

      const total = c.length
      const approved = c.filter(x => x.status === 'approved')
      const pending = c.filter(x => x.status === 'submitted')
      const rejected = c.filter(x => x.status === 'rejected')
      
      const approvedUgc = approved.reduce((sum, cl) => sum + (Number(cl.credit_amount) || 0), 0)
      const totalUgc = approvedUgc

      setStats({
        total,
        approved: approved.length,
        approvedUgc,
        pending: pending.length,
        rejected: rejected.length,
        totalUgc
      })
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải danh sách claims')
    }
  }

  useEffect(() => { load() }, [])

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

  async function handleRejectClick(claimId) {
    setRejectClaimId(claimId)
    setRejectReason('')
  }

  async function submitReject() {
    if (!rejectClaimId) return
    setBusy(rejectClaimId)
    try {
      await api(`/claims/${rejectClaimId}/reject`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: rejectReason || 'Không hợp lệ' })
      })
      showToast('❌ Đã từ chối claim.')
      load()
    } catch (e) {
      showToast('❌ Lỗi từ chối')
    } finally {
      setBusy(null)
      setRejectClaimId(null)
      setRejectReason('')
    }
  }

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (tabFilter !== 'all' && c.status !== tabFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery && !c.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [claims, tabFilter, statusFilter, searchQuery]);

    return (
    <div style={{ background: '#ffffff' }} className="min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-4 pb-8 space-y-7 animate-in">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Phê duyệt Claims</h1>
            <p className="text-gray-500 text-sm mt-0.5">Quản lý và xét duyệt các yêu cầu ghi nhận hoạt động từ sinh viên.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex rounded-2xl border border-gray-200 bg-white text-[13px] font-medium text-gray-700 h-9 hover:bg-gray-50 transition-colors items-stretch shadow-sm">
                    <div className="px-3 flex items-center justify-center border-r border-gray-200">
                      {statusFilter === 'all' && 'Tất cả trạng thái'}
                      {statusFilter === 'submitted' && 'Đang xử lý'}
                      {statusFilter === 'approved' && 'Đã duyệt'}
                      {statusFilter === 'rejected' && 'Từ chối'}
                    </div>
                    <div className="px-2 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 border border-gray-200">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2">Tất cả trạng thái</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('submitted')} className="rounded-md cursor-pointer py-2">Đang xử lý</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('approved')} className="rounded-md cursor-pointer py-2">Đã duyệt</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('rejected')} className="rounded-md cursor-pointer py-2">Từ chối</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button className="flex rounded-2xl border border-gray-200 bg-white text-[13px] font-medium text-gray-700 h-9 px-3 hover:bg-gray-50 transition-colors items-center gap-2 shadow-sm">
                01/05/2026 - 12/06/2026
                <span className="material-symbols-outlined text-[16px] text-gray-400">calendar_today</span>
              </button>

              <button className="flex items-center gap-2 px-4 h-9 rounded-2xl bg-[#2d7a4f] text-white font-semibold text-[13px] hover:bg-[#246140] transition-colors shadow-sm"
                onClick={() => showToast('Đang xuất sổ cái ledger...')}>
                <span className="material-symbols-outlined text-[16px]">ios_share</span> Export Ledger
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mb-8 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">{error}</div>}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-black font-semibold">Tổng yêu cầu</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="material-symbols-outlined text-base text-gray-400">assignment_turned_in</span>
              </div>
            </div>
            <p className="text-3xl font-black mb-1 text-gray-900">{stats.total}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] text-gray-600 font-medium">Tất cả thời gian</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-black font-semibold">Đã duyệt</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="material-symbols-outlined text-base text-blue-500">verified</span>
              </div>
            </div>
            <p className="text-3xl font-black mb-1 text-gray-900">{stats.approved}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] text-gray-600 font-medium">Hoàn thành</p>
              <span className="text-[10px] font-bold text-green-600">+{stats.approvedUgc} UGC</span>
            </div>
          </div>

          <div className="bg-red-50 rounded-2xl p-5 shadow-sm border border-red-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-black font-semibold">Đang xử lý</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
                <span className="material-symbols-outlined text-base text-red-500">pending_actions</span>
              </div>
            </div>
            <p className="text-3xl font-black mb-1 text-red-600">{stats.pending}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-red-100/50">
              <p className="text-[10px] text-gray-600 font-medium">Chờ duyệt</p>
              <span className="text-[10px] font-bold text-red-500">Cần xử lý ngay</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-black font-semibold">Từ chối</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="material-symbols-outlined text-base text-red-500">cancel</span>
              </div>
            </div>
            <p className="text-3xl font-black mb-1 text-gray-900">{stats.rejected}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] text-gray-600 font-medium">Không hợp lệ</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-black font-semibold">UGC đã cấp</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="material-symbols-outlined text-base text-purple-500">auto_fix_high</span>
              </div>
            </div>
            <p className="text-3xl font-black mb-1 text-gray-900">{stats.totalUgc}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] text-gray-600 font-medium">Tất cả thời gian</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Header Controls */}
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tất cả', val: 'all' },
                { label: 'Đã duyệt', val: 'approved' },
                { label: 'Đang xử lý', val: 'submitted' },
                { label: 'Từ chối', val: 'rejected' }
              ].map(t => (
                <button key={t.val} onClick={() => setTabFilter(t.val)}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${tabFilter === t.val ? 'bg-green-100 text-green-700' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input type="text" placeholder="Tìm kiếm hoạt động, sự kiện..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs focus:outline-none focus:border-green-400 shadow-sm" />
            </div>
          </div>

          <ClaimsTable 
            claims={filteredClaims} 
            userRole={user.role} 
            busy={busy} 
            onApprove={handleApprove} 
            onReject={handleRejectClick} 
            showToast={showToast} 
          />

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
            <span className="text-[11px] text-gray-500 font-medium">Hiển thị 1 đến {filteredClaims.length} trong tổng số {filteredClaims.length} kết quả</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-600 text-white text-[12px] font-bold shadow-sm">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-[12px] font-bold transition-colors">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-[12px] font-bold transition-colors">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-md bg-white">
                Hiển thị 5 / trang <span className="material-symbols-outlined text-[14px] text-gray-400">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Integrity Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4 group hover:border-green-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">Tính toàn vẹn Ledger</h4>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Tất cả claims được duyệt sẽ ký cryptographic và không thể sửa đổi sau khi đã commit vào blockchain layer.</p>
              <a href="#" className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 hover:underline">
                Hướng dẫn kiểm toán <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-800 shrink-0 mt-1">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800">Evidence Hash Valid</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Mọi tài liệu minh chứng được hash SHA-256 để đảm bảo không bị thay đổi sau khi xác thực.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-800 shrink-0 mt-1">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800">Tuân thủ Khung Tín chỉ</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Đối soát tự động với các mốc quy định của Ban quản lý ULSA trước khi phát hành UGC.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Reject Modal */}
      {rejectClaimId && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] animate-in fade-in duration-200" onClick={() => setRejectClaimId(null)}></div>
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md pointer-events-auto animate-in zoom-in-95 fade-in duration-200">
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Từ chối Yêu cầu</h3>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Lý do từ chối</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all resize-none min-h-[100px]"
                  placeholder="Nhập lý do từ chối (VD: Minh chứng mờ, sai hoạt động...)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setRejectClaimId(null)}
                  className="px-5 py-2 rounded-xl text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 transition-colors"
                  disabled={busy === rejectClaimId}
                >
                  Hủy
                </button>
                <button 
                  onClick={submitReject}
                  disabled={!rejectReason.trim() || busy === rejectClaimId}
                  className="px-5 py-2 rounded-xl text-white font-bold text-sm bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === rejectClaimId ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">done</span>}
                  Xác nhận Từ chối
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
