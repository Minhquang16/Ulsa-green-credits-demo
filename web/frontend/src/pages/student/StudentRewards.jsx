/**
 * StudentRewards.jsx
 * View đổi phần thưởng dành cho sinh viên.
 * Tách ra từ hàm StudentView() trong RewardsPage.jsx
 */

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import '../../styles/student/student-rewards.css'

export default function StudentRewards() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(null)
  const [busy, setBusy] = useState(null)
  const [search, setSearch] = useState('')
  const [retireForm, setRetireForm] = useState({ amount: '', reason: '' })

  async function load() {
    try {
      const r = await api('/rewards')
      setRewards(r)
      const b = await api('/wallet/balance')
      setBalance(b.balance)
    } catch { showToast('❌ Lỗi tải dữ liệu') }
  }

  useEffect(() => { load() }, [])

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

  const filtered = rewards.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 animate-in font-sans bg-[#f8fcf9] min-h-screen">

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

        {/* Balance */}
        <div className="flex items-center divide-x divide-gray-100 bg-white px-2 py-3 rounded-2xl border border-gray-100 shadow-sm w-full lg:w-auto">
          <div className="px-8 flex flex-col items-center">
            <p className="text-[11px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Số dư UGC hiện tại</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#fbbc05] rounded-full flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[16px]">eco</span>
              </div>
              <p className="text-2xl font-black text-[#0f9d58]">
                {balance ?? '...'}<span className="text-[11px] text-gray-400 font-bold ml-1">UGC</span>
              </p>
            </div>
          </div>
          <div className="px-8 flex flex-col items-center">
            <p className="text-[11px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Cấp độ thành viên</p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#0f9d58] rounded-md rotate-45 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white -rotate-45 text-[16px]">diamond</span>
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-black text-[#0f9d58] leading-tight">Emerald</p>
                <button className="text-[9px] text-[#0f9d58] font-bold hover:underline flex items-center mt-0.5">
                  Chi tiết cấp độ <span className="material-symbols-outlined text-[10px] ml-0.5">arrow_forward</span>
                </button>
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
              <input
                className="w-full h-11 bg-transparent border-none pl-12 pr-4 text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-gray-50 transition-colors"
                placeholder="Tìm kiếm ưu đãi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 h-11 bg-white border border-gray-100 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              Tất cả danh mục
              <span className="material-symbols-outlined text-[18px] text-gray-400">expand_more</span>
            </button>
            <button className="flex items-center gap-2 px-4 h-11 bg-white border border-gray-100 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[18px]">swap_vert</span>
              Sắp xếp: Mới nhất
              <span className="material-symbols-outlined text-[18px] text-gray-400">expand_more</span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { icon: 'grid_view', label: 'Tất cả', active: true },
              { icon: 'local_activity', label: 'Voucher' },
              { icon: 'inventory_2', label: 'Đồ dùng' },
              { icon: 'directions_bus', label: 'Giao thông' },
              { icon: 'redeem', label: 'Quà tặng' },
              { icon: 'apps', label: 'Khác' }
            ].map((cat, i) => (
              <button key={i} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5 ${cat.active ? 'bg-[#0f9d58] text-white shadow-sm shadow-green-200' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}>
                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400">
                <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">search_off</span>
                <p className="font-medium">Không tìm thấy ưu đãi nào.</p>
              </div>
            )}
            {filtered.map((r, i) => {
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
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug line-clamp-1">{r.title}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
                      {r.description || 'Miễn phí di chuyển toàn tuyến xe buýt trong 1 ngày.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[#0f9d58]">
                        <span className="material-symbols-outlined text-[16px]">eco</span>
                        <p className={`text-[13px] font-bold ${inactive ? 'text-gray-400' : ''}`}>{r.cost_credits} UGC</p>
                      </div>
                      <button
                        onClick={() => handleRedeem(r)}
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
              <button className="text-[10px] text-[#0f9d58] font-bold hover:underline">Xem tất cả</button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { icon: 'directions_bus', label: 'Voucher xe buýt 1 ngày', ugc: '-3 UGC', date: '12/06/2026 11:21', status: 'Thành công', ok: true },
                { icon: 'local_mall', label: 'Túi vải Think Green', ugc: '-10 UGC', date: '09/06/2026 08:45', status: 'Thành công', ok: true },
                { icon: 'menu_book', label: 'Sổ tay & Bút xanh', ugc: '-8 UGC', date: '05/06/2026 16:20', status: 'Thành công', ok: true },
                { icon: 'local_cafe', label: 'Voucher căng-tin 20%', ugc: '-6 UGC', date: '01/06/2026 12:10', status: 'Đã hủy', ok: false }
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${h.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${h.ok ? 'text-[#0f9d58]' : 'text-red-500'}`}>{h.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{h.label}</p>
                      <span className="text-[10px] font-bold text-red-500 whitespace-nowrap ml-2">{h.ugc}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-gray-400">{h.date}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${h.ok ? 'text-[#0f9d58] bg-green-50' : 'text-red-500 bg-red-50'}`}>{h.status}</span>
                    </div>
                  </div>
                </div>
              ))}
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
                'Phần thưởng sẽ được gửi qua email hoặc hiển thị trong tài khoản của bạn.'
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
              <button className="text-[11px] font-bold text-[#0f9d58] bg-white px-3 py-1.5 rounded border border-green-200 shadow-sm hover:shadow transition-shadow flex items-center gap-1 w-max group-hover:-translate-y-0.5 transition-transform">
                Gửi đề xuất <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
            <div className="absolute right-[-15px] bottom-[-15px] opacity-70 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
              <span className="material-symbols-outlined text-[100px] text-green-200 drop-shadow-sm">emoji_objects</span>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
