import React, { useState } from 'react';

export default function ClaimsTable({ 
  claims, 
  userRole, 
  busy, 
  onApprove, 
  onReject, 
  showToast 
}) {
  const mockIcons = ['🚴', '♻️', '🌳', '💧', '🚌', '📚', '⚡', '🗑️'];
  const [expandedRows, setExpandedRows] = useState({});

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
          <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="p-4 w-12 text-center">STT</th>
            <th className="p-4 w-[220px]">HOẠT ĐỘNG <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">TÍN CHỈ (UGC) <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">TRẠNG THÁI <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">THỜI GIAN <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">ĐỊA ĐIỂM <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">MINH CHỨNG <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4">TX HASH <span className="material-symbols-outlined text-[12px] align-text-bottom">unfold_more</span></th>
            <th className="p-4 text-center">THAO TÁC</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {claims.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                <p className="text-sm">Không có dữ liệu</p>
              </td>
            </tr>
          ) : claims.map((c, i) => (
            <React.Fragment key={c.id}>
              <tr 
                onClick={() => toggleRow(c.id, c.status)}
                className={`border-b ${c.status === 'rejected' ? 'border-red-50 bg-red-50/20 cursor-pointer' : 'border-slate-50'} hover:bg-slate-50/50 transition-colors group`}>
                <td className="p-4 text-center text-xs text-slate-500 font-medium">{i + 1}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[16px] ${c.status === 'rejected' ? 'bg-red-100/50' : 'bg-slate-100'}`}>
                      {mockIcons[i % mockIcons.length]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-[13px] leading-snug">{c.activity_name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{c.event_title}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">{c.activity_name?.includes('Đạp xe') ? 'Thói quen' : 'Sự kiện'}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`p-4 font-black text-[13px] ${c.status === 'rejected' ? 'text-red-600' : 'text-[#16a34a]'}`}>
                  {c.status === 'rejected' ? '+' : '+'}{c.credit_amount}
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
                    ${c.status === 'approved' ? 'text-[#16a34a]' : 
                      c.status === 'rejected' ? 'text-red-600' : 'text-orange-600'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {c.status === 'approved' ? 'check_circle' : c.status === 'rejected' ? 'cancel' : 'hourglass_bottom'}
                    </span>
                    {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Đang xử lý'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 text-center pr-4">
                    {new Date(c.created_at).toLocaleDateString('vi-VN')} {new Date(c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                  </p>
                </td>
                <td className="p-4">
                  <p className="text-[11px] font-medium text-slate-700">{new Date(c.created_at).toLocaleDateString('vi-VN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{new Date(c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
                </td>
                <td className="p-4">
                  <p className="text-[11px] font-medium text-slate-700">{c.location ? c.location.split(',')[0] : 'Khu A'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{c.location ? c.location.split(',')[1] || 'Cổng chính' : 'Cổng chính'}</p>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {c.evidence_url ? (
                      <a href={c.evidence_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 block shadow-sm hover:ring-2 hover:ring-[#16a34a]/30 transition-all">
                        {c.evidence_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || c.evidence_url.includes('googleusercontent') ? 
                          <img src={c.evidence_url.startsWith('http') ? c.evidence_url : `/api${c.evidence_url}`} alt="evidence" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-400 text-[16px]">description</span></div>
                        }
                      </a>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-300 text-[16px]">image_not_supported</span>
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-slate-500">{c.evidence_url ? '1 ảnh' : '0 ảnh'}</span>
                  </div>
                </td>
                <td className="p-4">
                  {c.tx_hash ? (
                    <div className="flex items-center gap-1.5 w-max">
                      <span className="font-mono text-[11px] text-slate-500">{c.tx_hash.slice(0, 6)}...{c.tx_hash.slice(-4)}</span>
                      <button onClick={() => {navigator.clipboard.writeText(c.tx_hash); showToast('Đã copy Tx Hash')}} className="text-slate-400 hover:text-slate-700">
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  ) : <span className="text-[11px] text-slate-400">—</span>}
                </td>
                <td className="p-4 text-center">
                  <button className="text-slate-400 hover:text-slate-800 p-1.5 rounded-md transition-colors">
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                </td>
              </tr>
              {c.status === 'rejected' && expandedRows[c.id] && (
                <tr className="bg-red-50/30 border-b border-red-50 transition-all">
                  <td colSpan={9} className="p-4">
                    <div className="flex items-center justify-between gap-8 pl-12 pr-4 py-2 border-l-2 border-red-400">
                      <div>
                        <p className="text-[11px] font-bold text-red-600 mb-1">Lý do từ chối</p>
                        <p className="text-[11px] text-slate-700">{c.reject_reason || 'Minh chứng không rõ ràng, không thể xác minh thời gian và địa điểm tham gia hoạt động.'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-red-600 mb-1">Người từ chối</p>
                        <p className="text-[11px] text-slate-700">Verifier (Đoàn/Hội)<br/><span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString('vi-VN')} {new Date(c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span></p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-red-600 mb-1">Gợi ý</p>
                        <p className="text-[11px] text-slate-700">Vui lòng cung cấp minh chứng rõ ràng hơn về thời gian và địa điểm.</p>
                      </div>
                      <div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-[#16a34a] rounded-lg text-[#16a34a] text-xs font-bold hover:bg-green-50 transition-colors bg-white shadow-sm whitespace-nowrap">
                          <span className="material-symbols-outlined text-[16px]">refresh</span> Nộp lại claim
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
