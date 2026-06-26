import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/admin/admin-rewards.css'


const DEFAULT_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVLas-0p_8LS621wPq7p3fazbwxRKGDGUPqbpaxyx0zXEJWc4o943CB5q-nSS1NDQtG6_wb1gF5i6uOHP8pceeDKRptMEw9sozZMd720SVY_gfBVt_RgSh2PutsDpdjl1veWlyJccX89edsDBvr_2b6U6FnJhPmgp4hJhIQ79-T6WyIk_yr6mixg9rJfAEC89NVsWgmBRTkkpvZJYPLQVCLyiCRnjEBaCfF9JdweFun46utWctBWb565fZm87aee6c1L1UWO2Tg6w'

const EMPTY_FORM = { title: '', description: '', cost_credits: '', stock: '', category_id: '', limit_per_student: '1', status: 'active', start_date: '', expiry_date: '', image_url: '' }

export default function AdminRewards() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(null)
  const [busy, setBusy] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPrice, setFilterPrice] = useState('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [retireForm, setRetireForm] = useState({ amount: '', reason: '' })
  const [stats, setStats] = useState({ total: 0, total_ugc_redeemed: 0, most_popular: null, low_stock: 0 })
  const [categories, setCategories] = useState([])
  const [newCat, setNewCat] = useState({ name: '', description: '' })
  const [showCatMgmt, setShowCatMgmt] = useState(false)
  const [showNewCatInline, setShowNewCatInline] = useState(false)

  async function load() {
    try {
      const r = await api('/rewards')
      setRewards(r)
      if (user.role === 'admin') {
        const [s, cats] = await Promise.all([
          api('/rewards/stats'),
          api('/reward-categories')
        ])
        setStats(s)
        setCategories(cats)
      }
      if (user.role === 'student') {
        const b = await api('/wallet/balance')
        setBalance(b.balance)
      }
    } catch { showToast('❌ Lỗi tải dữ liệu') }
  }

  useEffect(() => { load() }, [])

  const [editingId, setEditingId] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title || !form.cost_credits) { showToast('⚠️ Nhập tên và giá trị UGC'); return }
    setBusy('create')
    try {
      if (editingId) {
        await api(`/rewards/${editingId}`, {
          method: 'PUT', body: JSON.stringify({
            title: form.title,
            description: form.description,
            cost_credits: form.cost_credits,
            stock: form.stock,
            category_id: form.category_id,
            limit_per_student: form.limit_per_student,
            status: form.status,
            start_date: form.start_date,
            expiry_date: form.expiry_date,
            image_url: form.image_url
          })
        })
        showToast('✅ Cập nhật phần thưởng thành công!')
      } else {
        await api('/rewards', {
          method: 'POST', body: JSON.stringify({
            title: form.title,
            description: form.description,
            cost_credits: form.cost_credits,
            stock: form.stock,
            category_id: form.category_id,
            limit_per_student: form.limit_per_student,
            status: form.status,
            start_date: form.start_date,
            expiry_date: form.expiry_date,
            image_url: form.image_url
          })
        })
        showToast('✅ Tạo phần thưởng thành công!')
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      load()
    } catch { showToast('❌ Lỗi xử lý') } finally { setBusy(false) }
  }

  function handleEditClick(r) {
    setForm({
      title: r.title || '',
      description: r.description || '',
      cost_credits: r.cost_credits || '',
      stock: r.stock || '',
      category_id: r.category_id || '',
      limit_per_student: r.limit_per_student || '1',
      status: r.status || 'active',
      start_date: r.start_date ? r.start_date.slice(0, 10) : '',
      expiry_date: r.expiry_date ? r.expiry_date.slice(0, 10) : '',
      image_url: r.image_url || ''
    })
    setEditingId(r.id)
    document.getElementById('create-form').scrollIntoView({ behavior: 'smooth' })
  }

  async function handleDelete(id) {
    if (!id || !window.confirm('Bạn có chắc chắn muốn xoá phần thưởng này?')) return
    setBusy(id)
    try {
      await api(`/rewards/${id}`, { method: 'DELETE' })
      showToast('🗑️ Đã xoá phần thưởng thành công')
      load()
    } catch (err) {
      showToast(err.message || '❌ Lỗi khi xoá phần thưởng')
    } finally {
      setBusy(null)
    }
  }

  async function handleRedeem(r) {
    if (balance < r.cost_credits) { showToast('⚠️ Không đủ tín chỉ!'); return }
    setBusy(r.id)
    try {
      await api(`/rewards/${r.id}/redeem`, { method: 'POST' })
      showToast(`🎁 Đã đổi "${r.title}"!`)
      load()
    } catch { showToast('❌ Lỗi đổi quà') } finally { setBusy(null) }
  }

  async function handleRetire(e) {
    e.preventDefault()
    setBusy('retire')
    try {
      await api('/wallet/burn', { method: 'POST', body: JSON.stringify(retireForm) })
      showToast(`🔥 Đã retire ${retireForm.amount} UGC!`)
      setRetireForm({ amount: '', reason: '' })
      load()
    } catch { showToast('❌ Lỗi retire') } finally { setBusy(false) }
  }

  const filtered = rewards.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = filterCategory === 'all' || String(r.category_id) === String(filterCategory)
    const matchPrice = filterPrice === 'all' ||
      (filterPrice === 'lt10' ? Number(r.cost_credits) < 10 :
        filterPrice === '10-50' ? Number(r.cost_credits) >= 10 && Number(r.cost_credits) <= 50 :
          Number(r.cost_credits) > 50)
    return matchSearch && matchCategory && matchPrice
  })

  const [page, setPage] = useState(1)
  const itemsPerPage = 3
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  
  useEffect(() => {
    setPage(1)
  }, [search, filterCategory, filterPrice])

  const paginatedRewards = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const popularName = stats.most_popular?.title || '—'

  // Route sinh viên sang trang riêng

  return (
    <main className="w-full bg-white min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quản lý Ưu đãi <span className="text-[#16a34a]">Xanh</span></h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý kho quà tặng, voucher và các phần thưởng dành cho sinh viên tham gia các hoạt động bảo vệ môi trường.</p>
          </div>
          <button onClick={() => document.getElementById('create-form').scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[#16a34a] text-[#16a34a] font-bold text-sm bg-white hover:bg-green-50 transition-colors shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-lg">add</span> Thêm Ưu Đãi Mới
          </button>
        </div>

        {/* Stats — real-time from backend */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'TỔNG ƯU ĐÃI', value: stats.total, sub: `${rewards.length} hiển thị`, icon: 'redeem', iconColor: 'text-green-400' },
            { label: 'TỔNG UGC ĐÃ DÙNG', value: `${Number(stats.total_ugc_redeemed).toLocaleString()} UGC`, sub: 'Từ lịch sử đổi', icon: 'eco', iconColor: 'text-gray-300' },
            { label: 'PHỔ BIẾN NHẤT', value: popularName, sub: stats.most_popular ? `${stats.most_popular.redeem_count} lượt đổi` : '0 lượt đổi', icon: 'star', iconColor: 'text-yellow-300' },
            { label: 'SẮP HẾT KHO', value: stats.low_stock, sub: 'vật phẩm (≤5)', icon: 'inventory_2', iconColor: 'text-gray-200' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
                <p className="text-lg font-black text-gray-900 truncate leading-tight" title={typeof s.value === 'string' ? s.value : undefined}>{s.value}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{s.sub}</p>
              </div>
              <span className={`material-symbols-outlined text-[36px] ${s.iconColor} shrink-0 group-hover:scale-110 transition-transform select-none`}>{s.icon}</span>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-5">
          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-11 pr-4 text-[13px] text-gray-800 placeholder-gray-400 focus:border-green-500 outline-none transition-all shadow-sm"
              placeholder="Tìm tên phần thưởng..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <select
                className="text-[13px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer appearance-none pr-1 hover:text-green-600 transition-colors"
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="material-symbols-outlined text-[16px] text-gray-400 pointer-events-none">expand_more</span>
            </div>

            <div className="w-[1px] h-4 bg-gray-200"></div>

            <div className="flex items-center gap-1">
              <select
                className="text-[13px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer appearance-none pr-1 hover:text-green-600 transition-colors"
                value={filterPrice} onChange={e => setFilterPrice(e.target.value)}
              >
                <option value="all">Mức giá UGC</option>
                <option value="lt10">Dưới 10</option>
                <option value="10-50">10 – 50</option>
                <option value="gt50">Trên 50</option>
              </select>
              <span className="material-symbols-outlined text-[16px] text-gray-400 pointer-events-none">expand_more</span>
            </div>

            <div className="w-[1px] h-4 bg-gray-200"></div>

            <button
              onClick={() => setShowCatMgmt(!showCatMgmt)}
              className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${showCatMgmt ? 'text-green-600' : 'text-gray-700 hover:text-green-600'}`}
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              Quản lý danh mục
            </button>
          </div>
        </div>

        {/* Category Management UI - Slide down */}
        {showCatMgmt && (
          <div className="mb-8 bg-surface-container-low rounded-3xl p-6 border border-primary/10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings_suggest</span>
                Thiết lập Danh mục Phần thưởng
              </h2>
              <button onClick={() => setShowCatMgmt(false)} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Cat */}
              <div className="bg-white/50 p-5 rounded-2xl border border-outline-variant/10">
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-4">Thêm danh mục mới</p>
                <div className="space-y-4">
                  <input className="w-full h-11 bg-white border border-outline-variant/30 rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Tên danh mục (VD: Quà lưu niệm)" value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))} />
                  <textarea className="w-full h-20 bg-white border border-outline-variant/30 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="Mô tả ngắn..." value={newCat.description} onChange={e => setNewCat(f => ({ ...f, description: e.target.value }))} />
                  <button
                    onClick={async () => {
                      if (!newCat.name) return showToast('⚠️ Nhập tên danh mục')
                      setBusy('cat')
                      try {
                        await api('/reward-categories', { method: 'POST', body: JSON.stringify(newCat) })
                        showToast('✅ Đã thêm danh mục')
                        setNewCat({ name: '', description: '' })
                        load()
                      } catch (e) { showToast('❌ Lỗi khi thêm') } finally { setBusy(null) }
                    }}
                    disabled={busy === 'cat'}
                    className="w-full py-3 rounded-xl editorial-gradient text-white font-bold text-sm shadow-md active:scale-95 transition-all">
                    {busy === 'cat' ? 'Đang lưu...' : 'Lưu danh mục'}
                  </button>
                </div>
              </div>

              {/* Cat List */}
              <div className="lg:col-span-2">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/40 mb-4 px-2">Danh sách hiện có</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant/5 shadow-sm group hover:border-primary/20 transition-all">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{c.name}</p>
                        <p className="text-[10px] text-on-surface-variant opacity-60 truncate max-w-[150px]">{c.description || 'Chưa có mô tả'}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Xoá danh mục "${c.name}"?`)) return
                          try {
                            await api(`/reward-categories/${c.id}`, { method: 'DELETE' })
                            showToast('🗑️ Đã xoá danh mục')
                            load()
                          } catch (e) { showToast('❌ Không thể xoá danh mục đang có sản phẩm') }
                        }}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reward Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {filtered.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">inventory_2</span>
              <p className="font-bold mb-4 text-base text-slate-800">Chưa có phần thưởng nào</p>
              <button onClick={() => document.getElementById('create-form').scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2.5 rounded-xl bg-[#16a34a] text-white font-bold text-sm shadow-md hover:-translate-y-0.5 transition-transform">
                Tạo ngay
              </button>
            </div>
          )}
          {paginatedRewards.map(r => (
            <article key={r.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col w-full mx-auto">
              {/* Media Area */}
              <div className="relative h-[220px] bg-gradient-to-b from-slate-50 to-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-8">
                <img alt={r.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 drop-shadow-xl" src={r.image_url || DEFAULT_IMG} />

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/60 to-transparent">
                  <h3 className="text-[15px] font-bold leading-tight text-white drop-shadow-md truncate">{r.title}</h3>
                </div>

                {/* Top Left Badge */}
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1.5 rounded-full bg-[#16a34a] text-white text-[11px] font-bold tracking-tight shadow-md">
                    {r.cost_credits} UGC
                  </div>
                </div>

                {/* Top Right Badge */}
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    {r.category_name || 'VOUCHER'}
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="px-4 py-3 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-0 py-3 mb-2 border-b border-slate-100">
                  <div className="text-center border-r border-slate-100">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Còn lại</p>
                    <p className={`text-[13px] font-black ${r.stock <= 5 ? 'text-rose-500' : 'text-slate-800'}`}>
                      {r.stock}<span className="text-[9px] ml-0.5 font-bold text-slate-500">món</span>
                    </p>
                  </div>
                  <div className="text-center border-r border-slate-100">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Mỗi bạn</p>
                    <p className="text-[13px] font-black text-slate-800">
                      {r.limit_per_student || 1}<span className="text-[9px] ml-0.5 font-bold text-slate-500">lượt</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Hạn dùng</p>
                    <p className="text-[12px] font-black text-slate-800 truncate px-0.5">
                      {(() => {
                        if (!r.expiry_date) return '—'
                        if (r.start_date && r.expiry_date) {
                          const start = new Date(r.start_date)
                          const end = new Date(r.expiry_date)
                          const diffTime = end - start
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                          if (diffDays > 0) return `${diffDays} ngày`
                        }
                        return new Date(r.expiry_date).toLocaleDateString('vi-VN', { month: '2', day: '2' })
                      })()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 pb-1">
                  <button onClick={() => handleEditClick(r)} className="flex items-center gap-1.5 text-slate-500 hover:text-[#16a34a] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit_square</span>
                    <span className="text-[11px] font-bold uppercase tracking-tight">Cập nhật</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    disabled={busy === r.id}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {busy === r.id ? 'sync' : 'delete'}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Pagination UI */}
        {totalPages > 0 && (
          <div className="flex items-center justify-center gap-3 mt-6 mb-8 animate-in fade-in">
            <span className="text-[12px] font-bold text-slate-500 mr-3">Trang {page} / {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(1)} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-green-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_left</span>
              </button>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-green-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-green-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button 
                onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-green-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_right</span>
              </button>
            </div>
          </div>
        )}

        {/* Create / Edit Form */}
        <div id="create-form" className="mt-12 border-t border-slate-200 pt-8 pb-12">
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">{editingId ? 'Cập Nhật Phần Thưởng' : 'Tạo Phần Thưởng Mới'}</h2>
            <p className="text-[13px] text-slate-500">Điền thông tin chi tiết để {editingId ? 'cập nhật' : 'thêm'} ưu đãi vào hệ thống.</p>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-12 items-start">
            
            {/* Left Column: Main info */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Image upload */}
                <div className="w-full sm:w-[160px] shrink-0 space-y-2">
                  <label className="text-[12px] font-bold text-slate-700 block">Hình Ảnh Minh Họa</label>
                  <div
                    onClick={() => document.getElementById('fileInput').click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#16a34a]', 'bg-green-50'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#16a34a]', 'bg-green-50'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-[#16a34a]', 'bg-green-50');
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setForm(f => ({ ...f, image_url: ev.target.result }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="group relative h-[140px] border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#16a34a] hover:bg-green-50/50 transition-all overflow-hidden bg-slate-50/30"
                  >
                    {form.image_url ? (
                      <>
                        <img src={form.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white">
                          <span className="material-symbols-outlined text-2xl mb-1">edit</span>
                          <p className="text-[10px] font-bold">Thay đổi</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#16a34a] transition-colors">upload_file</span>
                        <p className="text-[11px] text-slate-500 text-center px-2 font-medium leading-tight mt-1">Kéo thả tải lên<br />hoặc click để chọn</p>
                      </>
                    )}
                    <input id="fileInput" type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setForm(f => ({ ...f, image_url: ev.target.result }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                </div>

                {/* Main fields (Name, Category, Price) */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4 sm:mb-0">
                    <label className="text-[12px] font-bold text-slate-700 block">Tên Phần Thưởng</label>
                    <input className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-[13px] text-slate-800 placeholder-slate-400 focus:border-[#16a34a] outline-none transition-all shadow-sm"
                      placeholder="VD: Voucher Trà Sữa 20k" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">DANH MỤC</label>
                        <button type="button" onClick={() => setShowNewCatInline(v => !v)}
                          className="text-[10px] font-bold text-[#16a34a] flex items-center hover:underline">
                          <span className="material-symbols-outlined text-[12px] mr-0.5">{showNewCatInline ? 'remove' : 'add'}</span>
                          {showNewCatInline ? 'Đóng' : 'Tạo mới'}
                        </button>
                      </div>

                      {showNewCatInline && (
                        <div className="absolute bottom-full left-0 right-0 z-20 mb-1 rounded-xl bg-white p-3 space-y-2 border border-slate-200 shadow-xl">
                          <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">add_circle</span>Danh mục mới
                          </p>
                          <input className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[12px] outline-none focus:border-[#16a34a]"
                            placeholder="Tên danh mục..." required={showNewCatInline}
                            value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))} />
                          <button type="button"
                            onClick={async () => {
                              if (!newCat.name) return showToast('⚠️ Nhập tên danh mục')
                              setBusy('catInline')
                              try {
                                const created = await api('/reward-categories', { method: 'POST', body: JSON.stringify(newCat) })
                                showToast('✅ Đã tạo danh mục')
                                setNewCat({ name: '', description: '' })
                                setShowNewCatInline(false)
                                load()
                                setForm(f => ({ ...f, category_id: created.id }))
                              } catch (e) { showToast('❌ Lỗi khi thêm') } finally { setBusy(null) }
                            }}
                            disabled={busy === 'catInline'}
                            className="w-full py-1.5 rounded-lg bg-[#16a34a] text-white font-bold text-[11px] disabled:opacity-50">
                            {busy === 'catInline' ? 'Đang lưu...' : 'Lưu & Chọn'}
                          </button>
                        </div>
                      )}

                      <div className="relative">
                        <select className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-[13px] font-medium text-slate-800 focus:border-[#16a34a] outline-none appearance-none transition-all shadow-sm"
                          value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                          <option value="">— Chọn danh mục —</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-slate-700 block">Giá Trị (UGC)</label>
                      <input className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 focus:border-[#16a34a] outline-none transition-all shadow-sm"
                        type="number" min="1" placeholder="500" value={form.cost_credits} onChange={e => setForm(f => ({ ...f, cost_credits: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-700 block">Mô Tả Chi Tiết</label>
                <textarea className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[13px] text-slate-800 placeholder-slate-400 focus:border-[#16a34a] outline-none h-[88px] resize-none transition-all shadow-sm"
                  placeholder="Nhập mô tả chi tiết và điều kiện áp dụng..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {/* Right Column: Advanced settings + Buttons */}
            <div className="flex flex-col h-full">
              <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">CÀI ĐẶT NÂNG CAO</p>

                <div className="grid grid-cols-2 gap-6">
                  {/* Cột 1 */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#16a34a]">calendar_add_on</span>
                        Thời gian bắt đầu
                      </label>
                      <input type="date" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-[13px] text-slate-800 focus:border-[#16a34a] outline-none transition-all shadow-sm"
                        value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">group</span>
                        Giới hạn mỗi sinh viên
                        <span className="text-[9px] font-normal text-slate-400 ml-1">(Lượt đổi)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setForm(f => ({ ...f, limit_per_student: Math.max(1, (Number(f.limit_per_student) - 1)).toString() }))}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 font-black text-lg hover:bg-slate-50 flex items-center justify-center shrink-0 shadow-sm">−</button>
                        <input type="number" min="1" max="99"
                          className="flex-1 w-full h-10 bg-white border border-slate-200 rounded-xl px-2 text-[14px] font-black text-slate-800 text-center focus:border-[#16a34a] outline-none shadow-sm"
                          value={form.limit_per_student} onChange={e => setForm(f => ({ ...f, limit_per_student: e.target.value }))} />
                        <button type="button" onClick={() => setForm(f => ({ ...f, limit_per_student: Math.min(99, (Number(f.limit_per_student) + 1)).toString() }))}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 font-black text-lg hover:bg-slate-50 flex items-center justify-center shrink-0 shadow-sm">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2 */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-rose-500">event_busy</span>
                        Thời gian kết thúc
                      </label>
                      <input type="date" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-[13px] text-slate-800 focus:border-[#16a34a] outline-none transition-all shadow-sm"
                        value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">visibility</span>
                        Trạng thái hiển thị
                      </label>
                      <div className="flex gap-2 h-10 items-center">
                        {[{ val: 'active', label: 'Công khai', style: 'bg-[#e2f3e9] text-[#16a34a] border-[#16a34a]' },
                        { val: 'inactive', label: 'Bản nháp', style: 'bg-slate-50 text-slate-600 border-slate-200' }].map(s => (
                          <label key={s.val} className={`flex-1 flex items-center justify-center h-full rounded-xl border cursor-pointer transition-all shadow-sm ${form.status === s.val ? s.style + ' font-bold ring-2 ring-[#16a34a]/20' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>
                            <input type="radio" name="status" value={s.val} checked={form.status === s.val} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="hidden" />
                            <span className="text-[12px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">{s.val === 'active' ? 'public' : 'draft'}</span>
                              {s.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }} className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors shadow-sm">
                  Hủy bỏ
                </button>
                <button type="submit" disabled={busy === 'create'} className="px-8 py-3 rounded-xl bg-[#16a34a] text-white font-bold text-[13px] shadow-md hover:bg-[#15803d] active:scale-[0.98] transition-all">
                  {busy === 'create' ? 'Đang xử lý...' : (editingId ? 'Cập Nhật' : 'Tạo Phần Thưởng')}
                </button>
              </div>
            </div>
            
          </form>
        </div>
      </div>
    </main>
  )
}
