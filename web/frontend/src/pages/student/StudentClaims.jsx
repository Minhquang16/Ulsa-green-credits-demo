import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import ClaimsTable from '../../components/ClaimsTable.jsx'
import '../../styles/student/student-claims.css'

export default function StudentClaims() {
  const { api } = useAuth()
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [tabFilter, setTabFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  async function load() {
    setError('')
    try {
      const c = await api('/me/claims')
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

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (tabFilter !== 'all' && c.status !== tabFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery && !c.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [claims, tabFilter, statusFilter, searchQuery]);

  return (
    <div style={{ background: '#fafafa' }} className="min-h-screen w-full pb-20">
      <main className="max-w-[1300px] mx-auto px-6 lg:px-8 py-8 animate-in">
        
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#16a34a] mb-1">Của tôi</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Lịch sử Ghi nhận</h1>
            <p className="text-sm text-slate-500 mt-1">Theo dõi trạng thái các yêu cầu ghi nhận hoạt động của bạn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 h-[40px] hover:bg-slate-50 transition-colors items-stretch shadow-sm">
                  <div className="px-4 flex items-center justify-center border-r border-slate-200">
                    {statusFilter === 'all' && 'Tất cả trạng thái'}
                    {statusFilter === 'submitted' && 'Đang xử lý'}
                    {statusFilter === 'approved' && 'Đã duyệt'}
                    {statusFilter === 'rejected' && 'Từ chối'}
                  </div>
                  <div className="px-2 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 border border-slate-200">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2">Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('submitted')} className="rounded-md cursor-pointer py-2">Đang xử lý</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('approved')} className="rounded-md cursor-pointer py-2">Đã duyệt</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('rejected')} className="rounded-md cursor-pointer py-2">Từ chối</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button className="flex rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 h-[40px] px-4 hover:bg-slate-50 transition-colors items-center gap-2 shadow-sm">
              01/05/2026 - 12/06/2026
              <span className="material-symbols-outlined text-[18px] text-slate-400">calendar_today</span>
            </button>

            <button className="flex items-center gap-2 px-5 py-2 h-[40px] rounded-lg bg-[#16a34a] text-white font-bold text-sm hover:bg-[#15803d] transition-colors shadow-sm"
              onClick={() => showToast('Đang xuất sổ cái ledger...')}>
              <span className="material-symbols-outlined text-[18px]">download</span> Export Ledger
            </button>
          </div>
        </div>

        {error && <div className="mb-8 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">{error}</div>}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] shrink-0 border border-green-100">
              <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mb-1">{stats.total}</p>
              <p className="text-[11px] font-bold text-slate-800">Tổng yêu cầu</p>
              <p className="text-[10px] text-slate-400 font-medium">Tất cả thời gian</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 border border-blue-100">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mb-1">{stats.approved}</p>
              <p className="text-[11px] font-bold text-slate-800">Đã duyệt</p>
              <p className="text-[10px] font-bold text-[#16a34a]">+{stats.approvedUgc} UGC</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 border border-orange-100">
              <span className="material-symbols-outlined text-[24px]">pending_actions</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mb-1">{stats.pending}</p>
              <p className="text-[11px] font-bold text-slate-800">Đang xử lý</p>
              <p className="text-[10px] text-slate-400 font-medium">Chờ duyệt</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100">
              <span className="material-symbols-outlined text-[24px]">cancel</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mb-1">{stats.rejected}</p>
              <p className="text-[11px] font-bold text-slate-800">Từ chối</p>
              <p className="text-[10px] text-slate-400 font-medium">0 UGC</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0 border border-purple-100">
              <span className="material-symbols-outlined text-[24px]">auto_fix_high</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none mb-1">{stats.totalUgc}</p>
              <p className="text-[11px] font-bold text-slate-800">Tổng UGC nhận được</p>
              <p className="text-[10px] text-slate-400 font-medium">Tất cả thời gian</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tất cả', val: 'all' },
                { label: 'Đã duyệt', val: 'approved' },
                { label: 'Đang xử lý', val: 'submitted' },
                { label: 'Từ chối', val: 'rejected' }
              ].map(t => (
                <button key={t.val} onClick={() => setTabFilter(t.val)}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${tabFilter === t.val ? 'bg-[#e2f3e9] text-[#16a34a]' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input type="text" placeholder="Tìm kiếm hoạt động, sự kiện..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-[#16a34a] shadow-sm" />
            </div>
          </div>

          <ClaimsTable claims={filteredClaims} userRole="student" showToast={showToast} />

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
            <span className="text-[11px] text-slate-500 font-medium">Hiển thị 1 đến {filteredClaims.length} trong tổng số {filteredClaims.length} kết quả</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                <button className="w-7 h-7 flex items-center justify-center rounded-md bg-[#16a34a] text-white text-[11px] font-bold shadow-sm">1</button>
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 text-[11px] font-bold transition-colors">2</button>
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 text-[11px] font-bold transition-colors">3</button>
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 px-3 py-1.5 border border-slate-200 rounded-md bg-white">
                Hiển thị 5 / trang <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Integrity Blocks */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4 group hover:border-[#16a34a]/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">Tính toàn vẹn Ledger</h4>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">Tất cả claims được duyệt sẽ ký cryptographic và không thể sửa đổi sau khi đã commit vào blockchain layer.</p>
              <a href="#" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16a34a] hover:underline">
                Hướng dẫn kiểm toán <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-800 shrink-0 mt-1">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Evidence Hash Valid</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Mọi tài liệu minh chứng được hash SHA-256 để đảm bảo không bị thay đổi sau khi xác thực.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-800 shrink-0 mt-1">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Tuân thủ Khung Tín chỉ</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Đối soát tự động với các mốc quy định của Ban quản lý ULSA trước khi phát hành UGC.</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
