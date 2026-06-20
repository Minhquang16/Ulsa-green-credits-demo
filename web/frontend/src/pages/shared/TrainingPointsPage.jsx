import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function TrainingPointsPage() {
  const dataESG = [
    { subject: 'Môi trường', student: 85, avg: 70, fullMark: 100 },
    { subject: 'Xã hội', student: 90, avg: 75, fullMark: 100 },
    { subject: 'Học tập', student: 80, avg: 70, fullMark: 100 },
    { subject: 'Lãnh đạo', student: 75, avg: 65, fullMark: 100 },
    { subject: 'Cộng đồng', student: 95, avg: 80, fullMark: 100 },
  ];

  const CustomTick = ({ payload, x, y, textAnchor }) => {
    const data = dataESG.find(d => d.subject === payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-8} textAnchor={textAnchor} fill="#4b5563" fontSize={11} fontWeight={600}>
          {payload.value}
        </text>
        <text x={0} y={6} textAnchor={textAnchor} fill="#0f9d58" fontSize={13} fontWeight={800}>
          {data ? data.student : ''}<tspan fill="#9ca3af" fontSize={10} fontWeight={600}>/100</tspan>
        </text>
      </g>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 font-sans bg-[#f8fcf9] min-h-screen">
      
      {/* Top Banner & Leaderboard Row */}
      <div className="flex flex-col xl:flex-row gap-6 mb-6">
        
        {/* Left: Green CV Banner */}
        <div className="flex-1 bg-gradient-to-br from-[#1b8c4c] to-[#0f9d58] rounded-[24px] p-8 text-white relative overflow-hidden shadow-lg border border-green-700/20">
          {/* Background decorators */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            
            {/* Avatar & Shield */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center bg-green-800 text-4xl font-bold">
                SV
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#fbbc05] rounded-lg rotate-45 flex items-center justify-center border-2 border-white shadow-sm">
                <span className="material-symbols-outlined text-white -rotate-45 text-xl">eco</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-green-100">Hồ sơ năng lực xanh (Green CV)</h2>
                <span className="material-symbols-outlined text-[14px] text-white">verified</span>
              </div>
              <h1 className="text-3xl font-black mb-3">Sinh viên 1</h1>
              <div className="text-sm text-green-50 mb-4 flex flex-wrap gap-4 justify-center md:justify-start">
                <span>MSV: D19CN02</span>
                <span className="opacity-50">•</span>
                <span>Khoa: Công nghệ thông tin</span>
                <span className="opacity-50">•</span>
                <span>Lớp: D19CN02</span>
              </div>
              <div className="text-sm text-green-50 mb-6 flex flex-col md:flex-row gap-2 md:gap-6 justify-center md:justify-start">
                <span>Email: student@ulsa.edu.vn</span>
                <span>Thành viên từ: 06/2026</span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                  Hạng hiện tại <span className="material-symbols-outlined text-[14px] text-[#fbbc05]">diamond</span> <strong className="text-white">Emerald</strong>
                </span>
                <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                  Chuỗi xanh: <span className="text-[#fbbc05]">🔥</span> <strong>15 ngày liên tiếp</strong>
                </span>
              </div>
            </div>

            {/* Score Ring */}
            <div className="flex flex-col items-center shrink-0 mt-6 md:mt-0">
              <p className="text-xs font-bold uppercase tracking-widest text-green-100 mb-3">Điểm rèn luyện hiện tại</p>
              <div className="relative w-36 h-36 flex items-center justify-center mb-2">
                {/* SVG Ring */}
                <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbc05" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * 87) / 100} strokeLinecap="round" />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-black">87</span>
                  <span className="text-sm text-green-200">/100</span>
                </div>
              </div>
              <p className="text-xs text-green-100 mb-1">Xếp loại</p>
              <p className="text-lg font-bold mb-2 text-[#fbbc05]">Xuất sắc</p>
              <div className="flex items-center gap-1 text-sm font-bold text-white">
                <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                Top 15
              </div>
              <p className="text-[10px] text-green-100">Toàn trường</p>
            </div>
          </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="w-full xl:w-[380px] bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Bảng xếp hạng</h3>
          
          <div className="flex items-center bg-gray-50 rounded-xl p-1 mb-6">
            <button className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-xs font-bold shadow-sm">Toàn trường</button>
            <button className="flex-1 text-gray-500 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-100 transition-colors">Khoa</button>
            <button className="flex-1 text-gray-500 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-100 transition-colors">Lớp</button>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 flex justify-center text-yellow-500 font-black">1</div>
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs">🥇</div>
              <p className="text-sm font-medium text-gray-900 flex-1">Nguyễn Văn A</p>
              <p className="text-sm font-bold text-gray-900">92</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 flex justify-center text-gray-400 font-black">2</div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs">🥈</div>
              <p className="text-sm font-medium text-gray-900 flex-1">Trần Minh B</p>
              <p className="text-sm font-bold text-gray-900">90</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 flex justify-center text-amber-700 font-black">3</div>
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs">🥉</div>
              <p className="text-sm font-medium text-gray-900 flex-1">Lê Gia C</p>
              <p className="text-sm font-bold text-gray-900">89</p>
            </div>
            
            <div className="text-center text-gray-400 text-xs">...</div>
            
            {/* Current user */}
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-100">
              <div className="w-6 flex justify-center text-green-700 font-black text-sm">15</div>
              <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800">SV</div>
              <p className="text-sm font-bold text-green-800 flex-1">Sinh viên 1</p>
              <p className="text-sm font-bold text-green-800">87</p>
            </div>
          </div>

          <button className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
            Xem đầy đủ bảng xếp hạng <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-green-600">eco</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Điểm rèn luyện</p>
            <p className="text-2xl font-black text-green-700">87 <span className="text-sm font-medium text-gray-400">/ 100</span></p>
            <p className="text-[11px] text-green-600 font-medium mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span> 12 điểm so với HK trước
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
            <span className="text-yellow-500 font-bold">U</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">UGC Tích lũy</p>
            <p className="text-2xl font-black text-green-700">1.250 <span className="text-sm font-medium text-gray-400">UGC</span></p>
            <p className="text-[11px] text-green-600 font-medium mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span> 320 UGC so với HK trước
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-500">groups</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Hoạt động đã tham gia</p>
            <p className="text-2xl font-black text-green-700">48</p>
            <p className="text-[11px] text-green-600 font-medium mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span> 14 hoạt động so với HK trước
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-500">emoji_events</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Xếp hạng toàn trường</p>
            <p className="text-2xl font-black text-green-700">Top 15 <span className="text-sm font-medium text-gray-400">/ 2.356 SV</span></p>
            <p className="text-[11px] text-green-600 font-medium mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span> tăng 8 hạng
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Radar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 w-full">
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Phân bổ điểm theo tiêu chí (ESG)</h3>
            <span className="material-symbols-outlined text-[14px] text-gray-400">info</span>
          </div>
          
          <div className="w-full h-[250px] my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={dataESG}>
                <PolarGrid gridType="polygon" />
                <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
                <Radar name="Sinh viên" dataKey="student" stroke="#0f9d58" fill="#0f9d58" fillOpacity={0.4} />
                <Radar name="Trung bình" dataKey="avg" stroke="#9ca3af" fill="none" strokeDasharray="3 3" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 w-full">
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0f9d58]"></span> Điểm của bạn
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-transparent border border-gray-400"></span> Trung bình sinh viên
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-6">Tiến trình học kỳ 1 (2025 - 2026)</h3>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-4xl font-black text-green-700">87</p>
              <p className="text-gray-400 font-medium">/ 100</p>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">Xuất sắc</span>
            </div>
            
            <div className="relative h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-[#0f9d58] rounded-full transition-all duration-1000" style={{ width: '87%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            
            <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-green-500">eco</span>
              Bạn cần thêm <strong className="text-gray-900">13 điểm</strong> để đạt mức tối đa
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 flex-1 content-start">
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors cursor-pointer">
              <p className="text-[10px] text-gray-500 font-medium mb-1">Bắt buộc</p>
              <p className="text-sm font-bold text-gray-900 mb-1">52<span className="text-[10px] text-gray-400 font-normal">/60</span></p>
              <div className="w-full h-1 bg-gray-200 rounded-full"><div className="h-full bg-[#0f9d58] rounded-full" style={{ width: '86%' }}></div></div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors cursor-pointer">
              <p className="text-[10px] text-gray-500 font-medium mb-1">Bổ trợ</p>
              <p className="text-sm font-bold text-gray-900 mb-1">20<span className="text-[10px] text-gray-400 font-normal">/20</span></p>
              <div className="w-full h-1 bg-gray-200 rounded-full"><div className="h-full bg-[#0f9d58] rounded-full" style={{ width: '100%' }}></div></div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors cursor-pointer">
              <p className="text-[10px] text-gray-500 font-medium mb-1">Tự chọn</p>
              <p className="text-sm font-bold text-gray-900 mb-1">15<span className="text-[10px] text-gray-400 font-normal">/20</span></p>
              <div className="w-full h-1 bg-gray-200 rounded-full"><div className="h-full bg-[#fbbc05] rounded-full" style={{ width: '75%' }}></div></div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <p className="text-[10px] text-gray-500 font-medium mb-1 text-center">Khuyến khích</p>
              <p className="text-sm font-bold text-gray-900 mb-1">0<span className="text-[10px] text-gray-400 font-normal">/0</span></p>
              <div className="w-full h-1 bg-gray-200 rounded-full"></div>
            </div>
          </div>

          <button className="mt-auto w-full py-2.5 rounded-xl border border-green-200 text-xs font-bold text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
            Xem chi tiết các tiêu chí <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Badges Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Huy hiệu đã đạt</h3>
              <button className="text-[10px] text-green-600 font-bold hover:underline flex items-center">Xem tất cả <span className="material-symbols-outlined text-[12px]">arrow_forward</span></button>
            </div>
            <div className="flex justify-between items-end px-2">
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className="w-10 h-10 bg-[#8b5a2b] rounded-lg rotate-45 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white -rotate-45 text-[18px]">eco</span>
                </div>
                <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">Khởi đầu xanh</p>
                <p className="text-[8px] text-gray-400">10/06/2026</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className="w-10 h-10 bg-gray-400 rounded-lg rotate-45 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white -rotate-45 text-[18px]">thumb_up</span>
                </div>
                <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">Tích cực</p>
                <p className="text-[8px] text-gray-400">18/06/2026</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className="w-10 h-10 bg-[#fbbc05] rounded-lg rotate-45 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white -rotate-45 text-[18px]">emoji_events</span>
                </div>
                <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">Xuất sắc</p>
                <p className="text-[8px] text-gray-400">28/06/2026</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className="w-10 h-10 bg-[#0f9d58] rounded-lg rotate-45 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white -rotate-45 text-[18px]">recycling</span>
                </div>
                <p className="text-[9px] font-bold text-gray-700 text-center leading-tight">Tái chế</p>
                <p className="text-[8px] text-gray-400">05/07/2026</p>
              </div>
              {/* Highlight Badge */}
              <div className="flex flex-col items-center gap-1.5 scale-110 origin-bottom group cursor-pointer">
                <div className="w-12 h-12 bg-[#0d8246] rounded-lg rotate-45 flex items-center justify-center mb-1 border-2 border-green-300 shadow-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white -rotate-45 text-2xl drop-shadow-md">diamond</span>
                </div>
                <p className="text-[10px] font-bold text-green-700 text-center leading-tight">Emerald</p>
                <p className="text-[8px] text-gray-400">15/07/2026</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Huy hiệu đang mở khóa</h3>
              <button className="text-[10px] text-green-600 font-bold hover:underline flex items-center">Xem tất cả <span className="material-symbols-outlined text-[12px]">arrow_forward</span></button>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                  <span className="material-symbols-outlined text-[#0f9d58]">recycling</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">Người hùng tái chế</p>
                  <p className="text-[10px] text-gray-500 mb-2">Thu gom 50 vỏ chai hoặc giấy tái chế</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0f9d58] rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 w-8 text-right">35<span className="text-gray-400 font-normal">/50</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                  <span className="material-symbols-outlined text-[#0f9d58]">directions_bike</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">Chiến binh xe đạp</p>
                  <p className="text-[10px] text-gray-500 mb-2">Tham gia đạp xe xanh 20 lần</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0f9d58] rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 w-8 text-right">12<span className="text-gray-400 font-normal">/20</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Timeline */}
        <div className="flex-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Lịch sử hoạt động gần đây</h3>
            <button className="text-[10px] text-green-600 font-bold hover:underline flex items-center">Xem tất cả <span className="material-symbols-outlined text-[12px]">arrow_forward</span></button>
          </div>
          
          <div className="relative flex justify-between px-2 md:px-6 flex-1 items-center">
            {/* Connecting line */}
            <div className="absolute top-[20px] left-12 right-12 h-0.5 bg-gray-100 -z-10 hidden sm:block"></div>
            
            <div className="flex flex-col items-center w-28 relative group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border-4 border-white mb-2 relative z-10 shadow-sm group-hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">directions_bike</span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mb-0.5">12/06/2026</p>
              <p className="text-[11px] font-bold text-gray-900 text-center mb-1 leading-tight">Đạp xe xanh</p>
              <p className="text-[9px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-center mb-1">Sự kiện</p>
              <p className="text-[10px] font-bold text-[#0f9d58] mb-1">+10 UGC</p>
              <span className="text-[9px] bg-green-50 text-[#0f9d58] px-2 py-0.5 rounded font-medium">Đã duyệt</span>
            </div>

            <div className="flex flex-col items-center w-28 relative group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border-4 border-white mb-2 relative z-10 shadow-sm group-hover:bg-green-100 transition-colors">
                <span className="material-symbols-outlined text-[#0f9d58] text-[18px]">park</span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mb-0.5">15/06/2026</p>
              <p className="text-[11px] font-bold text-gray-900 text-center mb-1 leading-tight">Trồng cây gây rừng</p>
              <p className="text-[9px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-center mb-1">Sự kiện</p>
              <p className="text-[10px] font-bold text-[#0f9d58] mb-1">+15 UGC</p>
              <span className="text-[9px] bg-green-50 text-[#0f9d58] px-2 py-0.5 rounded font-medium">Đã duyệt</span>
            </div>

            <div className="flex flex-col items-center w-28 relative group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border-4 border-white mb-2 relative z-10 shadow-sm group-hover:bg-green-100 transition-colors">
                <span className="material-symbols-outlined text-[#0f9d58] text-[18px]">recycling</span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mb-0.5">18/06/2026</p>
              <p className="text-[11px] font-bold text-gray-900 text-center mb-1 leading-tight">Thu gom rác tái chế</p>
              <p className="text-[9px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-center mb-1">Hoạt động</p>
              <p className="text-[10px] font-bold text-[#0f9d58] mb-1">+20 UGC</p>
              <span className="text-[9px] bg-green-50 text-[#0f9d58] px-2 py-0.5 rounded font-medium">Đã duyệt</span>
            </div>

            <div className="flex flex-col items-center w-28 relative group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white mb-2 relative z-10 shadow-sm group-hover:bg-blue-100 transition-colors">
                <span className="material-symbols-outlined text-blue-500 text-[18px]">card_giftcard</span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mb-0.5">20/06/2026</p>
              <p className="text-[11px] font-bold text-gray-900 text-center mb-1 leading-tight">Đổi voucher căng-tin</p>
              <p className="text-[9px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-center mb-1">Đổi quà</p>
              <p className="text-[10px] font-bold text-red-500 mb-1">-5 UGC</p>
              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">Thành công</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="w-full lg:w-[320px] bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-4">Thống kê nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-blue-500 mb-2 text-[24px]">calendar_month</span>
              <p className="text-2xl font-black text-gray-900 mb-1">15</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Ngày liên tiếp tham gia</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-[#fbbc05] mb-2 text-[24px]">schedule</span>
              <p className="text-2xl font-black text-gray-900 mb-1">128</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Giờ hoạt động tình nguyện</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-[#0f9d58] mb-2 text-[24px]">eco</span>
              <p className="text-2xl font-black text-gray-900 mb-1">2,5 kg</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Rác tái chế đã thu gom</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-[#0d8246] mb-2 text-[24px]">park</span>
              <p className="text-2xl font-black text-gray-900 mb-1">18</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Cây xanh đã trồng</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
