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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="btn-filter-status">
                  <div className="btn-filter-status-text">
                    {statusFilter === 'all' && 'Tất cả trạng thái'}
                    {statusFilter === 'submitted' && 'Đang xử lý'}
                    {statusFilter === 'approved' && 'Đã duyệt'}
                    {statusFilter === 'rejected' && 'Từ chối'}
                  </div>
                  <div className="btn-filter-status-icon">
                    <span className="material-symbols-outlined sc-icon-18 sc-color-slate-400">expand_more</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="sc-dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="sc-dropdown-item">Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('submitted')} className="sc-dropdown-item">Đang xử lý</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('approved')} className="sc-dropdown-item">Đã duyệt</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('rejected')} className="sc-dropdown-item">Từ chối</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button id="date-picker-range" className="btn-date-picker">
              <span>01/05/2026 - 12/06/2026</span>
              <span className="material-symbols-outlined sc-icon-16 sc-color-slate-500">calendar_today</span>
            </button>

            <button className="btn-export-ledger"
              onClick={() => showToast('Đang xuất sổ cái ledger...')}>
              <span className="material-symbols-outlined sc-icon-18">download</span> Export Ledger
            </button>
          </div>
        </div>

        {error && <div className="sc-error-box">{error}</div>}

        {/* Top Metric Cards */}
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-card-inner">
              <div className="sc-icon-wrapper sc-icon-green">
                <span className="material-symbols-outlined sc-icon-24">local_mall</span>
              </div>
              <div className="sc-stat-text-wrapper">
                <p className="sc-stat-value">{stats.total}</p>
                <p className="sc-stat-label">Tổng yêu cầu</p>
                <p className="sc-stat-sublabel">Tất cả thời gian</p>
              </div>
            </div>
          </div>

          <div className="sc-stat-card">
            <div className="sc-stat-card-inner">
              <div className="sc-icon-wrapper sc-icon-blue">
                <span className="material-symbols-outlined sc-icon-24">verified</span>
              </div>
              <div className="sc-stat-text-wrapper">
                <p className="sc-stat-value">{stats.approved}</p>
                <p className="sc-stat-label">Đã duyệt</p>
                <p className="sc-stat-sublabel sc-stat-sublabel-green">+{stats.approvedUgc} UGC</p>
              </div>
            </div>
          </div>

          <div className="sc-stat-card">
            <div className="sc-stat-card-inner">
              <div className="sc-icon-wrapper sc-icon-orange">
                <span className="material-symbols-outlined sc-icon-24">hourglass_empty</span>
              </div>
              <div className="sc-stat-text-wrapper">
                <p className="sc-stat-value">{stats.pending}</p>
                <p className="sc-stat-label">Đang xử lý</p>
                <p className="sc-stat-sublabel">Chờ duyệt</p>
              </div>
            </div>
          </div>

          <div className="sc-stat-card">
            <div className="sc-stat-card-inner">
              <div className="sc-icon-wrapper sc-icon-red">
                <span className="material-symbols-outlined sc-icon-24">cancel</span>
              </div>
              <div className="sc-stat-text-wrapper">
                <p className="sc-stat-value">{stats.rejected}</p>
                <p className="sc-stat-label">Từ chối</p>
                <p className="sc-stat-sublabel sc-stat-sublabel-red">-5 UGC</p>
              </div>
            </div>
          </div>

          <div className="sc-stat-card">
            <div className="sc-stat-card-inner">
              <div className="sc-icon-wrapper sc-icon-purple">
                <span className="material-symbols-outlined sc-icon-24">monetization_on</span>
              </div>
              <div className="sc-stat-text-wrapper">
                <p className="sc-stat-value">{stats.totalUgc}</p>
                <p className="sc-stat-label">Tổng UGC nhận được</p>
                <p className="sc-stat-sublabel">Tất cả thời gian</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="sc-table-container">

          {/* Table Header Controls */}
          <div className="sc-table-header">
            <div className="sc-tabs-container">
              {[
                { label: 'Tất cả', val: 'all', count: stats.total },
                { label: 'Đã duyệt', val: 'approved', count: stats.approved },
                { label: 'Đang xử lý', val: 'submitted', count: stats.pending },
                { label: 'Từ chối', val: 'rejected', count: stats.rejected }
              ].map(t => (
                <button key={t.val} onClick={() => setTabFilter(t.val)}
                  className={`sc-tab-btn ${tabFilter === t.val ? 'active' : ''}`}>
                  {t.label}
                  <span className={`sc-tab-badge ${tabFilter === t.val ? 'active' : ''}`}>{t.count}</span>
                </button>
              ))}
            </div>
            <div className="sc-search-filter-container">
              <div className="sc-search-wrapper">
                <span className="material-symbols-outlined sc-search-icon">search</span>
                <input type="text" placeholder="Tìm kiếm theo tên hoạt động, minh chứng..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="sc-search-input" />
              </div>
              <button className="sc-filter-btn">
                <span className="material-symbols-outlined sc-icon-16">filter_list</span> Bộ lọc
              </button>
            </div>
          </div>

          <ClaimsTable claims={filteredClaims} userRole="student" showToast={showToast} />

          {/* Pagination */}
          <div className="sc-pagination-wrapper">
            <span className="sc-pagination-text">Hiển thị 1 đến {filteredClaims.length} trong tổng số {filteredClaims.length} kết quả</span>
            <div className="sc-pagination-controls">
              <div className="sc-pagination-pages">
                <button className="sc-pagination-btn arrow"><span className="material-symbols-outlined sc-icon-16">chevron_left</span></button>
                <button className="sc-pagination-btn active">1</button>
                <button className="sc-pagination-btn">2</button>
                <button className="sc-pagination-btn">3</button>
                <button className="sc-pagination-btn arrow"><span className="material-symbols-outlined sc-icon-16">chevron_right</span></button>
              </div>
              <div className="sc-pagination-per-page">
                Hiển thị 5 / trang <span className="material-symbols-outlined sc-icon-14 sc-color-slate-400">expand_more</span>
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
