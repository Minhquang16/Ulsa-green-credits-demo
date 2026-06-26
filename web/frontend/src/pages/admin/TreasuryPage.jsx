import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import '../../styles/admin/treasury.css'

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

function getRelativeTime(dateStr) {
  if (!dateStr) return '---';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export default function TreasuryPage() {
  const { api } = useAuth()
  const { showToast } = useToast()

  const [config, setConfig] = useState(null)
  const [proposals, setProposals] = useState([])
  const [admins, setAdmins] = useState([])
  const [hasPending, setHasPending] = useState(false)
  const [stats, setStats] = useState({ totalMinted: 0, totalBurned: 0, totalSupply: 0 })
  const [wallet, setWallet] = useState(null)          // địa chỉ ví đang dùng
  const [privKey, setPrivKey] = useState('')          // Private key nếu dùng ví nội bộ
  const [isInternal, setIsInternal] = useState(false) // Đang dùng ví nội bộ hay Metamask
  
  const [threshold, setThreshold] = useState(2)
  const [busy, setBusy] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [form, setForm] = useState({ target_address: '', amount: '', transaction_type: '0', reason: '' })
  const [addrTouched, setAddrTouched] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')

  const ETH_ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/
  const isAddrValid  = ETH_ADDR_REGEX.test(form.target_address)
  const isFormValid  = isAddrValid && Number(form.amount) > 0 && form.reason.trim().length > 0

  const [cashflowData, setCashflowData] = useState([])

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
      
      // Load stats, cashflow, and all users parallel
      const [statsRes, cashflowRes, allUsers] = await Promise.all([
        api('/treasury/stats').catch(() => ({ totalMinted: 0, totalBurned: 0, totalSupply: 0 })),
        api('/treasury/cashflow').catch(() => []),
        api('/admin/users').catch(() => [])
      ])
      
      setStats(statsRes)
      setCashflowData(cashflowRes)
      
      const adminUsers = allUsers.filter(u => u.role === 'admin')
      const effectiveCfg = cfg || config
      
      if (effectiveCfg?.treasuryAddress) {
        const provider = new (getEthers()).JsonRpcProvider(effectiveCfg.rpcUrl || 'http://127.0.0.1:8545')
        const contract = new (getEthers()).Contract(effectiveCfg.treasuryAddress, TREASURY_ABI, provider)
        
        try {
          const th = Number(await contract.threshold())
          setThreshold(th)
        } catch(e) { console.error("Threshold error", e) }

        const enriched = await Promise.all(props.map(async p => {
          let proposerAddr = ''
          try {
            const od = await contract.proposals(p.onchain_id)
            p.signatureCount = Number(od.signatureCount)
            p.executed       = od.executed
            proposerAddr     = od.proposer
            p.proposer       = od.proposer
          } catch {
            p.signatureCount = 0
            p.executed       = false
            p.proposer       = ''
          }
          
          // Match proposer to admin name
          const matchedCreator = adminUsers.find(u => u.wallet_address?.toLowerCase() === proposerAddr?.toLowerCase())
          if (matchedCreator) {
            p.creatorName = matchedCreator.full_name
            p.creatorAddress = matchedCreator.wallet_address
          } else {
            p.creatorName = 'Admin ULSA'
            p.creatorAddress = proposerAddr || '0x'
          }

          const addr = walletAddr || wallet
          if (addr && p.onchain_id !== null) {
            try {
              p.currentAdminSigned = await contract.isConfirmed(p.onchain_id, addr)
            } catch { p.currentAdminSigned = false }
          }

          // Check signature status for all admin slots
          p.adminSignatures = await Promise.all(adminUsers.map(async (u, idx) => {
            let hasSigned = false
            if (p.onchain_id !== null && u.wallet_address) {
              try {
                hasSigned = await contract.isConfirmed(p.onchain_id, u.wallet_address)
              } catch {}
            }
            return {
              id: u.id,
              name: u.full_name,
              address: u.wallet_address,
              avatarIndex: idx + 1,
              hasSigned
            }
          }))

          return p
        }))
        
        setProposals(enriched)
        
        const pendingProps = enriched.filter(p => !p.executed)
        const latestPendingId = pendingProps.length > 0 ? pendingProps[0].onchain_id : null
        setHasPending(pendingProps.length > 0)
        
        const mappedAdmins = await Promise.all(adminUsers.map(async (u, idx) => {
          let signed = false
          if (latestPendingId !== null && u.wallet_address) {
            try { signed = await contract.isConfirmed(latestPendingId, u.wallet_address) } catch {}
          }
          return {
            id: u.id,
            name: u.full_name,
            address: u.wallet_address || 'Chưa liên kết',
            signed,
            avatar: (idx + 1).toString()
          }
        }))
        setAdmins(mappedAdmins)
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
      setAddrTouched(false)
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

  const pendingProposals = proposals.filter(p => !p.executed)
  const executedProposals = proposals.filter(p => p.executed)
  const displayedProposals = activeTab === 'pending' ? pendingProposals : executedProposals

  return (
    <main className="treasury-page">
      {/* Header */}
      <header className="treasury-header">
        <div>
          <p className="treasury-header__subtitle">KHO QUỸ HỘI ĐỒNG</p>
          <div className="treasury-header__title-row">
            <h1 className="treasury-header__title">Multi-Sig Treasury</h1>
            <span className="material-symbols-outlined treasury-header__badge">verified_user</span>
          </div>
          <p className="treasury-header__desc">Ví đa chữ ký (ngưỡng: {threshold}/3) để quản lý và vận hành nguồn cung UGC.</p>
        </div>

        <div className="treasury-header__actions">
          {wallet ? (
            <div className="treasury-wallet-info">
              <div className="treasury-wallet-card">
                <div className={`treasury-wallet-icon ${isInternal ? 'treasury-wallet-icon--internal' : 'treasury-wallet-icon--metamask'}`}>
                  {isInternal ? 'KEY' : 'MM'}
                </div>
                <div>
                  <p className="treasury-wallet-type">{isInternal ? 'Ví nội bộ' : 'Metamask'}</p>
                  <p className="treasury-wallet-address">{wallet.slice(0,6)}...{wallet.slice(-4)}</p>
                </div>
                <button onClick={disconnectWallet} className="treasury-wallet-disconnect">
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => setShowKeyModal(true)} className="treasury-connect-btn">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span> Kết nối Ví Admin <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
              <p className="treasury-connect-note"><span className="material-symbols-outlined text-[12px]">lock</span> Chỉ Admin mới có quyền đề xuất và gửi</p>
            </>
          )}
        </div>
      </header>

      {/* 4 Stat Cards */}
      <div className="treasury-stats-grid">
        <div className="treasury-stat-card">
          <div className="treasury-stat-card__main">
            <div className="treasury-stat-card__icon treasury-stat-card__icon--emerald">
              <span className="material-symbols-outlined text-base">layers</span>
            </div>
            <div className="treasury-stat-card__content">
              <p className="treasury-stat-card__label">TỔNG CUNG (TOTAL SUPPLY)</p>
              <p className="treasury-stat-card__value treasury-stat-card__value--emerald">{stats.totalSupply.toLocaleString()} <span className="treasury-stat-card__unit">UGC</span></p>
            </div>
          </div>
          <div className="treasury-stat-card__footer">
            <span className="treasury-stat-card__trend"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> +12.5%</span>
            <span className="treasury-stat-card__trend-desc">So với 30 ngày trước</span>
          </div>
          <div className="treasury-stat-card__bg">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,25 Q10,28 20,20 T40,15 T60,20 T80,5 T100,2" fill="none" stroke="#10b981" strokeWidth="2" /></svg>
          </div>
        </div>

        <div className="treasury-stat-card">
          <div className="treasury-stat-card__main">
            <div className="treasury-stat-card__icon treasury-stat-card__icon--blue">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
            </div>
            <div className="treasury-stat-card__content">
              <p className="treasury-stat-card__label">TỔNG ĐÃ CẤP PHÁT (MINTED)</p>
              <p className="treasury-stat-card__value treasury-stat-card__value--blue">{stats.totalMinted.toLocaleString()} <span className="treasury-stat-card__unit">UGC</span></p>
            </div>
          </div>
          <div className="treasury-stat-card__footer">
            <span className="treasury-stat-card__trend"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> +8.6%</span>
            <span className="treasury-stat-card__trend-desc">So với 30 ngày trước</span>
          </div>
          <div className="treasury-stat-card__bg">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,25 Q10,22 20,20 T40,10 T60,15 T80,5 T100,2" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
          </div>
        </div>

        <div className="treasury-stat-card">
          <div className="treasury-stat-card__main">
            <div className="treasury-stat-card__icon treasury-stat-card__icon--purple">
              <span className="material-symbols-outlined text-base">arrow_downward</span>
            </div>
            <div className="treasury-stat-card__content">
              <p className="treasury-stat-card__label">TỔNG ĐÃ THU HỒI (BURNED)</p>
              <p className="treasury-stat-card__value treasury-stat-card__value--purple">{stats.totalBurned.toLocaleString()} <span className="treasury-stat-card__unit">UGC</span></p>
            </div>
          </div>
          <div className="treasury-stat-card__footer">
            <span className="treasury-stat-card__trend"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> +3.2%</span>
            <span className="treasury-stat-card__trend-desc">So với 30 ngày trước</span>
          </div>
          <div className="treasury-stat-card__bg">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,28 Q10,25 20,26 T40,20 T60,25 T80,10 T100,12" fill="none" stroke="#a855f7" strokeWidth="2" /></svg>
          </div>
        </div>

        <div className="treasury-stat-card">
          <div className="treasury-stat-card__main">
            <div className="treasury-stat-card__icon treasury-stat-card__icon--orange">
              <span className="material-symbols-outlined text-base">pie_chart</span>
            </div>
            <div className="treasury-stat-card__content">
              <p className="treasury-stat-card__label">TỔNG ĐỀ XUẤT</p>
              <p className="treasury-stat-card__value treasury-stat-card__value--slate">{proposals.length}</p>
            </div>
          </div>
          <div className="treasury-stat-proposals">
            <div className="treasury-stat-proposals__row">
              <span>Đang chờ duyệt</span>
              <span className="treasury-stat-proposals__count--orange">{pendingProposals.length}</span>
            </div>
            <div className="treasury-stat-proposals__row">
              <span>Đã thực thi</span>
              <span className="treasury-stat-proposals__count--emerald">{executedProposals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="treasury-layout">
        
        {/* Top Row: Chart & Admin List */}
        <div className="treasury-row">
          
          {/* Chart (8 columns) */}
          <div className="treasury-chart-section">
            <div className="treasury-section-header">
              <h2 className="treasury-section-title">DÒNG TIỀN UGC (30 ngày gần nhất)</h2>
              <button className="treasury-filter-btn">
                30 ngày <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
            <div className="treasury-chart-legend">
              <div className="treasury-chart-legend__item"><span className="treasury-chart-legend__dot treasury-chart-legend__dot--minted"></span> Minted</div>
              <div className="treasury-chart-legend__item"><span className="treasury-chart-legend__dot treasury-chart-legend__dot--burned"></span> Burned</div>
            </div>
            <div className="treasury-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBurned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontSize: '12px', color: '#64748b' }}/>
                  <Area type="monotone" dataKey="minted" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMinted)" />
                  <Area type="monotone" dataKey="burned" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBurned)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Admin List (4 columns) */}
          <div className="treasury-admin-section">
            <h2 className="treasury-section-title mb-6">HỘI ĐỒNG QUẢN TRỊ ({threshold}/3)</h2>
            <div className="treasury-admin-list">
              {admins.map(admin => (
                <div key={admin.id} className="treasury-admin-item">
                  <div className="treasury-admin-item__info">
                    <div className="treasury-admin-item__avatar">
                      {admin.avatar}
                    </div>
                    <div>
                      <p className="treasury-admin-item__name">{admin.name}</p>
                      <p className="treasury-admin-item__address">{admin.address.slice(0,6)}...{admin.address.slice(-4)}</p>
                    </div>
                  </div>
                  {hasPending ? (
                    <span className={`treasury-admin-item__status ${admin.signed ? 'treasury-admin-item__status--signed' : 'treasury-admin-item__status--unsigned'}`}>
                      {admin.signed ? 'Đã ký' : 'Chưa ký'}
                    </span>
                  ) : (
                    <span className="treasury-admin-item__status treasury-admin-item__status--ready">
                      Sẵn sàng
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button className="treasury-admin-btn">
              Xem và quản lý thành viên <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Form & Proposals */}
        <div className="treasury-row">
          
          {/* Create Proposal Form (4 columns) */}
          <div className="treasury-form-section">
            
            <div className="treasury-form-header">
              <div className="treasury-form-header__info">
                <div className="treasury-form-header__icon">
                  <span className="material-symbols-outlined text-[20px]">note_add</span>
                </div>
                <div>
                  <h2 className="treasury-section-title">TẠO ĐỀ XUẤT</h2>
                  <p className="treasury-form-header__desc">Chỉ Admin mới có quyền đề xuất.</p>
                </div>
              </div>
              <div className="treasury-form-badge">
                UGC
              </div>
            </div>

            <form onSubmit={submitProposal} className="treasury-form">
              <div className="treasury-form-group">
                <label className="treasury-form-label">LOẠI GIAO DỊCH</label>
                <div className="treasury-form-type-grid">
                  <button type="button" onClick={() => setForm({ ...form, transaction_type: '0' })}
                    className={`treasury-type-btn ${form.transaction_type === '0' ? 'treasury-type-btn--mint-active' : ''}`}>
                    <span className="treasury-type-dot"></span>
                    Cấp phát (MINT)
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, transaction_type: '1' })}
                    className={`treasury-type-btn ${form.transaction_type === '1' ? 'treasury-type-btn--burn-active' : ''}`}>
                    <span className="treasury-type-dot"></span>
                    Thu hồi (BURN)
                  </button>
                </div>
              </div>

              <div className="treasury-form-group">
                <label className="treasury-form-label">VÍ NHẬN / BỊ THU HỒI</label>
                <div className="treasury-input-wrapper">
                  <input
                    className={`treasury-input treasury-input--mono ${!addrTouched || form.target_address === '' ? '' : isAddrValid ? 'treasury-input--valid' : 'treasury-input--invalid'}`}
                    placeholder="0x..."
                    value={form.target_address}
                    onChange={e => { setAddrTouched(true); setForm({ ...form, target_address: e.target.value }) }}
                  />
                  <span className="material-symbols-outlined treasury-input-icon">contact_mail</span>
                </div>
              </div>

              <div className="treasury-form-group">
                <label className="treasury-form-label">SỐ LƯỢNG UGC</label>
                <div className="treasury-input-wrapper">
                  <input type="number" className="treasury-input treasury-input--bold"
                    placeholder="Nhập số lượng" required value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                  <span className="treasury-input-suffix">UGC</span>
                </div>
              </div>

              <div className="treasury-textarea-wrapper">
                <label className="treasury-form-label">LÝ DO</label>
                <div className="treasury-textarea-container">
                  <textarea className="treasury-textarea"
                    placeholder="Mô tả lý do..." required value={form.reason} maxLength={200}
                    onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
                  <span className="treasury-textarea-counter">
                    {form.reason.length} / 200
                  </span>
                </div>
              </div>

              <button type="submit" disabled={busy === 'submit' || !wallet || !isFormValid}
                className="treasury-submit-btn">
                {busy === 'submit' ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
                Gửi Đề Xuất
              </button>
            </form>
          </div>

          {/* Right Column (Proposals 8 columns) */}
          <div className="treasury-proposals-section">
            <div className="treasury-section-header mb-6">
              <div className="treasury-section-title-wrapper">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">list_alt</span>
                <h2 className="treasury-section-title">DANH SÁCH ĐỀ XUẤT</h2>
              </div>
              <div className="treasury-proposals-actions">
                <button onClick={() => loadData(wallet)} className="treasury-refresh-btn">
                  <span className={`material-symbols-outlined ${loadingData ? 'animate-spin' : ''}`}>refresh</span>
                </button>
                <div className="treasury-filter-btn">
                  Tất cả loại <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </div>
              </div>
            </div>

            <div className="treasury-tabs">
              <button 
                className={`treasury-tab ${activeTab === 'pending' ? 'treasury-tab--active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Đang chờ duyệt ({pendingProposals.length})
                {activeTab === 'pending' && <span className="treasury-tab__indicator"></span>}
              </button>
              <button 
                className={`treasury-tab ${activeTab === 'executed' ? 'treasury-tab--active-dark' : ''}`}
                onClick={() => setActiveTab('executed')}
              >
                Lịch sử đã thực thi ({executedProposals.length})
                {activeTab === 'executed' && <span className="treasury-tab__indicator treasury-tab__indicator--dark"></span>}
              </button>
            </div>

            <div className="treasury-table-container">
              {loadingData ? (
                <div className="treasury-empty-state">
                  <span className="material-symbols-outlined animate-spin treasury-empty-icon">progress_activity</span>
                </div>
              ) : displayedProposals.length === 0 ? (
                <div className="treasury-empty-state">
                  <span className="material-symbols-outlined treasury-empty-icon">inventory_2</span>
                  <p className="treasury-empty-text">Chưa có đề xuất nào</p>
                </div>
              ) : (
                <div className="treasury-table-wrapper">
                  <table className="treasury-table">
                    <thead>
                      <tr>
                        <th>ĐỀ XUẤT</th>
                        <th>LOẠI</th>
                        <th>SỐ LƯỢNG</th>
                        <th>NGƯỜI TẠO</th>
                        <th>TRẠNG THÁI</th>
                        <th>CHỮ KÝ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedProposals.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="treasury-proposal-info">
                              <span className="treasury-proposal-id">#{p.onchain_id}</span>
                              <div>
                                <p className="treasury-proposal-reason">{p.reason}</p>
                                <p className="treasury-proposal-target">
                                  {p.target_address.slice(0,6)}...{p.target_address.slice(-4)}
                                  <span className="mx-1.5">•</span>
                                  {getRelativeTime(p.created_at)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`treasury-tx-type ${p.transaction_type === 'MINT' ? 'treasury-tx-type--mint' : 'treasury-tx-type--burn'}`}>
                              {p.transaction_type}
                            </span>
                          </td>
                          <td>
                            <p className="treasury-amount-val">{p.amount.toLocaleString()} <span className="treasury-amount-unit">UGC</span></p>
                            <p className="treasury-amount-usd">≈ ${(p.amount).toLocaleString()}</p>
                          </td>
                          <td>
                            <p className="treasury-creator-name">{p.creatorName}</p>
                            <p className="treasury-creator-address">
                              {p.creatorAddress && p.creatorAddress !== '0x' 
                                ? `${p.creatorAddress.slice(0,6)}...${p.creatorAddress.slice(-4)}` 
                                : '0x...'}
                            </p>
                          </td>
                          <td>
                            {p.executed ? (
                              <div className="treasury-status-done">
                                <span className="material-symbols-outlined">verified</span>
                                <p className="treasury-status-done-text">Hoàn thành</p>
                              </div>
                            ) : (
                              <div>
                                <span className="treasury-status-pending">Đang chờ</span>
                                <p className="treasury-status-sigs">{p.signatureCount}/{threshold} chữ ký</p>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="treasury-signatures">
                              {(p.adminSignatures || []).map((sig) => (
                                <div 
                                  key={sig.id} 
                                  className={`treasury-sig-avatar ${sig.hasSigned ? 'treasury-sig-avatar--signed' : 'treasury-sig-avatar--pending'}`}
                                  title={sig.name}
                                >
                                  U{sig.avatarIndex}
                                </div>
                              ))}
                              {p.signatureCount < threshold && !p.executed && !p.currentAdminSigned && (
                                <button onClick={() => handleConfirm(p.onchain_id)} className="treasury-sig-btn treasury-sig-btn--sign" title="Ký duyệt">
                                  +
                                </button>
                              )}
                              {p.signatureCount >= threshold && !p.executed && (
                                <button onClick={() => handleExecute(p.onchain_id)} className="treasury-sig-btn treasury-sig-btn--execute" title="Thực thi">
                                  <span className="material-symbols-outlined">play_arrow</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {activeTab === 'pending' && pendingProposals.length > 0 && (
            <button className="treasury-view-all-btn">
              Xem tất cả đề xuất chờ duyệt <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Modal Chọn ví */}
      {showKeyModal && (
        <div className="treasury-modal-overlay">
          <div className="treasury-modal">
            <div className="treasury-modal-header">
              <h3 className="treasury-modal-title">Kết nối ví quản trị</h3>
              <button onClick={() => setShowKeyModal(false)} className="treasury-modal-close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="treasury-modal-body">
              <button onClick={connectMetamask} className="treasury-wallet-option">
                <div className="treasury-wallet-option__icon">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask" />
                </div>
                <div>
                  <p className="treasury-wallet-option__name">MetaMask</p>
                  <p className="treasury-wallet-option__desc">Browser Extension</p>
                </div>
              </button>

              <div className="treasury-modal-divider">
                <span className="treasury-modal-divider__text">Hoặc dùng ví nội bộ</span>
                <div className="treasury-modal-divider__line"></div>
              </div>

              <div className="treasury-internal-box">
                <p className="treasury-internal-box__title">
                  <span className="material-symbols-outlined text-sm">lock</span> Nhập Private Key
                </p>
                <input 
                  type="password"
                  id="internal_key_field"
                  placeholder="0x..."
                  className="treasury-internal-box__input"
                />
                <button 
                  onClick={() => connectInternalWallet(document.getElementById('internal_key_field').value)}
                  className="treasury-internal-box__btn"
                >
                  Kích hoạt bằng Private Key
                </button>
                <p className="treasury-internal-box__note">Key chỉ được lưu tạm thời trong phiên làm việc này.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
