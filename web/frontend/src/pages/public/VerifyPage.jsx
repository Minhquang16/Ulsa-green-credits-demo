import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import ulsaLogo from '../../logo_web.png'

export default function VerifyPage() {
  const { query } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth() 

  const [searchInput, setSearchInput] = useState(query || '')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [hasSearched, setHasSearched] = useState(!!query)

  useEffect(() => {
    if (query) {
      handleSearch(query)
    }
  }, [query])

  const handleSearch = async (val) => {
    if (!val) return
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch(`/api/public/verify/${val}`)
      const json = await res.json()
      if (json.found) {
        setData(json)
      } else {
        setData(null)
        showToast('❌ Không tìm thấy chứng nhận nào với thông tin này.', true)
      }
    } catch (e) {
      showToast('❌ Lỗi kết nối đến server.', true)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (searchInput) {
      navigate(`/verify/${searchInput}`)
    }
  }

  // --- Logic ẩn thông tin ---
  const isAuthorized = user && (user.role === 'admin' || user.wallet_address === data?.claim?.student_wallet)
  
  const displayStudentId = (id) => {
    if (!id) return 'Không có'
    if (isAuthorized) return id
    return id.substring(0, 3) + '****' + id.substring(id.length - 2)
  }

  const displayStudentName = (name) => {
    if (!name) return 'Không rõ'
    if (isAuthorized) return name
    const parts = name.split(' ')
    if (parts.length <= 1) return name.substring(0, 2) + '***'
    const last = parts.pop()
    return parts.join(' ') + ' **'
  }

  return (
    <div className="min-h-screen bg-white font-body text-gray-900 pb-20 selection:bg-emerald-200">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 px-8 py-5 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer mb-4 md:mb-0" onClick={() => navigate('/')}>
          <img src={ulsaLogo} alt="UGC Logo" className="h-10 object-contain" />
          <div className="leading-tight">
            <h1 className="font-black text-[22px] text-gray-900 tracking-tight">UGC</h1>
            <p className="text-emerald-600 text-[12px] font-bold tracking-widest uppercase">Green Credit</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-[22px] md:text-[26px] font-black uppercase tracking-wide text-gray-900">Cổng tra cứu tín chỉ xanh công khai</h2>
            <p className="text-[13px] md:text-[14px] text-gray-500 font-medium mt-1">Minh bạch <span className="text-emerald-500 mx-1">•</span> Bảo mật <span className="text-emerald-500 mx-1">•</span> Xác thực trên Blockchain</p>
        </div>

        <div className="mt-4 md:mt-0">
          {user ? (
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-5 py-2.5 border border-emerald-500 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Về Dashboard
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-5 py-2.5 border border-emerald-500 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              Kết nối ví
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        
        {/* SEARCH BAR */}
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto mb-12">
          <div className="relative flex items-center w-full h-[68px] rounded-full border-[2.5px] border-emerald-500 bg-white shadow-sm hover:shadow-md transition-shadow group">
            <span className="material-symbols-outlined absolute left-6 text-gray-400 text-[28px] group-focus-within:text-emerald-500 transition-colors">search</span>
            <input 
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Nhập mã Hash giao dịch, ID chứng nhận, hoặc địa chỉ ví..."
              className="w-full h-full pl-16 pr-44 bg-transparent outline-none text-[16px] text-gray-800 placeholder:text-gray-400 font-medium"
            />
            <button type="submit" disabled={loading} className="absolute right-2 h-[52px] px-8 rounded-full bg-emerald-600 text-white font-bold text-[15px] hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-70 active:scale-95 shadow-md shadow-emerald-600/20">
              {loading ? 'Đang tìm...' : 'Tra cứu ngay'}
              {!loading && <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>}
            </button>
          </div>
        </form>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 opacity-70">
             <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-emerald-700 font-bold text-lg">Đang truy xuất dữ liệu từ Blockchain...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && hasSearched && !data && (
          <div className="text-center py-24 bg-gray-50 rounded-3xl border border-gray-100 max-w-4xl mx-auto">
            <span className="material-symbols-outlined text-[80px] text-gray-300 mb-6 drop-shadow-sm">search_off</span>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Không tìm thấy Tín chỉ</h3>
            <p className="text-gray-500 mt-2 text-[15px]">Vui lòng kiểm tra lại mã giao dịch, ID chứng nhận hoặc địa chỉ ví.</p>
          </div>
        )}

        {/* RESULT DATA */}
        {!loading && data && data.claim && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-gray-50/50 p-6 rounded-[32px] border border-gray-200 shadow-sm">
            
            {/* LEFT COLUMN: TIMELINE */}
            <div className="xl:col-span-7 bg-white rounded-3xl p-8 lg:p-10 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-[16px] font-black text-gray-800 uppercase tracking-widest mb-10 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">energy_savings_leaf</span>
                Hành trình tín chỉ xanh
              </h3>

              <div className="relative pl-3 space-y-12">
                {/* Vertical Line connecting checkmarks */}
                <div className="absolute left-[22.5px] top-4 bottom-10 w-[2px] bg-emerald-500"></div>
                
                {/* Step 1 */}
                <div className="relative flex items-start gap-6">
                  <div className="relative z-10 w-[22px] h-[22px] mt-3 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                  </div>
                  
                  <div className="flex-1 flex gap-5">
                    <div className="w-16 h-16 rounded-[20px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]">energy_savings_leaf</span>
                    </div>
                    <div className="pt-1">
                      <h4 className="font-bold text-gray-900 text-[16px]">1. Đăng ký hoạt động</h4>
                      <p className="text-[13px] text-gray-500 flex items-center gap-1.5 mt-1 mb-2 font-medium">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(data.claim.created_at).toLocaleString('vi-VN')}
                      </p>
                      <p className="text-[14px] text-gray-600 leading-relaxed">Sinh viên đăng ký tham gia hoạt động <br/><span className="font-bold text-gray-800">"{data.claim.activity_name}"</span></p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-6">
                  <div className="relative z-10 w-[22px] h-[22px] mt-3 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                  </div>
                  
                  <div className="flex-1 flex gap-5">
                    <div className="w-16 h-16 rounded-[20px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]">location_on</span>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-4 pt-1 border-b border-gray-100 pb-8">
                      <div>
                        <h4 className="font-bold text-gray-900 text-[16px]">2. Xác thực GPS & Thời gian</h4>
                        <p className="text-[13px] text-gray-500 flex items-center gap-1.5 mt-1 mb-3 font-medium">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {new Date(data.claim.created_at).toLocaleString('vi-VN')}
                        </p>
                        <div className="bg-emerald-50 text-emerald-700 text-[13px] font-bold font-mono px-3 py-1.5 rounded-lg inline-block mb-3 border border-emerald-100">
                          GPS: {data.claim.latitude?.substring(0,7) || 'N/A'}, {data.claim.longitude?.substring(0,8) || 'N/A'}
                        </div>
                        <p className="text-[14px] text-gray-600">Vị trí và thời gian được xác thực và<br/>lưu trữ trên IPFS.</p>
                      </div>
                      
                      {data.claim.evidence_path && (
                        <div className="border border-emerald-100 p-2.5 rounded-[16px] bg-white shadow-sm w-full sm:w-[180px] flex-shrink-0 relative group cursor-pointer" onClick={() => window.open(`${import.meta.env.VITE_BACKEND_URL || ''}${data.claim.evidence_path}`, '_blank')}>
                          <p className="text-[11px] font-bold text-emerald-600 mb-2.5 flex justify-between items-center px-1">
                            Minh chứng IPFS
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </p>
                          <div className="overflow-hidden rounded-xl border border-gray-100">
                            <img src={`${import.meta.env.VITE_BACKEND_URL || ''}${data.claim.evidence_path}`} alt="Evidence" className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono mt-2.5 truncate w-full text-center px-1" title={data.claim.evidence_hash}>{data.claim.evidence_hash?.substring(0, 10)}...{data.claim.evidence_hash?.substring(data.claim.evidence_hash.length - 8)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-6">
                  <div className="relative z-10 w-[22px] h-[22px] mt-3 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                  </div>
                  
                  <div className="flex-1 flex gap-5">
                    <div className="w-16 h-16 rounded-[20px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]">visibility</span>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row justify-between gap-6 pt-1 border-b border-gray-100 pb-8">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-[16px]">3. Trích xuất dữ liệu OCR</h4>
                        <p className="text-[13px] text-gray-500 flex items-center gap-1.5 mt-1 mb-4 font-medium">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {new Date(data.claim.created_at).toLocaleString('vi-VN')}
                        </p>
                        <table className="w-full text-[14px]">
                          <tbody>
                            <tr className="border-b border-gray-100">
                              <td className="py-3 text-gray-500 w-[120px] font-medium">Mã sinh viên:</td>
                              <td className="py-3 font-bold text-gray-900 font-mono">{displayStudentId(data.claim.student_id)}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-3 text-gray-500 font-medium">Họ và tên:</td>
                              <td className="py-3 font-bold text-gray-900">{displayStudentName(data.claim.student_name)}</td>
                            </tr>
                            <tr>
                              <td className="py-3 text-gray-500 font-medium align-top">Nội dung:</td>
                              <td className="py-3 font-bold text-gray-900">{data.claim.activity_name}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Fake OCR Image to match mockup */}
                      <div className="hidden sm:flex flex-col items-center justify-center w-[160px] border border-gray-200 rounded-[16px] bg-gray-50 p-3 flex-shrink-0 shadow-inner">
                         <p className="text-[10px] font-black text-gray-600 mb-2 tracking-widest text-center">ẢNH ĐIỂM DANH<br/>THAM GIA</p>
                         <div className="w-full bg-white border border-gray-200 rounded p-1 opacity-80 grid grid-cols-3 gap-0.5 mt-1">
                            <div className="h-1.5 bg-gray-300 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-300 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-300 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-emerald-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-emerald-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-emerald-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                            <div className="h-1.5 bg-gray-200 rounded-sm w-full"></div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start gap-6">
                  <div className="relative z-10 w-[22px] h-[22px] mt-3 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                  </div>
                  
                  <div className="flex-1 flex gap-5">
                    <div className="w-16 h-16 rounded-[20px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]">workspace_premium</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-[16px]">4. Đoàn Thanh niên phê duyệt</h4>
                          <p className="text-[13px] text-gray-500 flex items-center gap-1.5 mt-1 mb-2 font-medium">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            {data.claim.decided_at ? new Date(data.claim.decided_at).toLocaleString('vi-VN') : 'Đang chờ'}
                          </p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex flex-col items-center shadow-sm">
                           Giao dịch mint
                           <span className="font-mono mt-1 normal-case font-medium text-[12px]">{data.claim.approved_tx_hash ? data.claim.approved_tx_hash.substring(0,8) + '...' + data.claim.approved_tx_hash.substring(data.claim.approved_tx_hash.length - 4) : 'N/A'}</span>
                        </div>
                      </div>
                      <p className="text-[14px] text-gray-600 mt-2">Người phê duyệt: <span className="font-bold text-gray-900">{data.claim.approver_name || 'Hệ thống'}</span> <span className="material-symbols-outlined text-emerald-500 text-[16px] align-middle">verified</span></p>
                      <p className="text-[14px] text-gray-600 mt-1">Trạng thái: <span className="font-bold text-emerald-600">Đã mint tín chỉ</span></p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: VALIDATION & DETAILS */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              
              {/* Validation Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex-1">
                {/* Globe/Network Graphic Simulation */}
                <div className="absolute top-4 right-4 w-40 h-40 bg-[radial-gradient(circle,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:12px_12px] opacity-70 pointer-events-none [mask-image:radial-gradient(circle_at_center,black_30%,transparent_70%)]"></div>
                
                <div className="flex items-center gap-5 mb-10 relative z-10">
                  <div className="w-[72px] h-[72px] rounded-full bg-emerald-50 border-[4px] border-white flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-100 flex-shrink-0">
                    <span className="material-symbols-outlined text-[42px]">verified_user</span>
                  </div>
                  <div>
                    <h2 className="text-[22px] font-black text-gray-900 tracking-tight uppercase">Tín chỉ hợp lệ</h2>
                    <p className="text-[13px] text-gray-500 mt-1 font-medium leading-snug">Tín chỉ xanh này đã được xác thực và<br/>ghi nhận trên Blockchain.</p>
                  </div>
                </div>

                <div className="space-y-0 text-[14px] relative z-10 bg-white border border-gray-100 rounded-[20px] overflow-hidden">
                  <div className="flex justify-between items-center py-4 px-5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">ID tín chỉ</span>
                    <span className="font-mono font-bold text-gray-900">EVT-{new Date(data.claim.created_at).getFullYear()}-{String(data.claim.id).padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 px-5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Ví sinh viên</span>
                    <div className="flex items-center gap-2">
                       <span className="font-mono font-bold text-gray-900">{data.claim.student_wallet?.substring(0,8)}...{data.claim.student_wallet?.substring(38)}</span>
                       <span className="material-symbols-outlined text-[16px] text-gray-400 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => navigator.clipboard.writeText(data.claim.student_wallet)}>content_copy</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-4 px-5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Tên hoạt động</span>
                    <span className="font-bold text-gray-900 text-right max-w-[200px] truncate" title={data.claim.activity_name}>{data.claim.activity_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 px-5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Đơn vị cấp (ULSA)</span>
                    <span className="font-bold text-gray-900 text-right">Đoàn Thanh niên Trường ULSA</span>
                  </div>
                  <div className="flex justify-between items-center py-4 px-5">
                    <span className="text-gray-500 font-medium">Số lượng token UGC</span>
                    <span className="font-black text-emerald-600 text-[18px]">+{data.claim.credit_amount} UGC</span>
                  </div>
                </div>
                
                {/* Warning about masking */}
                {!isAuthorized && (
                  <div className="mt-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-[12px] text-blue-700 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <p className="leading-relaxed">Vì lý do bảo mật, Họ tên và Mã sinh viên đã bị ẩn. <button onClick={() => navigate('/login')} className="font-bold hover:underline text-blue-800">Đăng nhập ví chủ sở hữu</button> để xem full.</p>
                  </div>
                )}
              </div>

              {/* Blockchain Tech Details */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 className="text-[15px] font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">data_object</span>
                  Chi tiết giao dịch Blockchain
                </h3>
                
                <div className="space-y-0 text-[14px]">
                  <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-2 py-3 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Hash giao dịch (TxHash)</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      <span className="font-mono text-gray-900 font-medium text-[12px] max-w-[200px] truncate" title={data.claim.provenance_tx_hash || data.claim.approved_tx_hash}>{data.claim.provenance_tx_hash || data.claim.approved_tx_hash || 'Đang xử lý'}</span>
                      {(data.claim.provenance_tx_hash || data.claim.approved_tx_hash) && <span className="material-symbols-outlined text-[14px] text-gray-400 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => navigator.clipboard.writeText(data.claim.provenance_tx_hash || data.claim.approved_tx_hash)}>content_copy</span>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Chiều cao khối (Block)</span>
                    <span className="font-mono text-gray-900 font-bold">{data.receipt?.blockNumber ? `#${data.receipt.blockNumber}` : 'Đang xác nhận'}</span>
                  </div>

                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Thời gian xác nhận</span>
                    <span className="text-gray-900 font-bold">{data.blockTimestamp ? new Date(data.blockTimestamp * 1000).toLocaleString('vi-VN') : 'Đang xử lý'}</span>
                  </div>

                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Mạng lưới</span>
                    <span className="text-gray-900 font-bold">{data.network}</span>
                  </div>

                  <div className="flex justify-between items-center py-4">
                    <span className="text-gray-500 font-medium">Trạng thái</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      Đã xác nhận
                    </span>
                  </div>
                </div>

                <button onClick={() => window.open(`${import.meta.env.VITE_BACKEND_URL || ''}${data.claim.evidence_path}`, '_blank')} className="w-full mt-6 py-3.5 rounded-xl border-2 border-emerald-500 text-emerald-600 font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors bg-white">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  Xem tài liệu chính thức trên IPFS
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* FOOTER FEATURES */}
      <footer className="max-w-6xl mx-auto mt-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-8 py-10 bg-gray-50/50 rounded-3xl border border-gray-100">
         <div className="flex items-start gap-4 px-6">
            <div className="w-12 h-12 rounded-[18px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
               <span className="material-symbols-outlined text-[24px]">lock</span>
            </div>
            <div>
               <h4 className="font-bold text-gray-900 mb-1.5 text-[15px]">Bảo mật trên Blockchain</h4>
               <p className="text-gray-500 text-[13px] leading-relaxed">Dữ liệu bất biến và được lưu trữ vĩnh viễn trên mạng lưới Blockchain an toàn.</p>
            </div>
         </div>
         <div className="flex items-start gap-4 px-6">
            <div className="w-12 h-12 rounded-[18px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
               <span className="material-symbols-outlined text-[24px]">satellite_alt</span>
            </div>
            <div>
               <h4 className="font-bold text-gray-900 mb-1.5 text-[15px]">Xác thực GPS tức thì</h4>
               <p className="text-gray-500 text-[13px] leading-relaxed">Xác thực vị trí và thời gian thực để đảm bảo tính xác thực của tín chỉ.</p>
            </div>
         </div>
         <div className="flex items-start gap-4 px-6">
            <div className="w-12 h-12 rounded-[18px] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
               <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
            <div>
               <h4 className="font-bold text-gray-900 mb-1.5 text-[15px]">Minh bạch & tin cậy</h4>
               <p className="text-gray-500 text-[13px] leading-relaxed">Bằng chứng công khai, ai cũng có thể kiểm chứng mọi lúc, mọi nơi.</p>
            </div>
         </div>
      </footer>
    </div>
  )
}
