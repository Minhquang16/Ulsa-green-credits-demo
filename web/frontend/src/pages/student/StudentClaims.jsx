import React, { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import ClaimsTable from '../../components/ClaimsTable.jsx'
import '../../styles/student/student-claims.css'

export default function StudentClaims() {
  const { api } = useAuth()
  const { showToast } = useToast()
  const [claims, setClaims] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [streakStats, setStreakStats] = useState(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tabFilter, setTabFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  })

  async function load() {
    setError('')
    try {
      const c = await api('/me/claims')
      setClaims(c)

      try {
        const streakRes = await api('/stats/streak-overview')
        if (streakRes.success) {
          setStreakStats(streakRes.data)
        }
      } catch (err) {
        console.error('Failed to load streak stats:', err)
      }
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải danh sách claims')
    }
  }

  const handleExport = async () => {
    try {
      showToast('Đang tạo tệp dữ liệu sổ cái...');
      const csvString = await api('/me/claims/export');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ugc_ledger.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      showToast('❌ Lỗi xuất dữ liệu');
    }
  }

  useEffect(() => { load() }, [])

  const dateFilteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (dateRange?.from) {
        const claimDate = new Date(c.created_at);
        claimDate.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (claimDate < fromDate) return false;

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (claimDate > toDate) return false;
        }
      }
      return true;
    });
  }, [claims, dateRange]);

  const stats = useMemo(() => {
    const approved = dateFilteredClaims.filter(x => x.status === 'approved');
    const pending = dateFilteredClaims.filter(x => x.status === 'submitted');
    const rejected = dateFilteredClaims.filter(x => x.status === 'rejected');
    const approvedUgc = approved.reduce((sum, cl) => sum + (Number(cl.credit_amount) || 0), 0);

    return {
      total: dateFilteredClaims.length,
      approved: approved.length,
      approvedUgc,
      pending: pending.length,
      rejected: rejected.length,
      totalUgc: approvedUgc
    };
  }, [dateFilteredClaims]);

  const filteredClaims = useMemo(() => {
    return dateFilteredClaims.filter(c => {
      if (tabFilter !== 'all' && c.status !== tabFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery && !c.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [dateFilteredClaims, tabFilter, statusFilter, searchQuery]);

  useEffect(() => {
    setPageIndex(0);
  }, [tabFilter, statusFilter, searchQuery, dateRange]);

  const paginatedClaims = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, pageIndex, pageSize]);

  return (
    <div className="sc-page-wrapper">
      <main className="sc-main-container">

        {/* Page Header */}
        <div className="sc-header-row">
          <div>
            <p className="sc-subtitle">GHI NHẬN / CLAIMS</p>
            <h1 className="sc-title">Claims của tôi</h1>
            <p className="sc-description">Theo dõi và quản lý các yêu cầu ghi nhận hoạt động của bạn.</p>
          </div>
          <div className="sc-header-actions">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-[238px] h-[32px] px-3 border border-gray-200 rounded-lg bg-white text-sm text-black hover:bg-gray-50 transition-colors shrink-0 outline-none shadow-sm">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-black" />
                    <span className="text-left whitespace-nowrap">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `T${dateRange.from.getMonth() + 1} ${format(dateRange.from, "dd, yyyy")} - T${dateRange.to.getMonth() + 1} ${format(dateRange.to, "dd, yyyy")}`
                        ) : (
                          `T${dateRange.from.getMonth() + 1} ${format(dateRange.from, "dd, yyyy")}`
                        )
                      ) : (
                        'T1 20, 2026 - T2 09, 2026'
                      )}
                    </span>
                  </div>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-xl overflow-hidden border border-gray-200 shadow-lg"
                align="start"
                style={{
                  '--primary': '240 5.9% 10%',
                  '--primary-foreground': '0 0% 98%',
                  '--accent': '240 4.8% 95.9%',
                  '--accent-foreground': '240 5.9% 10%',
                  '--radius': '0.5rem'
                }}
              >
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={vi}
                  disabled={dateRange?.from && !dateRange?.to ? [{ before: dateRange.from }] : []}
                  formatters={{
                    formatWeekdayName: (date) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
                    formatCaption: (date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
                    formatMonthCaption: (date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`
                  }}
                />
              </PopoverContent>
            </Popover>

            <button className="btn-export-ledger"
              onClick={handleExport}>
              <span className="material-symbols-outlined sc-icon-18">download</span> Export Ledger
            </button>
          </div>
        </div>

        {error && <div className="sc-error-box">{error}</div>}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="text-[28px] font-black text-slate-800 leading-none">{stats.total}</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">local_mall</span>
              </div>
              <span className="text-[13px] font-bold text-slate-800">Tổng yêu cầu</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Tất cả thời gian</div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="text-[28px] font-black text-slate-800 leading-none">{stats.approved}</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <span className="text-[13px] font-bold text-slate-800">Đã duyệt</span>
            </div>
            <div className="text-[11px] font-bold text-[#16a34a]">+{stats.approvedUgc} UGC</div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="text-[28px] font-black text-slate-800 leading-none">{stats.pending}</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>hourglass_empty</span>
              </div>
              <span className="text-[13px] font-bold text-slate-800">Đang xử lý</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Chờ duyệt</div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="text-[28px] font-black text-slate-800 leading-none">{stats.rejected}</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </div>
              <span className="text-[13px] font-bold text-slate-800">Từ chối</span>
            </div>
            <div className="text-[11px] font-bold text-red-500">-5 UGC</div>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <div className="text-[28px] font-black text-slate-800 leading-none">{stats.totalUgc}</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">monetization_on</span>
              </div>
              <span className="text-[13px] font-bold text-slate-800 text-left leading-tight">Tổng UGC nhận<br />được</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Tất cả thời gian</div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col xl:flex-row gap-6">

          {/* Left Column (Table) */}
          <div className="flex-1 min-w-0">
            {/* Table Section */}
            <div className="sc-table-container">

              {/* Table Header Controls */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between p-5 gap-4">
                {/* Status Filter Dropdown */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-[38px] px-4 rounded-[10px] border border-slate-200 flex items-center gap-2 text-[13px] font-medium text-slate-900 bg-white hover:bg-slate-50 transition-colors shrink-0 outline-none shadow-sm">
                        <span className="min-w-[4.5rem] text-left">
                          {statusFilter === 'all' && 'Tất cả trạng thái'}
                          {statusFilter === 'submitted' && 'Đang xử lý'}
                          {statusFilter === 'approved' && 'Đã duyệt'}
                          {statusFilter === 'rejected' && 'Từ chối'}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-slate-500">expand_more</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl border border-slate-200 shadow-sm min-w-[160px] p-1.5 bg-white z-50">
                      <DropdownMenuItem onClick={() => { setStatusFilter('all'); setTabFilter('all') }} className="cursor-pointer rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 px-3 py-2 outline-none">Tất cả trạng thái</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setStatusFilter('submitted'); setTabFilter('all') }} className="cursor-pointer rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 px-3 py-2 outline-none">Đang xử lý</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setStatusFilter('approved'); setTabFilter('all') }} className="cursor-pointer rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 px-3 py-2 outline-none">Đã duyệt</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setStatusFilter('rejected'); setTabFilter('all') }} className="cursor-pointer rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 px-3 py-2 outline-none">Từ chối</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Search & Action */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
                  <div className="relative w-full sm:w-[320px]">
                    <input
                      type="text"
                      placeholder="Tìm kiếm hoạt động, sự kiện..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-[38px] pl-5 pr-12 rounded-full border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-all placeholder:text-slate-400"
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">search</span>
                  </div>
                  <button className="h-[38px] px-5 rounded-full border border-slate-200 flex items-center gap-2 text-[13px] font-semibold text-slate-500 bg-white hover:bg-slate-50 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[18px]">tune</span> Bộ lọc
                  </button>
                </div>
              </div>

              <ClaimsTable
                claims={paginatedClaims}
                userRole="student"
                showToast={showToast}
                startIndex={pageIndex * pageSize}
              />

              {/* Pagination */}
              <div className="sc-pagination-wrapper">
                <span className="sc-pagination-text">Hiển thị {filteredClaims.length === 0 ? 0 : pageIndex * pageSize + 1} đến {Math.min((pageIndex + 1) * pageSize, filteredClaims.length)} trong tổng số {filteredClaims.length} kết quả</span>
                <div className="sc-pagination-controls">
                  <div className="sc-pagination-pages">
                    <button
                      className={`sc-pagination-btn arrow ${pageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                      disabled={pageIndex === 0}
                    >
                      <span className="material-symbols-outlined sc-icon-16">chevron_left</span>
                    </button>

                    {Array.from({ length: Math.ceil(filteredClaims.length / pageSize) }).map((_, i) => {
                      if (i === 0 || i === Math.ceil(filteredClaims.length / pageSize) - 1 || Math.abs(i - pageIndex) <= 1) {
                        return (
                          <button
                            key={i}
                            className={`sc-pagination-btn ${pageIndex === i ? 'active bg-[#16a34a] text-white border-[#16a34a]' : ''}`}
                            onClick={() => setPageIndex(i)}
                          >
                            {i + 1}
                          </button>
                        )
                      }
                      if (Math.abs(i - pageIndex) === 2) {
                        return <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>
                      }
                      return null;
                    }).filter((x, i, a) => x !== null && (i === 0 || x.key !== a[i - 1]?.key))}

                    <button
                      className={`sc-pagination-btn arrow ${pageIndex >= Math.ceil(filteredClaims.length / pageSize) - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => setPageIndex(p => Math.min(Math.ceil(filteredClaims.length / pageSize) - 1, p + 1))}
                      disabled={pageIndex >= Math.ceil(filteredClaims.length / pageSize) - 1}
                    >
                      <span className="material-symbols-outlined sc-icon-16">chevron_right</span>
                    </button>
                  </div>
                  <div className="sc-pagination-per-page relative">
                    <select
                      className="appearance-none bg-transparent outline-none pr-6 cursor-pointer font-medium text-slate-600"
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
                    >
                      <option value={5}>Hiển thị: 5 / trang</option>
                      <option value={10}>Hiển thị: 10 / trang</option>
                      <option value={20}>Hiển thị: 20 / trang</option>
                    </select>
                    <span className="material-symbols-outlined sc-icon-14 sc-color-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sidecards) */}
          <div className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-6">

            {/* Card 1: Tổng quan nhanh */}
            <div className="bg-white rounded-[1rem] p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Tổng quan nhanh</h3>
              <div className="mb-1">
                <span className="text-xs font-semibold text-slate-500">Tổng UGC</span>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-slate-800">{stats.totalUgc}</span>
                <span className="text-sm font-bold text-slate-800 mb-1">điểm</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">Đã đóng góp cho môi trường</p>
              <div className="flex items-center gap-1 text-[#16a34a] text-[10px] font-bold bg-[#f0fdf4] w-fit px-2 py-1 rounded-full border border-[#dcfce7]">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                25 điểm so với tháng trước
              </div>

              <div className="absolute right-[-10px] top-[40px] opacity-10 transform rotate-[-10deg]">
                <span className="material-symbols-outlined text-[90px] text-[#16a34a]">description</span>
              </div>
              <div className="absolute right-[25px] top-[60px] opacity-40">
                <span className="material-symbols-outlined text-[40px] text-[#15803d]">eco</span>
              </div>
            </div>

            {/* Card 2: Chuỗi xanh */}
            <div className="bg-white rounded-[1rem] p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[13px] font-bold text-slate-800">Chuỗi xanh</h3>
                <span className="material-symbols-outlined text-orange-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-2xl font-black text-slate-800">{streakStats ? streakStats.currentStreak : 0} ngày</span>
                <span className="text-[10px] font-semibold text-slate-500 mb-1">liên tiếp</span>
              </div>

              <div className="flex justify-between items-center mt-5 mb-5">
                {streakStats ? streakStats.weeklyProgress.map((day) => (
                  <div key={day.label} className="flex flex-col items-center gap-1.5">
                    {day.completed ? (
                      <div className="w-[22px] h-[22px] rounded-full bg-[#16a34a] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      </div>
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full bg-slate-100 text-slate-300 flex items-center justify-center border border-slate-200">
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      </div>
                    )}
                    <span className="text-[9px] font-semibold text-slate-500">{day.label}</span>
                  </div>
                )) : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <div key={d} className="flex flex-col items-center gap-1.5">
                    <div className="w-[22px] h-[22px] rounded-full bg-slate-100 text-slate-300 flex items-center justify-center border border-slate-200">
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500">{d}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500">
                Kỷ lục của bạn: <span className="font-bold text-slate-700">{streakStats ? streakStats.longestStreak : 0} ngày</span>
              </div>
            </div>

            {/* Card 3: Trạng thái yêu cầu */}
            <div className="bg-white rounded-[1rem] p-5 border border-slate-200 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Trạng thái yêu cầu</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 w-[90px]">
                    <div className="w-4 h-4 rounded-full bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center border border-[#dcfce7]">
                      <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                    </div>
                    Đã duyệt
                  </div>
                  <div className="flex-1 mx-3 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${(stats.approved / stats.total * 100) || 0}%` }}></div>
                  </div>
                  <div className="text-[12px] font-bold text-slate-800 w-5 text-right">{stats.approved}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 w-[90px]">
                    <div className="w-4 h-4 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
                      <span className="material-symbols-outlined text-[10px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
                    </div>
                    Đang xử lý
                  </div>
                  <div className="flex-1 mx-3 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(stats.pending / stats.total * 100) || 0}%` }}></div>
                  </div>
                  <div className="text-[12px] font-bold text-slate-800 w-5 text-right">{stats.pending}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 w-[90px]">
                    <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                      <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                    </div>
                    Từ chối
                  </div>
                  <div className="flex-1 mx-3 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(stats.rejected / stats.total * 100) || 0}%` }}></div>
                  </div>
                  <div className="text-[12px] font-bold text-slate-800 w-5 text-right">{stats.rejected}</div>
                </div>

                <div className="h-[1px] bg-slate-100 w-full my-2"></div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] font-semibold text-slate-700 w-[90px]">
                    Tất cả
                  </div>
                  <div className="flex-1 mx-3 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `100%` }}></div>
                  </div>
                  <div className="text-[12px] font-bold text-slate-800 w-5 text-right">{stats.total}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Integrity Blocks */}
        <div className="sc-footer-grid">
          <div className="sc-integrity-card">
            <div className="sc-integrity-icon">
              <span className="material-symbols-outlined sc-icon-20">security</span>
            </div>
            <div className="sc-integrity-content">
              <h4>Tính toàn vẹn Ledger</h4>
              <p>Tất cả claims được duyệt sẽ ký cryptographic và không thể sửa đổi sau khi đã commit vào blockchain layer.</p>
              <a href="#" className="sc-integrity-link">
                Hướng dẫn kiểm toán <span className="material-symbols-outlined sc-icon-14">arrow_forward</span>
              </a>
            </div>
          </div>

          <div className="sc-security-list">
            <div className="sc-security-item">
              <div className="sc-security-icon">
                <span className="material-symbols-outlined sc-icon-20">verified_user</span>
              </div>
              <div>
                <h4>Evidence Hash Valid</h4>
                <p>Mọi tài liệu minh chứng được hash SHA-256 để đảm bảo không bị thay đổi sau khi xác thực.</p>
              </div>
            </div>
            <div className="sc-security-item">
              <div className="sc-security-icon">
                <span className="material-symbols-outlined sc-icon-20">gavel</span>
              </div>
              <div>
                <h4>Tuân thủ Khung Tín chỉ</h4>
                <p>Đối soát tự động với các mốc quy định của Ban quản lý ULSA trước khi phát hành UGC.</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
