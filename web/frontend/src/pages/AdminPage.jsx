import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [stats, setStats] = useState({ users: 4, events: 5, claims: 12, approved: 8 })
  const [tokenStats, setTokenStats] = useState({ issued: 120, burned: 45, supply: 75, contract: '0xAbCd...1234' })
  const [busy, setBusy] = useState(false)
  async function load() {
    try {
      const s = await api('/analytics/overview')
      setStats(s)
      const c = await api('/wallet/contract')
      const b = await api('/wallet/balance')
      setTokenStats(prev => ({
        ...prev,
        contract: c.address,
        supply: b.balance,
        issued: s.token?.totalIssued ?? prev.issued,
        burned: s.token?.totalBurned ?? prev.burned
      }))
    } catch (e) {
      showToast('⚠️ Lỗi tải dữ liệu quản trị')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 animate-in">

      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Governance Hub</p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Tổng quan Quản trị</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => showToast('Đang xuất báo cáo...')} className="btn btn--secondary px-4 py-2 text-xs">Xuất báo cáo</button>
          <button onClick={load} className="btn btn--primary px-4 py-2 text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
          </button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng Users" value={stats.users} trend="+8.4%" icon="group" trendColor="text-primary" />
        <StatCard label="Sự kiện" value={stats.events} trend="Đang diễn ra" icon="event_available" trendColor="text-on-surface-variant/40" />
        <StatCard label="Claims" value={stats.claims} trend="Chờ duyệt" icon="pending_actions" trendColor="text-tertiary" />
        <StatCard label="Đã Approved" value={stats.approved} trend="UGC Credits" icon="verified_user" trendColor="text-primary" />
      </div>

      {/* Token Panel */}
      <div className="bg-surface-container-low rounded-3xl p-8 mb-10 border border-outline-variant/10 shadow-xl shadow-black/5 relative overflow-hidden group">
        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
          <div className="lg:flex-grow">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="font-headline text-xl font-black text-on-surface mb-1">Token stats (on-chain)</h2>
                <p className="text-[10px] font-mono text-primary opacity-60">Contract: <code>{tokenStats.contract}</code></p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Hardhat local</span>
            </div>

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
                alt="Amazon" />
              <p className="p-3 bg-surface-container-high text-[10px] font-bold text-on-surface-variant italic">Amazon Basin Reforestation</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-full h-full editorial-gradient opacity-[0.02] pointer-events-none"></div>
      </div>

    </main>
  )
}

function StatCard({ label, value, trend, icon, trendColor }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/5 shadow-md relative overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/40 mb-1">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-headline font-black text-on-surface">{value}</span>
        <span className={`text-[9px] font-bold ${trendColor}`}>{trend}</span>
      </div>
      <span className="material-symbols-outlined absolute top-4 right-4 text-2xl opacity-[0.08]">{icon}</span>
    </div>
  )
}

function Bar({ h, highlight, current }) {
  return (
    <div className={`flex-grow rounded-t-lg transition-all duration-500 ${current ? 'bg-primary' : highlight ? 'bg-primary/40' : 'bg-surface-container-highest'}`} style={{ height: h }}></div>
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
