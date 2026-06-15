const fs = require('fs');
const path = require('path');

const file = '/Users/tho/Desktop/Work/CV cá nhân/Ulsa-green-credits-demo-main/web/frontend/src/pages/EventsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the Grid Header & Filters and the Grid itself
const mainContentRegex = /\{\/\*\s*Grid Header & Filters\s*\*\/\}([\s\S]*?)<\/main>/;

const newMainContent = `
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="relative group inline-flex self-start">
                <span className="text-[11px] font-bold text-[#2A925A] bg-[#2A925A]/10 px-3 py-1.5 rounded-full cursor-help flex items-center gap-1.5 border border-[#2A925A]/20 transition-colors group-hover:bg-[#2A925A]/20">
                  🌱 Dấu ấn Xanh của bạn
                </span>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3.5 bg-slate-800 text-white text-xs leading-relaxed rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  Mỗi sự kiện tham gia là một thay đổi tích cực. Hành động ngay để tích lũy UGC và lan tỏa phong cách sống xanh!
                  <div className="absolute top-1/2 right-full -mt-1.5 -mr-1.5 w-3 h-3 bg-slate-800 rotate-45"></div>
                </div>
              </div>
            </div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-slate-800 mt-1">Kiến tạo mảng xanh, gom đầy tín chỉ</h2>
            <p className="text-sm text-slate-500 font-medium">Tham gia các hoạt động xanh để nhận UGC và lan tỏa lối sống bền vững 🌱</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto self-end lg:pb-2">
            <div className="relative flex-1 lg:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm hoạt động..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-[36px] pl-9 pr-4 bg-white border border-solid border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#2A925A] focus:ring-1 focus:ring-[#2A925A] transition-all box-border shadow-sm placeholder:text-slate-400"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex rounded-full overflow-hidden border border-solid border-slate-200 bg-white text-sm font-medium text-slate-700 h-[36px] hover:bg-slate-50 transition-colors items-stretch shadow-sm box-border">
                  <div className="px-4 flex items-center justify-center border-r border-solid border-slate-200">
                    {statusFilter === 'all' && 'Tất cả trạng thái'}
                    {statusFilter === 'upcoming' && 'Sắp diễn ra'}
                    {statusFilter === 'ongoing' && 'Đang diễn ra'}
                    {statusFilter === 'completed' && 'Đã kết thúc'}
                  </div>
                  <div className="px-2.5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 border border-solid border-slate-200">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2">
                  Tất cả trạng thái
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('upcoming')} className="rounded-md cursor-pointer py-2">
                  Sắp diễn ra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ongoing')} className="rounded-md cursor-pointer py-2">
                  Đang diễn ra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')} className="rounded-md cursor-pointer py-2">
                  Đã kết thúc
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main List Column */}
          <div className="flex-1 min-w-0 w-full">
            {/* Filter Tabs */}
            <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-2 custom-scrollbar">
              {['Tất cả', 'Đang diễn ra', 'Sắp diễn ra', 'Mới nhất', 'Gần tôi'].map((tab, idx) => (
                <button key={tab} 
                  className={\`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all \${idx === 0 ? 'bg-[#2A925A] text-white font-bold shadow-md shadow-[#2A925A]/20' : 'bg-white text-slate-600 font-medium border border-slate-200 hover:bg-slate-50'}\`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {filteredEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} userRole={user.role}
                  onSubmitClaim={submitClaim} busy={busy}
                  onEdit={() => handleEdit(ev)} onDelete={() => deleteEvent(ev.id)} />
              ))}
              {filteredEvents.length === 0 && (
                <div className="py-12 text-center text-on-surface-variant bg-white rounded-2xl border border-slate-100">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                  <p>Không tìm thấy nhiệm vụ nào phù hợp.</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-center pb-8">
              <button className="flex items-center gap-1 text-sm font-bold text-[#2A925A] hover:underline">
                Xem thêm <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4">
            
            {/* Nhiệm vụ tuần này */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Nhiệm vụ tuần này</h3>
                <span className="text-xs font-bold text-[#2A925A] hover:underline cursor-pointer">Xem tất cả</span>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2A925A] text-lg">check_circle</span>
                    <span className="text-xs font-medium text-slate-700">Đạp xe ít nhất 3 lần</span>
                  </div>
                  <span className="text-xs font-bold text-[#2A925A]">2/3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2A925A] text-lg">check_circle</span>
                    <span className="text-xs font-medium text-slate-700">Mang bình nước cá nhân</span>
                  </div>
                  <span className="text-xs font-bold text-[#2A925A]">1/1</span>
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                    <span className="text-xs font-medium text-slate-700">Trồng cây</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">0/1</span>
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                    <span className="text-xs font-medium text-slate-700">Thu gom rác</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">0/1</span>
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                    <span className="text-xs font-medium text-slate-700">Đi xe buýt / Đi chung xe</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">0/1</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                <div className="bg-[#2A925A] h-full rounded-full" style={{width: '40%'}}></div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">2 / 5 hoàn thành</p>
            </div>

            {/* Chuỗi xanh */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Chuỗi xanh</h3>
                <span className="text-xs font-bold text-[#2A925A] hover:underline cursor-pointer">Xem lịch sử</span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🔥</span>
                <div>
                  <h4 className="font-extrabold text-xl text-slate-800 leading-none mb-1">12 ngày</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Liên tiếp</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                  <div key={d} className="flex flex-col items-center gap-2">
                    <div className={\`w-6 h-6 rounded-full flex items-center justify-center \${i < 6 ? 'bg-[#2A925A] text-white' : 'bg-slate-100 border border-slate-200'}\`}>
                      {i < 6 && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hoạt động nổi bật */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Hoạt động nổi bật</h3>
                <span className="text-xs font-bold text-[#2A925A] hover:underline cursor-pointer">Xem tất cả</span>
              </div>
              <div className="bg-[#f0f9f4] rounded-xl p-4 border border-[#e2f3e9] relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 opacity-80 pointer-events-none">
                  <span className="text-6xl">🌍</span>
                </div>
                <span className="inline-block px-2 py-0.5 bg-white text-[#2A925A] text-[9px] font-bold tracking-widest rounded-md uppercase mb-2 shadow-sm">Sự kiện lớn</span>
                <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug pr-8 relative z-10">Ngày Môi trường Thế giới 2026</h4>
                <p className="text-[11px] text-slate-500 mb-3 pr-6 relative z-10">Tham gia các hoạt động xanh nhận ngay</p>
                <div className="inline-flex items-center justify-center px-3 py-1 bg-white border border-[#2A925A]/20 text-[#2A925A] font-extrabold text-sm rounded-lg mb-2 shadow-sm relative z-10">
                  +50 UGC
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 relative z-10">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Còn 02 ngày 14 giờ
                </div>
              </div>
            </div>

            {/* Gợi ý cho bạn */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Gợi ý cho bạn</h3>
                <span className="text-xs font-bold text-[#2A925A] hover:underline cursor-pointer">Xem tất cả</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#2A925A]/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl text-[#2A925A]">🚴</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs mb-0.5 truncate">Marathon Xanh ULSA 2026</h4>
                  <p className="text-[10px] text-slate-500 truncate mb-1">Thử thách đạp xe 30km trong 7 ngày</p>
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-extrabold text-[#2A925A]">+30 UGC</span>
                     <button className="px-3 py-1 bg-white border border-[#2A925A] text-[#2A925A] text-[10px] font-bold rounded-full hover:bg-[#2A925A] hover:text-white transition-colors">
                       KHÁM PHÁ
                     </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
`;

content = content.replace(mainContentRegex, newMainContent);

// 2. Rewrite EventCard component to match the horizontal design
const eventCardRegex = /function EventCard\(\{ ev, userRole, onSubmitClaim, busy, onEdit, onDelete \}\) \{([\s\S]*?)(?=export default|function EventDetailsModal|$)/;

// Wait, EventCard is defined near the bottom. I'll just find "function EventCard" and replace it to the end of the file.
const eventCardStartIdx = content.indexOf('function EventCard({');
if (eventCardStartIdx !== -1) {
  content = content.slice(0, eventCardStartIdx) + `function EventCard({ ev, userRole, onSubmitClaim, busy, onEdit, onDelete }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [checkedInStatus, setCheckedInStatus] = useState(false)
  const { showToast } = useToast()

  const status = getEventStatus(ev.start_at, ev.end_at)
  
  const statusConfig = {
    upcoming: { color: 'bg-indigo-500 text-white', label: 'SẮP DIỄN RA', icon: 'event' },
    ongoing: { color: 'bg-orange-500 text-white', label: 'ĐANG DIỄN RA', icon: 'local_fire_department' },
    completed: { color: 'bg-slate-500 text-white', label: 'ĐÃ KẾT THÚC', icon: 'check_circle' }
  }

  // Derive some tags
  const tags = ['Sự kiện']
  if (ev.activity_name?.toLowerCase().includes('đạp xe')) tags.push('Cá nhân', 'Hàng ngày')
  else if (ev.activity_name?.toLowerCase().includes('tái chế')) tags.push('Nhóm', 'Cuối tuần')
  else tags.push('Nhóm', 'Dài hạn')

  const imageMap = {
    'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
    'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
    'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs'
  }
  const defaultImg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8'
  const activityLower = ev.activity_name?.toLowerCase() || ''
  
  let imgSrc = imageMap[Object.keys(imageMap).find(k => activityLower.includes(k))] || defaultImg
  if (ev.activity_description && ev.activity_description.startsWith('/uploads')) {
    imgSrc = \`/api\${ev.activity_description}\`
  }

  // Calculate days remaining
  const start = new Date(ev.start_at);
  const now = new Date();
  const diffTime = start - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let timeStr = 'Đang diễn ra';
  if (status === 'upcoming') {
     timeStr = \`Bắt đầu sau \${diffDays} ngày\`;
     if (diffDays === 0) timeStr = \`Bắt đầu sau \${diffHours} giờ\`;
  } else if (status === 'completed') {
     timeStr = 'Đã kết thúc';
  } else {
     const end = new Date(ev.end_at);
     const diffE = Math.floor((end - now) / (1000 * 60 * 60 * 24));
     const diffEH = Math.floor(((end - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
     timeStr = \`Còn \${diffE} ngày \${diffEH} giờ\`;
  }

  return (
    <>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row overflow-hidden group">
        {/* Left: Image Box */}
        <div className="w-full sm:w-[260px] shrink-0 h-[180px] sm:h-[160px] relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setShowDetails(true)}>
          <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          
          {/* Top Badge */}
          <div className={\`absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-sm \${statusConfig[status].color}\`}>
            <span className="material-symbols-outlined text-[12px]">{statusConfig[status].icon}</span>
            {statusConfig[status].label}
          </div>

          {/* Bottom Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-lg text-[11px] font-extrabold shadow-md flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {ev.credit_amount} UGC
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 p-5 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-slate-100 cursor-pointer group-hover:bg-slate-50/50 transition-colors" onClick={() => setShowDetails(true)}>
          <span className="text-[10px] font-extrabold text-[#2A925A] uppercase tracking-wider mb-1.5">{ev.activity_name}</span>
          <h3 className="text-base font-extrabold text-slate-800 leading-snug mb-1 line-clamp-1">{ev.title}</h3>
          <p className="text-xs text-slate-500 mb-3 line-clamp-1">{ev.description || 'Tham gia sự kiện xanh...'}</p>
          
          <div className="flex items-center gap-4 mb-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
              <span className="truncate max-w-[120px]">{ev.location || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
              <span>{new Date(ev.start_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} — {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-auto">
            {tags.map(t => (
              <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">{t}</span>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full sm:w-[180px] shrink-0 p-5 flex flex-col items-center justify-center bg-white gap-3">
           <div className="text-center w-full">
             <div className="inline-block px-4 py-1.5 bg-[#f0f9f4] text-[#2A925A] font-extrabold text-sm rounded-lg mb-2">
               +{ev.credit_amount} UGC
             </div>
             <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
               <span className="material-symbols-outlined text-[12px]">schedule</span>
               {timeStr}
             </div>
           </div>

           <div className="w-full flex flex-col gap-2 mt-2">
             {status === 'ongoing' ? (
                <button onClick={() => setShowScanner(true)} className="w-full py-2 bg-[#2A925A] text-white text-xs font-bold rounded-lg shadow-sm shadow-[#2A925A]/30 hover:bg-[#207a4a] transition-colors">
                  Tham gia
                </button>
             ) : (
                <button onClick={() => setShowDetails(true)} className="w-full py-2 bg-white border border-[#2A925A] text-[#2A925A] text-xs font-bold rounded-lg hover:bg-[#2A925A]/5 transition-colors">
                  Xem trước
                </button>
             )}
             <button onClick={() => setShowDetails(true)} className="w-full py-1.5 text-[11px] font-bold text-[#2A925A] hover:underline flex items-center justify-center gap-1">
               Xem chi tiết <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
             </button>
           </div>
        </div>
      </div>

      {showDetails && (
        createPortal(
          <EventDetailsModal 
            ev={ev} 
            imgSrc={imgSrc}
            userRole={userRole}
            onClose={() => setShowDetails(false)} 
            showQRScanner={() => setShowScanner(true)}
          />, 
          document.body
        )
      )}

      {showQR && createPortal(<QRGenerator eventId={ev.id} onClose={() => setShowQR(false)} />, document.body)}
      {showScanner && createPortal(
        <QRScanner eventId={ev.id} onClose={() => setShowScanner(false)}
          onSuccess={(msg, isOffline) => { 
            setShowScanner(false); 
            showToast(isOffline ? '⚠️ ' + msg : '✅ ' + msg); 
            setCheckedInStatus(isOffline ? 'offline' : 'online');
            if (!isOffline) setOpen(true);
          }} />,
        document.body
      )}
    </>
  )
}
`;
}

fs.writeFileSync(file, content);
console.log('Successfully patched EventsPage.jsx');
