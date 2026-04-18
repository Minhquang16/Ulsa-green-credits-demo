import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

function shortHash(h) {
  if (!h) return '...'
  return h.slice(0, 8) + '...' + h.slice(-4)
}

export default function DashboardPage() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [balance, setBalance] = useState(null)
  const [contract, setContract] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const b = await api('/wallet/balance')
      const c = await api('/wallet/contract')
      const h = await api('/wallet/history')
      setBalance(b.balance)
      setContract(c.address)
      setHistory(h.slice(0, 10))
    } catch (e) {
      setError(e.message)
      showToast('⚠️ Lỗi tải dữ liệu on-chain')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 animate-in">
      
      {/* Page Header (1:1 Prototype) */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Tổng quan</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Ví blockchain: <code className="font-mono text-primary">{user.wallet_address || '0x...'}</code>
          </p>
        </div>
        <button onClick={() => { load(); showToast('Đã tải lại dữ liệu on-chain!'); }} 
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-base">refresh</span> Reload
        </button>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Stats & Impacts) */}
        <div className="lg:col-span-4 space-y-7">
          
          {/* Balance Card (1:1 Prototype) */}
          <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_24px_56px_rgba(0,110,47,0.18)]">
            <div className="relative z-10">
              <span className="text-xs font-label uppercase tracking-widest opacity-80">Số dư tín chỉ xanh</span>
              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="text-6xl font-headline font-extrabold tracking-tighter">{balance === null ? '...' : balance}</h2>
                <span className="text-xl font-headline font-bold opacity-90">UGC</span>
              </div>
              <div className="mt-12 flex flex-col gap-1">
                <span className="text-[10px] font-label uppercase tracking-wider opacity-60">Token on-chain</span>
                <div className="flex items-center gap-2 font-mono text-xs bg-black/10 rounded-lg px-3 py-2 border border-white/5 backdrop-blur-md w-fit">
                  <span>{shortHash(contract)}</span>
                  <span className="material-symbols-outlined text-[13px] cursor-pointer hover:text-white transition-colors" 
                    onClick={() => {
                        navigator.clipboard.writeText(contract);
                        showToast('Đã sao chép địa chỉ!');
                    }}>content_copy</span>
                </div>
              </div>
            </div>
            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* Environmental Impact (1:1 Prototype) */}
          <div className="bg-surface-container-low rounded-2xl p-6 space-y-5">
            <h3 className="font-headline text-base font-bold text-on-surface">Tác động môi trường</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-surface-container-lowest p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary-fixed-variant">eco</span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium">CO₂ Offset</p>
                    <p className="text-sm font-bold">{(balance || 0) * 0.3} Tấn (Est.)</p>
                  </div>
                </div>
                <span className="text-primary text-xs font-bold">+100%</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-lowest p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">water_drop</span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium">Nước tiết kiệm</p>
                    <p className="text-sm font-bold">{(balance || 0) * 50} L (Est.)</p>
                  </div>
                </div>
                <span className="text-primary text-xs font-bold">+100%</span>
              </div>
            </div>
          </div>

          {/* Promotional Banner (1:1 Prototype) */}
          <div className="relative overflow-hidden rounded-2xl group cursor-pointer" onClick={() => nav('/events')}>
            <img className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8"
              alt="Promo Forest"/>
            <div className="absolute inset-0 bg-gradient-to-t from-[#161d16]/80 via-transparent to-transparent p-6 flex flex-col justify-end">
              <p className="text-white font-headline font-bold text-sm leading-tight">Tham gia trồng cây — kiếm tín chỉ xanh ngay hôm nay</p>
              <div className="flex items-center gap-1 text-primary-fixed-dim text-[11px] font-bold mt-2 uppercase tracking-wider">
                Xem hoạt động <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (History) */}
        <div className="lg:col-span-8 bg-surface-container-low rounded-2xl p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-headline text-2xl font-extrabold tracking-tight">Lịch sử on-chain</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#161d16]/30 px-3 py-1 bg-surface-container-high rounded-full">Hardhat network</span>
          </div>
          
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-xs font-label uppercase tracking-widest text-on-surface-variant/60">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Ref</th>
                  <th className="px-5 py-3 font-medium text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-20 text-center opacity-30">
                        <span className="material-symbols-outlined text-6xl mb-4">history</span>
                        <p>Chưa có giao dịch nào được ghi nhận</p>
                    </td>
                  </tr>
                ) : history.map((h, i) => (
                  <tr key={i} className="group cursor-default hover:translate-x-1 transition-transform">
                    <td className="px-5 py-4 bg-surface-container-lowest rounded-l-2xl font-medium">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${h.type === 'ISSUE' ? 'bg-primary' : 'bg-tertiary'}`}></span>
                        {h.type === 'ISSUE' ? 'Phát tín chỉ' : 'Sử dụng tín chỉ'}
                      </div>
                    </td>
                    <td className={`px-5 py-4 bg-surface-container-lowest font-headline font-bold ${h.type === 'ISSUE' ? 'text-primary' : 'text-tertiary'}`}>
                      {h.type === 'ISSUE' ? '+' : '-'}{h.amount} UGC
                    </td>
                    <td className="px-5 py-4 bg-surface-container-lowest font-mono text-[11px] opacity-60">{shortHash(h.refId)}</td>
                    <td className="px-5 py-4 bg-surface-container-lowest rounded-r-2xl text-right">
                      <a href="#" className="font-mono text-[11px] text-primary underline decoration-primary/30 hover:decoration-primary">{shortHash(h.txHash)}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 pt-6 border-t border-outline-variant/10 flex justify-between items-center">
            <p className="text-[11px] text-on-surface-variant/60 italic font-medium">Tất cả giao dịch được bảo mật và phi tập trung.</p>
            <Link to="/claims" className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                Gửi claim mới <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>

      {user.role === 'student' && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in" style={{animationDelay:'0.3s'}}>
          <Link className="editorial-gradient text-on-primary flex items-center gap-3 px-8 py-5 rounded-full shadow-[0_24px_48px_rgba(0,110,47,0.3)] hover:scale-105 active:scale-95 transition-all font-headline font-bold text-lg" to="/events">
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings:"'wght' 600"}}>add</span>
            Ghi nhận Xanh
          </Link>
        </div>
      )}
    </main>
  )
}
