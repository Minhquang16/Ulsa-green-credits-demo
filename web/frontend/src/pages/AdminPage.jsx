import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [stats, setStats] = useState({ users: 4, events: 5, claims: 12, approved: 8 })
  const [tokenStats, setTokenStats] = useState({ issued: 120, burned: 45, supply: 75, contract: '0xAbCd...1234' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Forms
  const [atForm, setAtForm] = useState({ name: '', credit_amount: '', description: '' })
  const [rewardForm, setRewardForm] = useState({ title: '', description: '', cost: '', stock: '' })

  async function load() {
    try {
      const s = await api('/analytics/overview')
      setStats(s)
      const c = await api('/wallet/contract')
      const b = await api('/wallet/balance') // Mock total supply
      setTokenStats(prev => ({ ...prev, contract: c.address, supply: b.balance }))
    } catch (e) {
      showToast('⚠️ Lỗi tải dữ liệu quản trị')
    }
  }

  useEffect(() => { load() }, [])

  async function createAT(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/activity-types', { method: 'POST', body: JSON.stringify(atForm) })
      showToast('✅ Activity Type đã được tạo!')
      setAtForm({ name: '', credit_amount: '', description: '' })
      load()
    } catch (e) {
      showToast('❌ Lỗi tạo Activity Type')
    } finally {
        setBusy(false)
    }
  }

  async function createReward(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/rewards', { method: 'POST', body: JSON.stringify(rewardForm) })
      showToast('🎁 Reward đã được tạo và publish!')
      setRewardForm({ title: '', description: '', cost: '', stock: '' })
      load()
    } catch (e) {
      showToast('❌ Lỗi tạo Reward')
    } finally {
        setBusy(false)
    }
  }

  return (
    <main className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 animate-in">
      
      {/* Page Header (1:1 Prototype) */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Governance Hub</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Tổng quan Quản trị</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => showToast('Đang xuất báo cáo...')} className="btn btn--secondary px-6">Xuất báo cáo</button>
          <button onClick={() => showToast('Đang tạo keys...')} className="btn btn--primary px-6">Generate Keys</button>
        </div>
      </div>

      {/* Admin Stats (1:1 Prototype) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard label="Tổng Users" value={stats.users} trend="+8.4%" icon="group" trendColor="text-primary" />
        <StatCard label="Sự kiện" value={stats.events} trend="Đang diễn ra" icon="event_available" trendColor="text-on-surface-variant/40" />
        <StatCard label="Claims" value={stats.claims} trend="Chờ duyệt" icon="pending_actions" trendColor="text-tertiary" />
        <StatCard label="Đồ Approved" value={stats.approved} trend="UGC Credits" icon="verified_user" trendColor="text-primary" />
      </div>

      {/* Token Panel (1:1 Prototype Structure) */}
      <div className="bg-surface-container-low rounded-3xl p-10 mb-12 border border-outline-variant/10 shadow-2xl shadow-black/5 relative overflow-hidden group">
        <div className="flex flex-col lg:flex-row gap-12 relative z-10">
          <div className="lg:flex-grow">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="font-headline text-2xl font-black text-on-surface mb-1">Token stats (on-chain)</h2>
                <p className="text-xs font-mono text-primary opacity-60">Contract: <code>{tokenStats.contract}</code></p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Hardhat local</span>
            </div>

            {/* Mock Chart (1:1 Prototype Style) */}
            <div className="flex items-end gap-3 h-48 mb-10 px-4">
              <Bar h="75%" />
              <Bar h="50%" />
              <Bar h="65%" />
              <Bar h="83%" highlight />
              <Bar h="33%" />
              <Bar h="100%" current />
            </div>

            <div className="grid grid-cols-3 gap-8">
              <Metric label="Total Issued" value={`${tokenStats.issued} UGC`} />
              <Metric label="Total Burned" value={`${tokenStats.burned} UGC`} />
              <Metric label="Supply (balance)" value={`${tokenStats.supply} UGC`} primary />
            </div>
          </div>

          <div className="lg:w-80 flex flex-col justify-between">
            <div className="mb-8">
              <h3 className="font-headline text-sm font-black text-on-surface uppercase tracking-widest mb-4 opacity-40">Global Impact</h3>
              <div className="space-y-4">
                <div>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">CO₂ Offset tổng</p>
                    <p className="text-xl font-headline font-black text-on-surface">42,810 Tấn</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Dự án đang hoạt động</p>
                    <p className="text-xl font-headline font-black text-on-surface">214 Global</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-white/20">
              <img className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUV-j2VHKybDkVguFFQ7jOKsKRRgT_-PwPfiQlnsW2moWzJFPIxLZ_6XuF3_sp30Cafs9VdZY3uS7BxGm02mfgxo89VAAxCr8kH9jsB7CwL9SuXXi1VTipzDUWsG23553M4o8fLirOMxP9jVHgY35UiIAiWqR8P2YwijHt_8LSwwCdK9hSL_O4vf-Ba3JnPaz09Lgg1aqNLWhEhEOo-VmNMjKJXfjsUFJUYd7LcrgBtIkme7TKGeoERzesG6PTNOE1sVteTQYJgH0"
                alt="Amazon"/>
              <p className="p-3 bg-surface-container-high text-[10px] font-bold text-on-surface-variant italic">Amazon Basin Reforestation</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-full h-full editorial-gradient opacity-[0.02] pointer-events-none"></div>
      </div>

      {/* Admin Forms (1:1 Prototype) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Activity Type Form */}
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">eco</span>
            </div>
            <h3 className="font-headline text-xl font-black text-on-surface">Tạo Activity Type</h3>
          </div>
          <form className="space-y-5" onSubmit={createAT}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Tên</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold opacity-80"
                  placeholder="VD: Đạp xe" value={atForm.name} onChange={e => setAtForm(f => ({...f, name: e.target.value}))}/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Credits</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold opacity-80"
                  type="number" placeholder="VD: 6" value={atForm.credit_amount} onChange={e => setAtForm(f => ({...f, credit_amount: e.target.value}))}/>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Mô tả</label>
              <textarea className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium opacity-80 min-h-[80px] outline-none"
                placeholder="Mô tả tiêu chí..." value={atForm.description} onChange={e => setAtForm(f => ({...f, description: e.target.value}))}/>
            </div>
            <p className="px-2 text-[10px] font-medium text-primary leading-tight">💡 Gợi ý: đạp xe, phân loại rác, trồng cây, hiến máu...</p>
            <button className="w-full py-4 rounded-xl bg-[#161d16] text-[#edf6ea] font-headline font-black transition-all active:scale-95 disabled:opacity-50"
             disabled={busy}>Tạo Activity Type</button>
          </form>
        </div>

        {/* Reward Form */}
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-2xl">redeem</span>
            </div>
            <h3 className="font-headline text-xl font-black text-on-surface">Tạo Reward</h3>
          </div>
          <form className="space-y-5" onSubmit={createReward}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Tiêu đề</label>
              <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold opacity-80"
                placeholder="VD: Voucher căn-tin" value={rewardForm.title} onChange={e => setRewardForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Mô tả</label>
              <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium opacity-80"
                placeholder="Mô tả ngắn..." value={rewardForm.description} onChange={e => setRewardForm(f => ({...f, description: e.target.value}))}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Cost (credits)</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold opacity-80"
                  type="number" placeholder="VD: 10" value={rewardForm.cost} onChange={e => setRewardForm(f => ({...f, cost: e.target.value}))}/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Stock</label>
                <input className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-bold opacity-80"
                  type="number" placeholder="VD: 50" value={rewardForm.stock} onChange={e => setRewardForm(f => ({...f, stock: e.target.value}))}/>
            </div>
            </div>
            <p className="px-2 text-[10px] font-medium text-tertiary leading-tight">⚠️ Reward chỉ là quyền lợi nội bộ, không quy đổi tiền mặt.</p>
            <button className="w-full py-4 rounded-xl editorial-gradient text-on-primary font-headline font-black transition-all active:scale-95 disabled:opacity-50"
             disabled={busy}>Tạo Reward</button>
          </form>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value, trend, icon, trendColor }) {
    return (
        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 shadow-lg relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">{label}</p>
            <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-headline font-black text-on-surface">{value}</span>
                <span className={`text-[10px] font-bold ${trendColor}`}>{trend}</span>
            </div>
            <span className="material-symbols-outlined absolute top-4 right-4 text-3xl opacity-[0.08]">{icon}</span>
        </div>
    )
}

function Bar({ h, highlight, current }) {
    return (
        <div className={`flex-grow rounded-t-lg transition-all duration-500 ${current ? 'bg-primary' : highlight ? 'bg-primary/40' : 'bg-surface-container-highest'}`} style={{height: h}}></div>
    )
}

function Metric({ label, value, primary }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1">{label}</p>
            <p className={`text-xl font-headline font-black ${primary ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
        </div>
    )
}
