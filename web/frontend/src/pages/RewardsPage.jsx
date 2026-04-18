import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function RewardsPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(null)
  const [busy, setBusy] = useState(false)
  const [retireForm, setRetireForm] = useState({ amount: '', reason: '' })

  async function load() {
    try {
      const b = await api('/wallet/balance')
      setBalance(b.balance)
      const r = await api('/rewards')
      setRewards(r)
    } catch (e) {
      showToast('❌ Lỗi tải dữ liệu marketplace')
    }
  }

  useEffect(() => { load() }, [])

  async function handleRedeem(r) {
    if (balance < r.cost) {
      showToast('⚠️ Bạn không đủ tín chỉ xanh!')
      return
    }
    setBusy(r.id)
    try {
      await api(`/rewards/${r.id}/redeem`, { method: 'POST' })
      showToast(`🎁 Đã đổi "${r.title}"! Giao dịch BURN ghi lên blockchain.`)
      load()
    } catch (e) {
      showToast('❌ Lỗi khi đổi quà')
    } finally {
      setBusy(null)
    }
  }

  async function handleRetire(e) {
    e.preventDefault()
    if (!retireForm.amount || retireForm.amount < 1) {
        showToast('⚠️ Nhập số lượng tín chỉ cần retire.')
        return
    }
    setBusy(true)
    try {
        await api('/wallet/burn', {
            method: 'POST',
            body: JSON.stringify(retireForm)
        })
        showToast(`🔥 Đã retire ${retireForm.amount} UGC vĩnh viễn!`)
        setRetireForm({ amount: '', reason: '' })
        load()
    } catch (e) {
        showToast('❌ Lỗi khi thực hiện retire')
    } finally {
        setBusy(false)
    }
  }

  return (
    <main className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 animate-in">
      
      {/* Rewards Hero (1:1 Prototype) */}
      <section className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Sustainable Marketplace</p>
          <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface mb-6">Đổi Ưu đãi <span className="text-primary">Xanh.</span></h1>
          <p className="text-on-surface-variant text-base leading-relaxed max-w-lg mb-4">
            Chuyển tín chỉ xanh của bạn thành các phần thưởng độc quyền. 
            <em className="block text-sm opacity-60 mt-2">Reward là quyền lợi nội bộ, không quy đổi tiền mặt.</em>
          </p>
          {user.role === 'admin' && (
            <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">info</span>
              📌 Quản lý danh sách phần thưởng trong tab hệ thống.
            </div>
          )}
        </div>

        {/* Balance Summary (1:1 Prototype) */}
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 flex justify-around items-center shadow-xl shadow-black/5">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">Số dư của bạn</p>
            <p className="text-4xl font-headline font-black text-on-surface">{balance === null ? '...' : balance} UGC</p>
          </div>
          <div className="w-px h-12 bg-outline-variant/20"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">Cấp độ</p>
            <p className="text-4xl font-headline font-black text-primary">Emerald</p>
          </div>
        </div>
      </section>

      {/* Rewards Grid (1:1 Prototype Card Structure) */}
      <section className="mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {rewards.map(r => (
            <RewardCard key={r.id} r={r} userRole={user.role} onRedeem={handleRedeem} busy={busy === r.id} />
          ))}
        </div>
      </section>

      {/* Retire Section (1:1 Prototype) */}
      {user.role === 'student' && (
        <section className="mb-12">
          <div className="bg-surface-container-low rounded-[2rem] p-10 border border-outline-variant/10 relative overflow-hidden flex flex-col lg:flex-row gap-12 shadow-2xl shadow-black/5">
            <div className="lg:flex-1 relative z-10">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-4">Retire tín chỉ</h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                    Burn type = RETIRE. Dùng khi tín chỉ đã "ghi nhận / khóa sổ". Hành động này sẽ ghi giao dịch BURN (RETIRE) lên blockchain và không thể hoàn tác.
                </p>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#161d16]/60 bg-surface-container-high px-4 py-2 rounded-full">
                        <span className="material-symbols-outlined text-primary text-base">verified</span> Xác nhận Blockchain
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#161d16]/60 bg-surface-container-high px-4 py-2 rounded-full">
                        <span className="material-symbols-outlined text-primary text-base">public</span> Ghi nhận vĩnh viễn
                    </div>
                </div>
            </div>
            
            <form className="lg:w-80 space-y-4 relative z-10" onSubmit={handleRetire}>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Amount (credits)</label>
                    <div className="relative">
                        <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
                            type="number" min="1" max={balance || 1} placeholder="1"
                            value={retireForm.amount} onChange={e => setRetireForm(f => ({...f, amount: e.target.value}))}/>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-on-surface-variant/40">UGC</span>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block px-1">Reason</label>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-xs text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
                        placeholder="Lý do khóa sổ..." type="text"
                        value={retireForm.reason} onChange={e => setRetireForm(f => ({...f, reason: e.target.value}))}/>
                </div>
                <button className="w-full bg-[#161d16] text-[#edf6ea] font-headline font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    type="submit" disabled={busy}>
                    {busy ? 'Đang xử lý...' : 'Retire Tín chỉ'}
                </button>
                <p className="text-[10px] text-center text-error font-bold opacity-60">Hành động không thể hoàn tác.</p>
            </form>
            <div className="absolute top-0 right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          </div>
        </section>
      )}
    </main>
  )
}

function RewardCard({ r, userRole, onRedeem, busy }) {
  const isInactive = r.stock <= 0 || r.status !== 'active'
  const imgUrl = r.image_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVLas-0p_8LS621wPq7p3fazbwxRKGDGUPqbpaxyx0zXEJWc4o943CB5q-nSS1NDQtG6_wb1gF5i6uOHP8pceeDKRptMEw9sozZMd720SVY_gfBVt_RgSh2PutsDpdjl1veWlyJccX89edsDBvr_2b6U6FnJhPmgp4hJhIQ79-T6WyIk_yr6mixg9rJfAEC89NVsWgmBRTkkpvZJYPLQVCLyiCRnjEBaCfF9JdweFun46utWctBWb565fZm87aee6c1L1UWO2Tg6w'

  return (
    <article className={`group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-card border border-outline-variant/10 hover:-translate-y-2 transition-all ${isInactive ? 'opacity-70 contrast-75' : ''}`}>
      <div className="relative h-60 overflow-hidden">
        <img alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={imgUrl}/>
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${isInactive ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}>
                {r.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-surface-container-high text-on-surface-variant ${r.stock <= 0 ? 'text-error' : ''}`}>
                Stock: {r.stock > 0 ? r.stock : 'Hết hàng'}
            </span>
        </div>
      </div>
      
      <div className="p-8">
        <h3 className="font-headline text-xl font-bold text-on-surface mb-2">{r.title}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-8">{r.description}</p>
        
        <div className="flex justify-between items-center border-t border-outline-variant/10 pt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">Credits cần</p>
            <p className={`text-2xl font-headline font-black ${isInactive ? 'text-[#161d16]/30' : 'text-primary'}`}>{r.cost} UGC</p>
          </div>
          {userRole === 'student' && (
            <button onClick={() => onRedeem(r)} disabled={isInactive || busy}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${isInactive ? 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed' : 'btn--primary active:scale-95'}`}>
              {busy ? 'Redeeming...' : isInactive ? 'Hết hàng' : 'Redeem (burn)'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
