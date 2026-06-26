import React, { useState } from 'react';

export default function ClaimsTable({ 
  claims, 
  userRole, 
  busy, 
  onApprove, 
  onReject, 
  showToast,
  startIndex = 0
}) {
  const mockIcons = ['🚴', '♻️', '🌳', '💧', '🚌', '📚', '⚡', '🗑️'];
  const [expandedRows, setExpandedRows] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  const toggleRow = (id, status) => {
    if (status !== 'rejected') return;
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 hover:bg-gray-50">
            <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle w-12">STT</th>
            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Sự kiện</th>
            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Hoạt động</th>
            <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Tín chỉ (UGC)</th>
            <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Trạng thái</th>
            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Minh chứng</th>
            <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Ngày gửi</th>
            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">TX Hash</th>
            <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 align-middle">Thao tác</th>
          </tr>
        </thead>
        <tbody className="text-[13px] bg-white">
          {claims.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-12 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                <p className="text-[13px] font-medium">Không có dữ liệu</p>
              </td>
            </tr>
          ) : claims.map((c, i) => {
            const getIcon = (name) => {
              const n = (name || '').toLowerCase();
              if (n.includes('đạp xe')) return 'directions_bike';
              if (n.includes('tái chế') || n.includes('chai nhựa') || n.includes('thu gom') || n.includes('dọn rác')) return 'recycling';
              if (n.includes('trồng cây') || n.includes('cây') || n.includes('rau')) return 'park';
              if (n.includes('nước')) return 'water_drop';
              if (n.includes('xe buýt') || n.includes('bus')) return 'directions_bus';
              if (n.includes('lễ hội')) return 'celebration';
              if (n.includes('hiến máu')) return 'bloodtype';
              return 'eco';
            };
            const iconName = getIcon(c.event_title || c.activity_name);
            const imageCount = c.evidence_url ? c.evidence_url.split(',').length : 0;
            const isHabit = (c.activity_name || '').toLowerCase().includes('đạp xe') || (c.activity_name || '').toLowerCase().includes('nước') || (c.activity_name || '').toLowerCase().includes('xe buýt');
            const categoryLabel = isHabit ? 'Thói quen' : ((c.activity_name || '').toLowerCase().includes('tái chế') || (c.activity_name || '').toLowerCase().includes('rác') ? 'Tái chế' : 'Sự kiện');
            const txHash = c.tx_hash || c.provenance_tx_hash;
            const displayImageUrl = c.evidence_url || c.event_image_url;
            const displayImageCount = displayImageUrl ? displayImageUrl.split(',').length : 0;

            return (
              <React.Fragment key={c.id}>
                <tr 
                  onClick={() => toggleRow(c.id, c.status)}
                  className={`border-b ${c.status === 'rejected' ? 'border-red-50 bg-red-50/20 cursor-pointer' : 'border-gray-50'} hover:bg-gray-50/50 transition-colors group`}>
                  <td className="px-5 py-4 text-center font-bold text-gray-500 align-middle">{startIndex + i + 1}</td>
                  <td className="px-5 py-4 min-w-[240px] align-middle">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        c.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-[#f0fdf4] text-green-600'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-snug">{c.event_title || c.activity_name || 'Hoạt động'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.location ? c.location.split(',')[0] : 'Toàn trường'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    <p className="font-bold text-gray-900 leading-snug">{c.activity_name}</p>
                    <span className="inline-block px-2.5 py-1 mt-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-wider text-gray-500">
                      {categoryLabel}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-center font-black align-middle text-[15px] ${c.status === 'rejected' ? 'text-red-600' : 'text-green-600'}`}>
                    +{c.credit_amount}
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap align-middle">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mx-auto
                      ${c.status === 'approved' ? 'bg-[#f0fdf4] text-green-700 border border-green-200' : 
                        c.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {c.status === 'approved' ? 'check_circle' : c.status === 'rejected' ? 'cancel' : 'hourglass_bottom'}
                      </span>
                      {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Đang xử lý'}
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 mt-1.5">
                      {c.status === 'pending' || c.status === 'submitted' ? 'Chờ duyệt' : new Date(c.updated_at || c.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-3">
                      {displayImageCount > 0 ? (
                        <>
                          <a href={displayImageUrl.split(',')[0]} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); setPreviewImage(displayImageUrl.split(',')[0].startsWith('http') ? displayImageUrl.split(',')[0] : `/api${displayImageUrl.split(',')[0]}`); }} className="w-12 h-8 rounded-md overflow-hidden border border-gray-200 block shadow-sm hover:ring-2 hover:ring-green-500/30 cursor-pointer transition-all">
                            {displayImageUrl.split(',')[0].match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || displayImageUrl.split(',')[0].includes('googleusercontent') ? 
                              <img src={displayImageUrl.split(',')[0].startsWith('http') ? displayImageUrl.split(',')[0] : `/api${displayImageUrl.split(',')[0]}`} alt="evidence" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><span className="material-symbols-outlined text-gray-400 text-[16px]">description</span></div>
                            }
                          </a>
                          <span className="text-[12px] font-medium text-gray-600">{displayImageCount > 1 ? `${displayImageCount} ảnh` : '1 ảnh'}</span>
                        </>
                      ) : (
                        <span className="text-[12px] text-gray-400 italic">Không có</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap align-middle">
                    <p className="font-bold text-gray-700">{new Date(c.created_at).toLocaleDateString('vi-VN')}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{new Date(c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    {txHash ? (
                      <div className="flex items-center gap-2 w-max px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                        <span className="font-mono text-[11px] tracking-tight font-bold">{txHash.slice(0, 6)}...{txHash.slice(-4)}</span>
                        <button onClick={() => {navigator.clipboard.writeText(txHash); showToast('Đã copy Tx Hash')}} className="hover:text-gray-900 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                      </div>
                    ) : <span className="text-gray-400 pl-4">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center align-middle">
                    {userRole !== 'student' && (c.status === 'submitted' || c.status === 'pending') ? (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onApprove(c.id); }}
                          disabled={busy === c.id}
                          className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                          title="Duyệt yêu cầu"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onReject(c.id); }}
                          disabled={busy === c.id}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                          title="Từ chối yêu cầu"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button className="text-gray-400 hover:text-gray-800 p-1.5 rounded-md transition-colors">
                        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                      </button>
                    )}
                  </td>
                </tr>
                {c.status === 'rejected' && expandedRows[c.id] && (
                  <tr className="bg-red-50/30 border-b border-red-50 transition-all">
                    <td colSpan={9} className="p-4">
                      <div className="flex items-center justify-between gap-8 pl-12 pr-4 py-2 border-l-2 border-red-400">
                        <div>
                          <p className="text-[11px] font-bold text-red-600 mb-1">Lý do từ chối</p>
                          <p className="text-[11px] text-gray-700">{c.reject_reason || 'Minh chứng không rõ ràng, không thể xác minh thời gian và địa điểm tham gia hoạt động.'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-red-600 mb-1">Người từ chối</p>
                          <p className="text-[11px] text-gray-700">Verifier (Đoàn/Hội)<br/><span className="text-[10px] text-gray-500">{new Date(c.updated_at || c.created_at).toLocaleDateString('vi-VN')} {new Date(c.updated_at || c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span></p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-red-600 mb-1">Gợi ý</p>
                          <p className="text-[11px] text-gray-700">Vui lòng cung cấp minh chứng rõ ràng hơn về thời gian và địa điểm.</p>
                        </div>
                        <div>
                          <button className="flex items-center gap-2 px-4 py-2 border border-green-600 rounded-lg text-green-600 text-xs font-bold hover:bg-green-50 transition-colors bg-white shadow-sm whitespace-nowrap">
                            <span className="material-symbols-outlined text-[16px]">refresh</span> Nộp lại claim
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Evidence Viewer Modal */}
      {previewImage && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}></div>
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
            <div className="relative max-w-4xl max-h-[90vh] pointer-events-auto animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <img src={previewImage} alt="Phóng to minh chứng" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain border border-white/10 bg-black/50" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
