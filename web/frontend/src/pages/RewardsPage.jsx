import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

const DEFAULT_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVLas-0p_8LS621wPq7p3fazbwxRKGDGUPqbpaxyx0zXEJWc4o943CB5q-nSS1NDQtG6_wb1gF5i6uOHP8pceeDKRptMEw9sozZMd720SVY_gfBVt_RgSh2PutsDpdjl1veWlyJccX89edsDBvr_2b6U6FnJhPmgp4hJhIQ79-T6WyIk_yr6mixg9rJfAEC89NVsWgmBRTkkpvZJYPLQVCLyiCRnjEBaCfF9JdweFun46utWctBWb565fZm87aee6c1L1UWO2Tg6w'

const EMPTY_FORM = { title: '', description: '', cost_credits: '', stock: '', category_id: '', limit_per_student: '1', status: 'active', start_date: '', expiry_date: '', image_url: '' }

export default function RewardsPage() {
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
    const matchStatus = filterStatus === 'all' || (filterStatus === 'low' ? r.stock <= 5 : r.status === filterStatus)
    const matchCategory = filterCategory === 'all' || r.category === filterCategory
    const matchPrice = filterPrice === 'all' ||
      (filterPrice === 'lt100' ? Number(r.cost_credits) < 100 :
        filterPrice === '100-500' ? Number(r.cost_credits) >= 100 && Number(r.cost_credits) <= 500 :
          Number(r.cost_credits) > 500)
    return matchSearch && matchStatus && matchCategory && matchPrice
  })

  const popularName = stats.most_popular?.title || '—'

  if (user.role !== 'admin') return <StudentView rewards={filtered} balance={balance} onRedeem={handleRedeem} busy={busy} retireForm={retireForm} setRetireForm={setRetireForm} onRetire={handleRetire} search={search} setSearch={setSearch} />

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Quản lý Ưu đãi <span className="text-primary">Xanh</span></h1>
          <p className="text-on-surface-variant text-sm mt-1">Quản lý kho quà tặng, voucher và các phần thưởng dành cho sinh viên tham gia các hoạt động bảo vệ môi trường.</p>
        </div>
        <button onClick={() => document.getElementById('create-form').scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl editorial-gradient text-on-primary font-bold text-sm shadow-lg whitespace-nowrap">
          <span className="material-symbols-outlined text-base">add</span> Thêm Ưu Đãi Mới
        </button>
      </div>

      {/* Stats — real-time from backend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tổng Ưu Đãi', value: stats.total, sub: `${rewards.length} hiển thị`, color: 'text-primary' },
          { label: 'Tổng UGC Đã Dùng', value: `${Number(stats.total_ugc_redeemed).toLocaleString()} UGC`, sub: 'Từ lịch sử đổi', color: 'text-on-surface' },
          { label: 'Phổ Biến Nhất', value: popularName, sub: stats.most_popular ? `${stats.most_popular.redeem_count} lượt đổi` : 'Chưa có', color: 'text-on-surface' },
          { label: 'Sắp Hết Kho', value: stats.low_stock, sub: 'vật phẩm (≤5)', color: 'text-tertiary' },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/5 shadow-md flex flex-col justify-center min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">{s.label}</p>
            <p className={`text-2xl font-headline font-black ${s.color} mb-1 truncate`} title={typeof s.value === 'string' ? s.value : undefined}>{s.value}</p>
            <p className="text-xs text-on-surface-variant font-medium">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input className="w-full h-11 bg-surface-container-high border-none rounded-xl pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none"
            placeholder="Tìm tên phần thưởng..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="h-11 bg-surface-container-high border-none rounded-xl pl-4 pr-10 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="h-11 bg-surface-container-high border-none rounded-xl pl-4 pr-10 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
          value={filterPrice} onChange={e => setFilterPrice(e.target.value)}>
          <option value="all">Mức giá UGC</option>
          <option value="lt100">Dưới 100</option>
          <option value="100-500">100 – 500</option>
          <option value="gt500">Trên 500</option>
        </select>
        <button onClick={() => setShowCatMgmt(!showCatMgmt)}
          className={`h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${showCatMgmt ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          <span className="material-symbols-outlined text-base">category</span>
          Quản lý danh mục
        </button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {filtered.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-on-surface-variant/50">
            <span className="material-symbols-outlined text-5xl mb-3 block">inventory_2</span>
            <p className="font-bold mb-4 text-base text-on-surface">Chưa có phần thưởng nào</p>
            <button onClick={() => document.getElementById('create-form').scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2.5 rounded-xl editorial-gradient text-on-primary font-bold text-sm shadow-md hover:-translate-y-0.5 transition-transform">
              Tạo ngay
            </button>
          </div>
        )}
        {filtered.map(r => (
          <article key={r.id} className="group bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-[0_4px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col w-[258px] h-[365px] mx-auto">
            {/* Media Area - 2/3 Height (243px) */}
            <div className="relative h-[243px] overflow-hidden shrink-0">
              <img alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1500ms]" src={r.image_url || DEFAULT_IMG} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <div className="px-3 py-1 rounded-full bg-primary/90 backdrop-blur-md text-white text-[10px] font-bold tracking-tight shadow-lg">
                  {r.cost_credits} UGC
                </div>
                {r.status === 'inactive' && (
                  <div className="px-2.5 py-1 rounded-full bg-slate-800/80 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-tighter">
                    Bản nháp
                  </div>
                )}
              </div>

              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-[8px] font-black uppercase tracking-widest border border-white/20">
                  {r.category_name || 'Voucher'}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 text-white">
                <h3 className="text-[15px] font-bold leading-tight truncate drop-shadow-md">{r.title}</h3>
              </div>
            </div>

            {/* Content Area - 1/3 Height (122px) */}
            <div className="p-3 flex-1 flex flex-col justify-between bg-white">
              {/* Compact Stats Grid - Human Friendly */}
              <div className="grid grid-cols-3 gap-1 py-2.5 px-1 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                <div className="text-center border-r border-slate-200/40">
                  <p className="text-[8px] uppercase font-bold text-slate-400 leading-none mb-1.5">Còn lại</p>
                  <p className={`text-[12px] font-black ${r.stock <= 5 ? 'text-rose-500' : 'text-slate-700'}`}>
                    {r.stock}<span className="text-[8px] ml-0.5 font-bold opacity-60">món</span>
                  </p>
                </div>
                <div className="text-center border-r border-slate-200/40">
                  <p className="text-[8px] uppercase font-bold text-slate-400 leading-none mb-1.5">Mỗi bạn</p>
                  <p className="text-[12px] font-black text-slate-700">
                    {r.limit_per_student || 1}<span className="text-[8px] ml-0.5 font-bold opacity-60">lượt</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] uppercase font-bold text-slate-400 leading-none mb-1.5">Hạn dùng</p>
                  <p className="text-[11px] font-black text-slate-700 truncate px-0.5 leading-tight">
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

              {/* Minimal Actions */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => handleEditClick(r)} className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                  <span className="text-[10px] font-black uppercase tracking-tight">Cập nhật</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  disabled={busy === r.id}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 disabled:opacity-30 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {busy === r.id ? 'sync' : 'delete_forever'}
                  </span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Create / Edit Form */}
      <div id="create-form" className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-xl shadow-black/5">
        <h2 className="font-headline text-2xl font-extrabold text-on-surface mb-1">{editingId ? 'Cập Nhật Phần Thưởng' : 'Tạo Phần Thưởng Mới'}</h2>
        <p className="text-sm text-on-surface-variant mb-6">Điền thông tin chi tiết để {editingId ? 'cập nhật' : 'thêm'} ưu đãi vào hệ thống.</p>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Image upload */}
            <div className="lg:col-span-1 space-y-2">
              <label className="text-sm font-semibold capitalize text-on-surface-variant block px-1">Hình ảnh minh họa</label>
              <div
                onClick={() => document.getElementById('fileInput').click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setForm(f => ({ ...f, image_url: ev.target.result }));
                    reader.readAsDataURL(file);
                  }
                }}
                className="group relative h-48 lg:h-[188px] border-2 border-dashed border-outline-variant/40 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all overflow-hidden"
              >
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 text-white">
                      <span className="material-symbols-outlined text-3xl">edit</span>
                      <p className="text-[11px] font-bold">Thay đổi ảnh</p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 group-hover:text-primary/60 transition-colors">upload_file</span>
                    <p className="text-[11px] text-on-surface-variant/60 text-center px-4 leading-tight">Kéo thả tải lên<br />hoặc click để chọn</p>
                  </>
                )}
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setForm(f => ({ ...f, image_url: ev.target.result }));
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* Main fields */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-semibold capitalize text-on-surface-variant block px-1">Tên phần thưởng</label>
                <input className="w-full h-11 bg-surface-container-high border-none rounded-xl px-4 text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="VD: Voucher Trà Sữa 20k" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Danh mục</label>
                  <button type="button" onClick={() => setShowNewCatInline(v => !v)}
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline">
                    <span className="material-symbols-outlined text-xs">{showNewCatInline ? 'remove' : 'add'}</span>
                    {showNewCatInline ? 'Đóng' : 'Tạo mới'}
                  </button>
                </div>
                
                {showNewCatInline && (
                  <div className="rounded-xl bg-[#eef5ed]/50 p-3 space-y-3 border border-primary/10 mb-2">
                    <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">eco</span>Danh mục mới
                    </p>
                    <div className="space-y-2">
                      <input className="w-full bg-surface-container border-none rounded-lg py-2.5 px-3 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                        placeholder="Tên danh mục (VD: Lưu niệm)" required={showNewCatInline}
                        value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))} />
                    </div>
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
                      className="w-full py-2.5 rounded-lg bg-[#161d16] text-[#edf6ea] font-bold text-xs disabled:opacity-50 transition-transform active:scale-[0.98]">
                      {busy === 'catInline' ? 'Đang lưu...' : '✓ Tạo & chọn danh mục này'}
                    </button>
                  </div>
                )}

                <select className="w-full h-11 bg-surface-container-high border-none rounded-xl px-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 outline-none appearance-none"
                  value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— Chọn danh mục —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold capitalize text-on-surface-variant block px-1">Giá trị (UGC)</label>
                <input className="w-full h-11 bg-surface-container-high border-none rounded-xl px-4 text-sm font-bold text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none"
                  type="number" min="1" placeholder="500" value={form.cost_credits} onChange={e => setForm(f => ({ ...f, cost_credits: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold capitalize text-on-surface-variant block px-1">Số lượng kho</label>
                <input className="w-full h-11 bg-surface-container-high border-none rounded-xl px-4 text-sm font-bold text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none"
                  type="number" min="0" placeholder="100" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-semibold capitalize text-on-surface-variant block px-1">Mô tả chi tiết</label>
            <textarea className="w-full bg-surface-container-high border-none rounded-xl p-4 text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none h-28 resize-none"
              placeholder="Nhập mô tả chi tiết và điều kiện áp dụng..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Advanced settings */}
          <div className="bg-surface-container-high/30 border border-outline-variant/10 rounded-2xl p-6 space-y-6 mt-2">
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/50">Cài đặt nâng cao</p>
            
            {/* Hàng 1: Thời gian */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5 px-1">
                  <span className="material-symbols-outlined text-base text-primary/60">calendar_add_on</span>
                  Thời gian bắt đầu
                </label>
                <input type="date" className="w-full h-11 bg-white border border-outline-variant/20 rounded-xl px-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 outline-none transition-shadow"
                  value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5 px-1">
                  <span className="material-symbols-outlined text-base text-rose-400/70">event_busy</span>
                  Thời gian kết thúc
                </label>
                <input type="date" className="w-full h-11 bg-white border border-outline-variant/20 rounded-xl px-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 outline-none transition-shadow"
                  value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>

            {/* Hàng 2: Hạn mức và Trạng thái */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5 px-1">
                  <span className="material-symbols-outlined text-base text-amber-500/70">group</span>
                  Giới hạn mỗi sinh viên
                  <span className="text-[10px] font-normal opacity-50 ml-1">(Lượt đổi tối đa)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, limit_per_student: Math.max(1, (Number(f.limit_per_student) - 1)).toString() }))}
                    className="w-11 h-11 rounded-xl bg-white border border-outline-variant/20 text-on-surface font-black text-lg hover:bg-surface-container-high transition-colors flex items-center justify-center flex-shrink-0">−</button>
                  <input type="number" min="1" max="99"
                    className="flex-1 h-11 bg-white border border-outline-variant/20 rounded-xl px-3 text-sm font-black text-on-surface text-center focus:ring-2 focus:ring-primary/40 outline-none transition-shadow"
                    value={form.limit_per_student} onChange={e => setForm(f => ({ ...f, limit_per_student: e.target.value }))} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, limit_per_student: Math.min(99, (Number(f.limit_per_student) + 1)).toString() }))}
                    className="w-11 h-11 rounded-xl bg-white border border-outline-variant/20 text-on-surface font-black text-lg hover:bg-surface-container-high transition-colors flex items-center justify-center flex-shrink-0">+</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5 px-1">
                  <span className="material-symbols-outlined text-base text-primary/40">visibility</span>
                  Trạng thái hiển thị
                </label>
                <div className="flex gap-3 h-11 items-center">
                  {[{ val: 'active', label: 'Công khai', icon: 'public', style: 'bg-primary/10 text-primary border-primary/30' },
                    { val: 'inactive', label: 'Bản nháp', icon: 'draft', style: 'bg-white text-slate-500 border-outline-variant/30' }].map(s => (
                    <label key={s.val} className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all ${
                      form.status === s.val ? s.style + ' font-black shadow-sm' : 'bg-white border-outline-variant/20 text-on-surface-variant/60 hover:border-outline-variant/40'
                    }`}>
                      <input type="radio" name="status" value={s.val} checked={form.status === s.val} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="hidden" />
                      <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }} className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={busy === 'create'} className="px-8 py-3 rounded-xl editorial-gradient text-on-primary font-headline font-bold text-sm shadow-md active:scale-[0.98] transition-all">
              {busy === 'create' ? 'Đang xử lý...' : (editingId ? 'Cập Nhật' : 'Tạo Phần Thưởng')}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function StudentView({ rewards, balance, onRedeem, busy, retireForm, setRetireForm, onRetire, search, setSearch }) {
  const filtered = rewards.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()))
  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Sustainable Marketplace</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-3">Đổi Ưu đãi <span className="text-primary">Xanh.</span></h1>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-lg">Chuyển tín chỉ xanh thành các phần thưởng độc quyền. <em className="block text-xs opacity-60 mt-1">Reward là quyền lợi nội bộ, không quy đổi tiền mặt.</em></p>
        </div>
        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 flex justify-around items-center shadow-xl">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Số dư</p>
            <p className="text-3xl font-headline font-black text-on-surface">{balance ?? '...'} UGC</p>
          </div>
          <div className="w-px h-10 bg-outline-variant/20" />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Cấp độ</p>
            <p className="text-3xl font-headline font-black text-primary">Emerald</p>
          </div>
        </div>
      </section>
      <div className="relative mb-8">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input className="w-full max-w-sm bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Tìm ưu đãi..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map(r => {
            const inactive = r.stock <= 0 || r.status !== 'active'
            return (
              <article key={r.id} className={`group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-card border border-outline-variant/10 hover:-translate-y-2 transition-all ${inactive ? 'opacity-70 contrast-75' : ''}`}>
                <div className="relative h-48 overflow-hidden">
                  <img alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={r.image_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVLas-0p_8LS621wPq7p3fazbwxRKGDGUPqbpaxyx0zXEJWc4o943CB5q-nSS1NDQtG6_wb1gF5i6uOHP8pceeDKRptMEw9sozZMd720SVY_gfBVt_RgSh2PutsDpdjl1veWlyJccX89edsDBvr_2b6U6FnJhPmgp4hJhIQ79-T6WyIk_yr6mixg9rJfAEC89NVsWgmBRTkkpvZJYPLQVCLyiCRnjEBaCfF9JdweFun46utWctBWb565fZm87aee6c1L1UWO2Tg6w'} />
                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase shadow-lg ${inactive ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}>{r.status}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-1.5">{r.title}</h3>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 mb-6">{r.description}</p>
                  <div className="flex justify-between items-center border-t border-outline-variant/10 pt-5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Credits cần</p>
                      <p className={`text-xl font-headline font-black ${inactive ? 'text-on-surface-variant/30' : 'text-primary'}`}>{r.cost_credits} UGC</p>
                    </div>
                    <button onClick={() => onRedeem(r)} disabled={inactive || busy === r.id}
                      className={`px-4 py-2 rounded-xl font-bold text-[11px] transition-all ${inactive ? 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed' : 'btn--primary active:scale-95'}`}>
                      {busy === r.id ? 'Redeeming...' : inactive ? 'Hết hàng' : 'Redeem'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
