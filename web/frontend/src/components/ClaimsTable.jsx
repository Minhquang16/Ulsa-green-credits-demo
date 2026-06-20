import React from 'react';

export default function ClaimsTable({ 
  claims, 
  userRole, 
  busy, 
  onApprove, 
  onReject, 
  showToast 
}) {
  const mockIcons = ['🚴', '♻️', '🌳', '💧', '🚌', '📚', '⚡', '🗑️'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="p-4 w-12 text-center">STT</th>
            <th className="p-4 w-[220px]">SỰ KIỆN</th>
            <th className="p-4">HOẠT ĐỘNG</th>
            <th className="p-4">TÍN CHỈ (UGC)</th>
            <th className="p-4">TRẠNG THÁI</th>
            <th className="p-4">MINH CHỨNG</th>
            <th className="p-4">NGÀY GỬI</th>
            <th className="p-4">TX HASH</th>
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
            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
              <td className="p-4 text-center text-xs text-slate-500 font-medium">{i + 1}</td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[16px]">
                    {mockIcons[i % mockIcons.length]}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800 text-[13px] leading-snug">{c.event_title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{c.location || 'Khu A'}</p>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <p className="font-bold text-slate-800 text-[13px] leading-snug">{c.activity_name}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500">{c.activity_name?.includes('Đạp xe') ? 'Thói quen' : 'Sự kiện'}</span>
              </td>
              <td className="p-4 font-black text-[#16a34a] text-[13px]">+{c.credit_amount}</td>
              <td className="p-4">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
                  ${c.status === 'approved' ? 'bg-[#e2f3e9] text-[#16a34a]' : 
                    c.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  <span className="material-symbols-outlined text-[12px]">
                    {c.status === 'approved' ? 'check_circle' : c.status === 'rejected' ? 'cancel' : 'pending'}
                  </span>
                  {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Đang xử lý'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">
                  {new Date(c.created_at).toLocaleDateString('vi-VN')}
                </p>
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
                <p className="text-[11px] font-medium text-slate-700">{new Date(c.created_at).toLocaleDateString('vi-VN')}</p>
                <p className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
              </td>
              <td className="p-4">
                {c.tx_hash ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border border-slate-100 w-max">
                    <span className="font-mono text-[10px] text-slate-500">{c.tx_hash.slice(0, 6)}...{c.tx_hash.slice(-4)}</span>
                    <button onClick={() => {navigator.clipboard.writeText(c.tx_hash); showToast('Đã copy Tx Hash')}} className="text-slate-400 hover:text-slate-700">
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                    </button>
                  </div>
                ) : <span className="text-[10px] text-slate-400">—</span>}
              </td>
              <td className="p-4 text-center">
                {userRole !== 'student' && c.status === 'submitted' ? (
                  <div className="flex justify-center gap-2">
                     <button onClick={() => onApprove(c.id)} disabled={busy === c.id} className="text-[#16a34a] hover:bg-green-50 p-1.5 rounded-md transition-colors"><span className="material-symbols-outlined text-[18px]">check</span></button>
                     <button onClick={() => onReject(c.id)} disabled={busy === c.id} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                  </div>
                ) : (
                  <button className="text-slate-400 hover:text-slate-800 p-1.5 rounded-md transition-colors">
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
