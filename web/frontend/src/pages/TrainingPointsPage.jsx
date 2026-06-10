import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function TrainingPointsPage() {
  const { api } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api('/me/training-points')
        setData(res)
      } catch (err) {
        showToast('❌ Lỗi tải Hồ sơ xanh')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [api, showToast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) return null

  const { user, stats, history } = data

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-10 font-body cv-container">
      <div className="max-w-[850px] mx-auto">
        
        {/* Action Bar (Hidden in print) */}
        <div className="flex justify-between items-center mb-8 print-hidden">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight font-headline">Hồ sơ năng lực xanh (Green CV)</h1>
            <p className="text-gray-500 text-sm mt-1">Được xác thực bởi công nghệ Blockchain</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base">print</span> Xuất PDF
          </button>
        </div>

        {/* Certificate Paper */}
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden print-paper">
          
          {/* Header */}
          <div className="bg-[#f3fcef] px-10 py-10 border-b border-green-100 flex justify-between items-center relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 opacity-5 rounded-bl-full pointer-events-none"></div>
            
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-sm border border-green-200 overflow-hidden flex-shrink-0">
                {user.student_card_image ? (
                  <img src={`/api${user.student_card_image}`} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center font-black text-green-700 text-2xl">
                    {user.full_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black text-green-800 font-headline uppercase tracking-wide">{user.full_name}</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3">
                  <p className="text-sm font-medium text-green-700"><span className="text-green-600/70 mr-1">MSV:</span> {user.student_id || '—'}</p>
                  <p className="text-sm font-medium text-green-700"><span className="text-green-600/70 mr-1">Lớp:</span> {user.class_name || '—'}</p>
                  <p className="text-sm font-medium text-green-700"><span className="text-green-600/70 mr-1">Khóa:</span> {user.cohort || '—'}</p>
                  <p className="text-sm font-medium text-green-700"><span className="text-green-600/70 mr-1">Ngày sinh:</span> {user.birth_date || '—'}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <img src="/logo192.png" alt="ULSA Logo" className="h-16 ml-auto opacity-80 mix-blend-multiply" />
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-3">Green Credit System</p>
            </div>
          </div>

          <div className="p-10 space-y-10">
            
            {/* ESG Metrics */}
            <section>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">monitoring</span> Chỉ số phát triển bền vững (ESG)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Reputation Score */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 relative overflow-hidden flex flex-col justify-center items-center text-center shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Điểm uy tín xanh</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-green-700 font-headline">{stats.score}</span>
                    <span className="text-lg font-bold text-green-600/50">/100</span>
                  </div>
                  <p className="text-xs text-green-700/70 mt-2 font-medium">Top sinh viên tích cực</p>
                </div>

                {/* Sub Metrics */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                    <span className="material-symbols-outlined text-gray-400 mb-2">fact_check</span>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ hoàn thành</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{Math.round(stats.approvalRatio * 100)}%</p>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">{stats.totalApproved} / {stats.totalClaims} hoạt động</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                    <span className="material-symbols-outlined text-gray-400 mb-2">category</span>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đa dạng hoạt động</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{stats.diversityCount} lĩnh vực</p>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">Bảo vệ môi trường, xã hội...</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                    <span className="material-symbols-outlined text-gray-400 mb-2">eco</span>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng tín chỉ xanh</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{stats.totalUgc} UGC</p>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">Tích lũy trọn đời</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                    <span className="material-symbols-outlined text-gray-400 mb-2">fingerprint</span>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ví xác thực</p>
                    <p className="font-mono text-sm font-bold text-gray-800 mt-1 truncate">
                      {user.wallet_address ? `${user.wallet_address.slice(0,6)}...${user.wallet_address.slice(-4)}` : 'Chưa liên kết'}
                    </p>
                    <p className="text-[11px] text-green-600 mt-1 font-bold">✓ Blockchain Verified</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Activity History */}
            <section>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">history</span> Lịch sử đóng góp
              </h3>

              {history.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">eco</span>
                  <p className="text-sm font-medium text-gray-500">Chưa có hoạt động xanh nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[11px]">Thời gian</th>
                        <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[11px]">Hoạt động</th>
                        <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[11px]">Lĩnh vực</th>
                        <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[11px] text-right">Tín chỉ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="px-5 py-3.5 text-gray-600 font-medium">
                            {new Date(item.created_at).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-gray-800">{item.event_title}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[200px]" title={item.provenance_tx_hash}>
                              Tx: {item.provenance_tx_hash || 'Đang đồng bộ...'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex px-2 py-1 bg-green-50 text-green-700 rounded font-bold text-[10px] uppercase tracking-wider">
                              {item.activity_name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-green-600">
                            +{item.credit_amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Footer / Signature */}
            <div className="pt-8 border-t border-gray-100 flex justify-between items-end">
              <p className="text-xs text-gray-400 font-medium max-w-sm">
                Bản lý lịch này được trích xuất tự động từ hệ thống ULSA Green Credit. 
                Các hoạt động được chứng thực tính toàn vẹn thông qua Blockchain.
              </p>
              <div className="text-center">
                <img src={new URL('../logo_web.png', import.meta.url).href} alt="Stamp" className="h-16 mx-auto opacity-20 grayscale" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Xác thực bởi ULSA</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
