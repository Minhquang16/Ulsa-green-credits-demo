import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

// ethers loaded from CDN (window.ethers)
const getEthers = () => window.ethers

const TREASURY_ABI = [
  "function submitProposal(address _targetAddress, uint256 _amount, uint8 _transactionType) external returns (uint256)",
  "function confirmProposal(uint256 _id) public",
  "function executeProposal(uint256 _id) external",
  "function proposals(uint256 _id) view returns (uint256 id, address proposer, address targetAddress, uint256 amount, uint8 transactionType, uint256 signatureCount, bool executed)",
  "function threshold() view returns (uint256)",
  "function isAdmin(address account) view returns (bool)",
  "function isConfirmed(uint256 proposalId, address admin) view returns (bool)",
  "event ProposalCreated(uint256 indexed id, address indexed proposer, address targetAddress, uint256 amount, uint8 transactionType)"
]

export default function TreasuryPage() {
  const { api } = useAuth()
  const { showToast } = useToast()

  const [config, setConfig] = useState(null)
  const [proposals, setProposals] = useState([])
  const [wallet, setWallet] = useState(null)          // địa chỉ ví đang dùng
  const [privKey, setPrivKey] = useState('')          // Private key nếu dùng ví nội bộ
  const [isInternal, setIsInternal] = useState(false) // Đang dùng ví nội bộ hay Metamask
  
  const [threshold, setThreshold] = useState(2)
  const [busy, setBusy] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [form, setForm] = useState({ target_address: '', amount: '', transaction_type: '0', reason: '' })
  const [addrTouched, setAddrTouched] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)

  const ETH_ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/
  const isAddrValid  = ETH_ADDR_REGEX.test(form.target_address)
  const isFormValid  = isAddrValid && Number(form.amount) > 0 && form.reason.trim().length > 0

  // ─── helpers ──────────────────────────────────────────────
  async function getSigner() {
    if (!isInternal) {
      const provider = new (getEthers()).BrowserProvider(window.ethereum)
      return await provider.getSigner()
    } else {
      const provider = new (getEthers()).JsonRpcProvider(config.rpcUrl || 'http://127.0.0.1:8545')
      return new (getEthers()).Wallet(privKey, provider)
    }
  }

  function getTreasuryContract(signerOrProvider) {
    return new (getEthers()).Contract(config.treasuryAddress, TREASURY_ABI, signerOrProvider)
  }

  // ─── Load proposals & enrich từ onchain ──────────────────
  const loadData = useCallback(async (walletAddr, cfg) => {
    setLoadingData(true)
    try {
      const props = await api('/treasury/proposals')
      const effectiveCfg = cfg || config
      
      if (effectiveCfg?.treasuryAddress) {
        const provider = new (getEthers()).JsonRpcProvider(effectiveCfg.rpcUrl || 'http://127.0.0.1:8545')
        const contract = new (getEthers()).Contract(effectiveCfg.treasuryAddress, TREASURY_ABI, provider)
        
        try {
          const th = Number(await contract.threshold())
          setThreshold(th)
        } catch(e) { console.error("Threshold error", e) }

        const enriched = await Promise.all(props.map(async p => {
          try {
            const od = await contract.proposals(p.onchain_id)
            p.signatureCount = Number(od.signatureCount)
            p.executed       = od.executed
          } catch {
            p.signatureCount = 0
            p.executed       = false
          }
          const addr = walletAddr || wallet
          if (addr && p.onchain_id !== null) {
            try {
              p.currentAdminSigned = await contract.isConfirmed(p.onchain_id, addr)
            } catch { p.currentAdminSigned = false }
          }
          return p
        }))
        setProposals(enriched)
      } else {
        setProposals(props)
      }
    } catch (e) {
      showToast('❌ Lỗi tải dữ liệu: ' + e.message)
    } finally {
      setLoadingData(false)
    }
  }, [api, config, wallet])

  useEffect(() => {
    api('/config').then(cfg => {
      setConfig(cfg)
      loadData(null, cfg)
    })
    const savedKey = sessionStorage.getItem('admin_priv_key')
    if (savedKey) {
      try {
        const tempWallet = new (getEthers()).Wallet(savedKey)
        setPrivKey(savedKey)
        setWallet(tempWallet.address)
        setIsInternal(true)
      } catch(e) {}
    }
  }, [])

  // ─── Wallet Actions ──────────────────────────────────────
  async function connectInternalWallet(key) {
    if (!key) return showToast('⚠️ Vui lòng nhập Key')
    if (!key.startsWith('0x')) key = '0x' + key
    try {
      const tempWallet = new (getEthers()).Wallet(key)
      const provider = new (getEthers()).JsonRpcProvider(config.rpcUrl || 'http://127.0.0.1:8545')
      const contract = new (getEthers()).Contract(config.treasuryAddress, TREASURY_ABI, provider)
      
      const isAdmin = await contract.isAdmin(tempWallet.address)
      if (!isAdmin) return showToast('❌ Key này không thuộc về Admin nào')

      setPrivKey(key)
      setWallet(tempWallet.address)
      setIsInternal(true)
      sessionStorage.setItem('admin_priv_key', key)
      setShowKeyModal(false)
      showToast('✅ Đã kích hoạt ví nội bộ')
      loadData(tempWallet.address, config)
    } catch (e) {
      showToast('❌ Private Key không hợp lệ')
    }
  }

  async function connectMetamask() {
    if (!window.ethereum) return showToast('⚠️ Vui lòng cài đặt Metamask')
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const addr = accounts[0]
      const provider = new (getEthers()).BrowserProvider(window.ethereum)
      const contract = new (getEthers()).Contract(config.treasuryAddress, TREASURY_ABI, provider)
      const isAdmin = await contract.isAdmin(addr)
      if (!isAdmin) return showToast('❌ Bạn không có quyền Admin')

      setWallet(addr)
      setIsInternal(false)
      setPrivKey('')
      setShowKeyModal(false)
      showToast('✅ Đã kết nối Metamask')
      loadData(addr, config)
    } catch (e) {
      showToast('❌ Lỗi: ' + e.message)
    }
  }

  function disconnectWallet() {
    setWallet(null)
    setPrivKey('')
    setIsInternal(false)
    sessionStorage.removeItem('admin_priv_key')
    showToast('🔌 Đã ngắt kết nối')
  }

  // ─── Proposals Logic ─────────────────────────────────────
  async function submitProposal(e) {
    e.preventDefault()
    if (!wallet) return showToast('⚠️ Hãy kết nối ví trước')
    setBusy('submit')
    showToast('⏳ Đang xử lý giao dịch...')
    try {
      const signer = await getSigner()
      const contract = getTreasuryContract(signer)
      const tx = await contract.submitProposal(form.target_address, form.amount, Number(form.transaction_type))
      const receipt = await tx.wait()

      let onchainId = 0
      const evt = receipt.logs.find(l => {
        try { return contract.interface.parseLog({ topics: l.topics, data: l.data })?.name === 'ProposalCreated' }
        catch { return false }
      })
      if (evt) {
        const parsed = contract.interface.parseLog({ topics: evt.topics, data: evt.data })
        onchainId = Number(parsed.args[0])
      }

      await api('/treasury/proposals', {
        method: 'POST',
        body: JSON.stringify({
          onchain_id: onchainId,
          target_address: form.target_address,
          amount: Number(form.amount),
          transaction_type: form.transaction_type === '0' ? 'MINT' : 'BURN',
          reason: form.reason
        })
      })
      showToast('✅ Đề xuất thành công')
      setForm({ target_address: '', amount: '', transaction_type: '0', reason: '' })
      loadData(wallet, config)
    } catch (e) {
      showToast('❌ Lỗi: ' + (e.reason || e.message))
    } finally { setBusy(false) }
  }

  async function handleConfirm(onchainId) {
    setBusy(onchainId + '_confirm')
    showToast('⏳ Đang ký xác nhận...')
    try {
      const signer = await getSigner()
      const contract = getTreasuryContract(signer)
      const tx = await contract.confirmProposal(onchainId)
      await tx.wait()
      showToast('✅ Đã ký thành công')
      loadData(wallet, config)
    } catch (e) { showToast('❌ Lỗi: ' + (e.reason || e.message)) }
    finally { setBusy(false) }
  }

  async function handleExecute(onchainId) {
    setBusy(onchainId + '_execute')
    showToast('⏳ Đang thực thi...')
    try {
      const signer = await getSigner()
      const contract = getTreasuryContract(signer)
      const tx = await contract.executeProposal(onchainId)
      await tx.wait()
      showToast('✅ Thực thi thành công!')
      loadData(wallet, config)
    } catch (e) { showToast('❌ Lỗi: ' + (e.reason || e.message)) }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-surface-bright p-4 md:p-8 font-body text-on-surface">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">Kho quỹ hội đồng</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Multi-Sig Treasury</h1>
          <p className="text-on-surface-variant text-sm font-medium mt-1">
            Yêu cầu đa chữ ký (ngưỡng: {threshold}) để quản lý UGC.
          </p>
        </div>

        <div>
          {wallet ? (
            <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm border border-outline-variant">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${isInternal ? 'bg-purple-600' : 'bg-orange-500'}`}>
                {isInternal ? 'KEY' : 'MM'}
              </div>
              <div>
                <p className="text-[9px] font-black text-on-surface-variant leading-none uppercase">{isInternal ? 'Ví nội bộ' : 'Metamask'}</p>
                <p className="text-sm font-mono font-bold">{wallet.slice(0,6)}...{wallet.slice(-4)}</p>
              </div>
              <button onClick={disconnectWallet} className="ml-2 text-red-400 hover:text-red-600">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowKeyModal(true)} className="px-6 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              Kết nối Ví Admin
            </button>
          )}
        </div>
      </header>

      {/* Modal Chọn ví */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-on-surface">Kết nối ví quản trị</h3>
              <button onClick={() => setShowKeyModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <button onClick={connectMetamask} className="w-full p-4 rounded-2xl border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" className="w-8 h-8" alt="Metamask" />
                </div>
                <div>
                  <p className="font-bold">MetaMask</p>
                  <p className="text-xs text-on-surface-variant">Browser Extension</p>
                </div>
              </button>

              <div className="relative py-2 text-center">
                <span className="bg-white px-4 text-[10px] font-black text-on-surface-variant uppercase relative z-10">Hoặc dùng ví nội bộ</span>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-outline-variant"></div>
              </div>

              <div className="p-4 rounded-2xl border-2 border-purple-100 bg-purple-50/30">
                <p className="text-[10px] font-black text-purple-600 uppercase mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">lock</span> Nhập Private Key
                </p>
                <input 
                  type="password"
                  id="internal_key_field"
                  placeholder="0x..."
                  className="w-full bg-white border border-purple-200 rounded-xl py-2.5 px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button 
                  onClick={() => connectInternalWallet(document.getElementById('internal_key_field').value)}
                  className="w-full mt-3 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-md transition-all"
                >
                  Kích hoạt bằng Private Key
                </button>
                <p className="text-[9px] text-purple-400 mt-2 text-center italic">Key chỉ được lưu tạm thời trong phiên làm việc này.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form bên trái */}
        <section className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">add_task</span>
            </div>
            <div>
              <h2 className="text-xl font-black">Tạo Yêu Cầu</h2>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Chỉ Admin mới có quyền đề xuất.</p>
            </div>
          </div>

          <form onSubmit={submitProposal} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Loại giao dịch</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl border border-outline-variant/30">
                <button type="button" onClick={() => setForm({ ...form, transaction_type: '0' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${form.transaction_type === '0' ? 'bg-white shadow-sm text-emerald-600' : 'text-on-surface-variant'}`}>
                  <span className={`w-2 h-2 rounded-full ${form.transaction_type === '0' ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                  Cấp phát (MINT)
                </button>
                <button type="button" onClick={() => setForm({ ...form, transaction_type: '1' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${form.transaction_type === '1' ? 'bg-white shadow-sm text-red-600' : 'text-on-surface-variant'}`}>
                  <span className={`w-2 h-2 rounded-full ${form.transaction_type === '1' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  Thu hồi (BURN)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Ví nhận / bị thu hồi</label>
              <input
                className={`w-full bg-surface-container-high rounded-xl py-3 px-4 text-sm font-mono text-on-surface outline-none transition-all
                  ${!addrTouched || form.target_address === '' ? 'focus:ring-2 focus:ring-primary/40 border border-transparent'
                    : isAddrValid ? 'border border-emerald-500 ring-2 ring-emerald-200' : 'border border-red-500 ring-2 ring-red-200'}`}
                placeholder="0x..."
                value={form.target_address}
                onChange={e => { setAddrTouched(true); setForm({ ...form, target_address: e.target.value }) }}
              />
              {addrTouched && !isAddrValid && form.target_address !== '' && (
                <p className="text-[10px] text-red-500 font-bold mt-1">❌ Địa chỉ ví không hợp lệ</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Số lượng UGC</label>
              <input type="number" className="w-full bg-surface-container-high rounded-xl py-3 px-4 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="VD: 1000" required value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Lý do</label>
              <textarea rows="3" className="w-full bg-surface-container-high rounded-xl py-3 px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="Mô tả lý do..." required value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
            </div>

            <button type="submit" disabled={busy === 'submit' || !wallet || !isFormValid}
              className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              {busy === 'submit' ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
              Gửi Đề Xuất
            </button>
          </form>
        </section>

        {/* Danh sách bên phải */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6 px-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">view_list</span>
              <h2 className="text-xl font-black uppercase tracking-tight text-on-surface">Danh sách Đề xuất</h2>
            </div>
            <button onClick={() => loadData(wallet)} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
              <span className={`material-symbols-outlined ${loadingData ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white rounded-[2rem] animate-pulse border border-outline-variant"></div>)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">inventory_2</span>
              <h3 className="text-xl font-black">Chưa có đề xuất nào</h3>
              <p className="text-sm text-on-surface-variant">Mọi đề xuất on-chain sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map(p => (
                <div key={p.id} className={`bg-white rounded-3xl p-6 border transition-all ${p.executed ? 'border-emerald-100 bg-emerald-50/10' : 'border-outline-variant hover:border-primary'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${p.transaction_type === 'MINT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {p.transaction_type}
                    </span>
                    {p.executed ? <span className="text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1"><span className="material-symbols-outlined text-sm">verified</span> Hoàn thành</span>
                      : <span className="text-orange-500 text-[10px] font-black uppercase flex items-center gap-1"><span className="material-symbols-outlined text-sm">pending</span> Chờ duyệt</span>}
                  </div>
                  
                  <h3 className="text-2xl font-black mb-1">{p.amount.toLocaleString()} <span className="text-xs font-medium text-on-surface-variant uppercase">UGC</span></h3>
                  <p className="text-xs text-on-surface-variant font-medium mb-5 line-clamp-2">{p.reason}</p>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
                      <span>Xác thực</span>
                      <span>{p.signatureCount} / {threshold} chữ ký</span>
                    </div>
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${p.signatureCount >= threshold ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${(p.signatureCount/threshold)*100}%` }}></div>
                    </div>

                    {!p.executed && (
                      <div className="flex gap-2 pt-2">
                        {p.currentAdminSigned ? (
                          <button disabled className="flex-1 py-2.5 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold opacity-60">Đã ký</button>
                        ) : (
                          <button onClick={() => handleConfirm(p.onchain_id)} disabled={busy} className="flex-1 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">Ký duyệt</button>
                        )}
                        {p.signatureCount >= threshold && (
                          <button onClick={() => handleExecute(p.onchain_id)} disabled={busy} className="flex-1 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 transition-all">Thực thi</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
