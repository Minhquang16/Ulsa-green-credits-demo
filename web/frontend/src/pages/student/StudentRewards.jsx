import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/student/student-rewards.css'

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
}

function DebounceInput({ value: initialValue, onChange, delay = 500, ...props }) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, delay)
    return () => clearTimeout(timeout)
  }, [value, delay, onChange])

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

export default function StudentRewards() {
  const { api, user } = useAuth()
  const { showToast } = useToast()

  // State
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState([])
  const [categories, setCategories] = useState([])
  const [balance, setBalance] = useState(null)
  const [history, setHistory] = useState([])
  const [memberLevel, setMemberLevel] = useState(null)
  const [busy, setBusy] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState('newest')

  // Modals
  const [showConfirm, setShowConfirm] = useState(null) // holds reward object
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestContent, setSuggestContent] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [catsRes, balRes, histRes, lvlRes] = await Promise.all([
        api('/reward-categories'),
        api('/wallet/balance'),
        api('/rewards/history'),
        api('/rewards/member-level')
      ])
      if (Array.isArray(catsRes)) setCategories(catsRes)
      if (balRes?.balance !== undefined) setBalance(balRes.balance)
      if (Array.isArray(histRes)) setHistory(histRes)
      if (lvlRes?.level) setMemberLevel(lvlRes)
    } catch (e) {
      showToast('❌ Lỗi tải dữ liệu cá nhân')
    } finally {
      setLoading(false)
    }
  }, [api, showToast])

  const loadRewards = useCallback(async () => {
    try {
      const q = new URLSearchParams()
      if (search) q.append('search', search)
      if (categoryId) q.append('category', categoryId)
      if (sort) q.append('sort', sort)

      const r = await api(`/rewards?${q.toString()}`)
      if (Array.isArray(r)) setRewards(r)
    } catch (e) {
      showToast('❌ Lỗi tải danh sách ưu đãi')
    }
  }, [api, search, categoryId, sort, showToast])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadRewards() }, [loadRewards])

  async function handleRedeemConfirm() {
    const r = showConfirm
    if (!r) return
    if (balance < r.cost_credits) {
      showToast('⚠️ Bạn không đủ số dư UGC!')
      setShowConfirm(null)
      return
    }

    setBusy(r.id)
    setShowConfirm(null)
    try {
      await api(`/rewards/${r.id}/redeem`, { method: 'POST' })
      showToast(`🎁 Đã đổi thành công "${r.title}"!`)
      // Refresh user specific data and rewards stock
      loadData()
      loadRewards()
    } catch (err) {
      showToast(`❌ Lỗi đổi quà: ${err.message || 'Thử lại sau'}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleSuggestSubmit(e) {
    e.preventDefault()
    if (!suggestContent.trim() || suggestContent.length < 5) {
      showToast('⚠️ Vui lòng nhập chi tiết đề xuất (ít nhất 5 ký tự)')
      return
    }
    setBusy('suggest')
    try {
      await api('/rewards/suggest', { 
        method: 'POST', 
        body: JSON.stringify({ content: suggestContent })
      })
      showToast('💡 Đã gửi đề xuất thành công! Cảm ơn bạn.')
      setShowSuggest(false)
      setSuggestContent('')
    } catch (err) {
      showToast('❌ Lỗi gửi đề xuất')
    } finally {
      setBusy(null)
    }
  }

  function getLevelIcon(level) {
    if (level === 'Diamond') return { i: 'diamond', color: 'text-purple-500', bg: 'bg-purple-100' }
    if (level === 'Emerald') return { i: 'diamond', color: 'text-[#0f9d58]', bg: 'bg-[#0f9d58]' }
    if (level === 'Gold') return { i: 'workspace_premium', color: 'text-yellow-500', bg: 'bg-yellow-500' }
    if (level === 'Silver') return { i: 'military_tech', color: 'text-gray-400', bg: 'bg-gray-400' }
    return { i: 'stars', color: 'text-amber-700', bg: 'bg-amber-700' }
  }

  const lvlProps = memberLevel ? getLevelIcon(memberLevel.level) : { i: 'help', color: 'text-gray-400', bg: 'bg-gray-400' }

  // Quick map category icon
  function getCatIcon(name) {
    const n = (name || '').toLowerCase()
    if (n.includes('voucher')) return 'local_activity'
    if (n.includes('đồ dùng') || n.includes('vật phẩm')) return 'inventory_2'
    if (n.includes('xe') || n.includes('giao thông')) return 'directions_bus'
    if (n.includes('quà')) return 'redeem'
    return 'apps'
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 animate-in font-sans bg-[#f8fcf9] min-h-screen relative">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="text-[#0f9d58] flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px]">redeem</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">Đổi ưu đãi xanh</h1>
            <p className="text-[13px] text-gray-500 font-medium">Quy đổi UGC của bạn thành những phần thưởng ý nghĩa và thiết thực.</p>
          </div>
        </div>

        {/* Balance & Level */}
        <div className="flex items-center divide-x divide-gray-100 bg-white px-2 py-3 rounded-2xl border border-gray-100 shadow-sm w-full lg:w-auto">
          <div className="px-8 flex flex-col items-center">
            <p className="text-[11px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Số dư UGC hiện tại</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#fbbc05] rounded-full flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[16px]">eco</span>
              </div>
              <p className="text-2xl font-black text-[#0f9d58]">
                {loading ? '...' : (balance || 0)}<span className="text-[11px] text-gray-400 font-bold ml-1">UGC</span>
              </p>
            </div>
          </div>
          <div className="px-8 flex flex-col items-center">
            <p className="text-[11px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Cấp độ thành viên</p>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 ${lvlProps.bg} rounded-md rotate-45 flex items-center justify-center shadow-sm`}>
                <span className={`material-symbols-outlined ${memberLevel?.level === 'Diamond' ? 'text-purple-600' : 'text-white'} -rotate-45 text-[16px]`}>{lvlProps.i}</span>
              </div>
              <div className="flex flex-col">
                <p className={`text-lg font-black ${lvlProps.color} leading-tight`}>{loading ? '...' : (memberLevel?.level || 'Bronze')}</p>
                {memberLevel?.nextLevelScore && (
                  <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                    {memberLevel.totalEarned}/{memberLevel.nextLevelScore} UGC
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex flex-col xl:flex-row gap-8">

        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Search & Filter Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[250px] relative bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
              <DebounceInput
                className="w-full h-11 bg-transparent border-none pl-12 pr-4 text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-gray-50 transition-colors"
                placeholder="Tìm kiếm ưu đãi theo tên hoặc mô tả..."
                value={search}
                onChange={setSearch}
              />
            </div>
            
            <div className="relative group">
              <select 
                className="appearance-none flex items-center gap-2 px-4 h-11 bg-white border border-gray-100 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer pr-10 focus:outline-none"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="material-symbols-outlined text-[18px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>

            <div className="relative group">
              <select 
                className="appearance-none flex items-center gap-2 px-4 h-11 bg-white border border-gray-100 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer pr-10 focus:outline-none"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Sắp xếp: Mới nhất</option>
                <option value="popular">Phổ biến nhất</option>
                <option value="price_asc">Giá: Thấp đến cao</option>
                <option value="price_desc">Giá: Cao đến thấp</option>
              </select>
              <span className="material-symbols-outlined text-[18px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">swap_vert</span>
            </div>
          </div>

          {/* Category Pills (Optional quick filters) */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button 
              onClick={() => setCategoryId('')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5 ${categoryId === '' ? 'bg-[#0f9d58] text-white shadow-sm shadow-green-200' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span> Tất cả
            </button>
            {categories.slice(0, 5).map(cat => (
              <button 
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5 ${categoryId === cat.id ? 'bg-[#0f9d58] text-white shadow-sm shadow-green-200' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[16px]">{getCatIcon(cat.name)}</span> {cat.name}
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {!loading && rewards.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">search_off</span>
                <p className="font-medium">Không tìm thấy ưu đãi nào phù hợp.</p>
              </div>
            )}
            
            {loading && [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-[320px]">
                <Skeleton className="h-[180px] w-full rounded-none" />
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <div className="mt-auto flex justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </div>
            ))}

            {!loading && rewards.map((r, i) => {
              const inactive = r.stock <= 0 || r.status !== 'active'
              const badgeType = i % 3 === 0 ? 'HOT' : (i % 4 === 0 ? 'NEW' : null)

              return (
                <article key={r.id} className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col ${inactive ? 'opacity-70 grayscale-[30%]' : ''}`}>
                  <div className="relative h-[180px] bg-gray-50 overflow-hidden">
                    <img
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      src={r.image_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'}
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {badgeType && !inactive && (
                      <div className={`absolute top-3 left-3 px-2 py-0.5 rounded shadow-sm text-[10px] font-black tracking-widest text-white ${badgeType === 'HOT' ? 'bg-[#ea4335]' : 'bg-[#0f9d58]'}`}>
                        {badgeType}
                      </div>
                    )}
                    {inactive && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded shadow-sm text-[10px] font-black tracking-widest text-white bg-gray-500">
                        HẾT HÀNG
                      </div>
                    )}
                    {r.category_name && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded shadow-sm text-[10px] font-black tracking-widest text-gray-700 bg-white/90 backdrop-blur">
                        {r.category_name}
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug line-clamp-1" title={r.title}>{r.title}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed" title={r.description}>
                      {r.description || 'Chưa có mô tả chi tiết.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[#0f9d58]">
                        <span className="material-symbols-outlined text-[16px]">eco</span>
                        <p className={`text-[13px] font-bold ${inactive ? 'text-gray-400' : ''}`}>{r.cost_credits} UGC</p>
                      </div>
                      <button
                        onClick={() => setShowConfirm(r)}
                        disabled={inactive || busy === r.id}
                        className={`px-4 py-1.5 rounded font-bold text-[11px] transition-colors ${inactive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#0f9d58] text-white hover:bg-[#0b8043]'}`}
                      >
                        {busy === r.id ? '...' : 'Đổi ngay'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="w-full xl:w-[320px] flex flex-col gap-6 shrink-0">

          {/* Lịch sử đổi thưởng */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[#0f9d58]">history</span>
                Lịch sử đổi thưởng
              </h3>
              {history.length > 0 && (
                <button className="text-[10px] text-[#0f9d58] font-bold hover:underline">Xem tất cả</button>
              )}
            </div>
            
            {loading && <div className="space-y-4">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-10"/>)}</div>}
            
            {!loading && history.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-4">Bạn chưa đổi phần thưởng nào.</p>
            )}

            <div className="flex flex-col gap-4">
              {!loading && history.slice(0, 5).map((h, i) => {
                const dt = new Date(h.created_at)
                return (
                  <div key={h.id || i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border bg-green-50 border-green-100 overflow-hidden">
                      {h.image_url 
                        ? <img src={h.image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="material-symbols-outlined text-[16px] text-[#0f9d58]">redeem</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-xs font-bold text-gray-900 truncate" title={h.title}>{h.title}</p>
                        <span className="text-[10px] font-bold text-red-500 whitespace-nowrap ml-2">-{h.cost_credits} UGC</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-gray-400">{dt.toLocaleDateString('vi-VN')} {dt.getHours()}:{dt.getMinutes().toString().padStart(2, '0')}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-[#0f9d58] bg-green-50">Thành công</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hướng dẫn */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-4">
              <span className="material-symbols-outlined text-[#0f9d58]">help</span>
              Hướng dẫn đổi ưu đãi
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                'Chọn phần thưởng bạn muốn đổi.',
                'Nhấn "Đổi ngay" để xác nhận.',
                'Kiểm tra thông tin và xác nhận giao dịch.',
                'Phần thưởng sẽ được lưu vào lịch sử của bạn.'
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-gray-600 leading-relaxed font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#0f9d58] text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 shadow-sm shadow-green-200">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Idea Submission Banner */}
          <div className="bg-gradient-to-br from-[#f0f8f1] to-[#e6f4ea] rounded-[24px] border border-green-100 p-5 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-bold text-[#0f9d58] text-sm mb-1.5">Bạn có ý tưởng ưu đãi mới?</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-4 max-w-[70%] font-medium">
                Chia sẻ với chúng tôi để xây dựng cộng đồng xanh hơn!
              </p>
              <button 
                onClick={() => setShowSuggest(true)}
                className="text-[11px] font-bold text-[#0f9d58] bg-white px-3 py-1.5 rounded border border-green-200 shadow-sm hover:shadow transition-shadow flex items-center gap-1 w-max group-hover:-translate-y-0.5 transition-transform"
              >
                Gửi đề xuất <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
            <div className="absolute right-[-15px] bottom-[-15px] opacity-70 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
              <span className="material-symbols-outlined text-[100px] text-green-200 drop-shadow-sm">emoji_objects</span>
            </div>
          </div>

        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Modal Đổi quà */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-50 text-[#0f9d58] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <span className="material-symbols-outlined text-[32px]">redeem</span>
            </div>
            <h3 className="text-xl font-black text-center text-gray-900 mb-2">Xác nhận đổi thưởng</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              Bạn có chắc chắn muốn dùng <strong className="text-red-500">{showConfirm.cost_credits} UGC</strong> để đổi lấy <strong className="text-gray-900">{showConfirm.title}</strong> không?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleRedeemConfirm}
                className="flex-1 py-3 bg-[#0f9d58] text-white font-bold rounded-xl text-sm hover:bg-[#0b8043] shadow-lg shadow-green-200 transition-colors"
              >
                Xác nhận đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gửi đề xuất */}
      {showSuggest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fbbc05]">emoji_objects</span>
                Gửi đề xuất ưu đãi
              </h3>
              <button onClick={() => setShowSuggest(false)} className="text-gray-400 hover:text-gray-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSuggestSubmit}>
              <textarea 
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#0f9d58] focus:ring-1 focus:ring-[#0f9d58] resize-none mb-4"
                placeholder="Bạn muốn có phần thưởng gì trong hệ thống UGC? Hãy mô tả chi tiết..."
                value={suggestContent}
                onChange={e => setSuggestContent(e.target.value)}
                autoFocus
              ></textarea>
              <button 
                type="submit"
                disabled={busy === 'suggest'}
                className="w-full py-3 bg-[#0f9d58] text-white font-bold rounded-xl text-sm hover:bg-[#0b8043] shadow-lg shadow-green-200 transition-colors disabled:opacity-50"
              >
                {busy === 'suggest' ? 'Đang gửi...' : 'Gửi ý tưởng'}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
