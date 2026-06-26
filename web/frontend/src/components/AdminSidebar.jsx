import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import img1 from '../assets/img_sidebar/1.png'
import img2 from '../assets/img_sidebar/2.png'
import img3 from '../assets/img_sidebar/3.png'
import img5 from '../assets/img_sidebar/5.png'

const bannerImages = [img1, img2, img3, img5]
import { cn } from '../lib/utils'
import logoWeb from '../logo_web.png'
import { PanelLeft } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { TooltipPortal } from './ui/tooltip-portal'
import '../styles/student-sidebar.css'

// ─── Help Modal ────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'UGC là gì?',
    a: 'UGC (ULSA Green Credit) là tín chỉ xanh được cấp khi sinh viên tham gia các hoạt động thân thiện môi trường tại trường ULSA. 1 UGC tương đương với 1 tín chỉ hoạt động xanh đã được xác nhận trên Blockchain.'
  },
  {
    q: 'Làm sao để nhận UGC?',
    a: 'Đăng ký tham gia sự kiện trong mục "Hoạt động", điểm danh bằng QR Code khi đến nơi, sau đó nộp "Yêu cầu ghi nhận" tại mục "Ghi nhận". Sau khi Ban Tổ chức duyệt, UGC sẽ được cấp vào ví của bạn.'
  },
  {
    q: 'Điểm rèn luyện và UGC có liên quan không?',
    a: 'Có. UGC tích lũy được phản ánh vào Điểm Rèn Luyện cuối kỳ của bạn theo tỷ lệ quy định của nhà trường. Xem chi tiết trong mục "Điểm Rèn Luyện".'
  },
  {
    q: 'Tôi có thể dùng UGC để làm gì?',
    a: 'UGC có thể đổi lấy các ưu đãi hấp dẫn (voucher, phần thưởng, giấy chứng nhận) tại mục "Ưu đãi". Một số ưu đãi đặc biệt yêu cầu hạng thành viên nhất định.'
  },
  {
    q: 'Ví Blockchain là gì?',
    a: 'Mỗi sinh viên sở hữu một địa chỉ ví riêng trên mạng Blockchain cục bộ (Hardhat). Toàn bộ giao dịch UGC đều được ghi nhận minh bạch, không thể giả mạo trên chuỗi khối này. Xem địa chỉ ví và số dư trong mục "Hồ Sơ".'
  },
  {
    q: 'Tôi quên mật khẩu, phải làm gì?',
    a: 'Liên hệ với Ban Công nghệ Thông tin ULSA qua email hoặc đến trực tiếp Phòng CNTT để được cấp lại mật khẩu. Hiện tại chức năng quên mật khẩu tự động đang được phát triển.'
  }
]

const GUIDE_STEPS = [
  { icon: 'app_registration', title: 'Đăng ký tài khoản', desc: 'Dùng email sinh viên @ulsa.edu.vn để đăng ký.' },
  { icon: 'event_available', title: 'Tham gia sự kiện', desc: 'Vào mục Hoạt động → Đăng ký sự kiện phù hợp.' },
  { icon: 'qr_code_scanner', title: 'Điểm danh QR', desc: 'Quét mã QR tại sự kiện để xác nhận có mặt.' },
  { icon: 'verified', title: 'Nộp Ghi nhận', desc: 'Vào Ghi nhận → Nộp yêu cầu → Chờ duyệt.' },
  { icon: 'eco', title: 'Nhận UGC', desc: 'Sau khi được duyệt, UGC được cấp vào ví Blockchain.' },
  { icon: 'redeem', title: 'Đổi ưu đãi', desc: 'Dùng UGC để đổi quà tặng trong mục Ưu đãi.' },
]

function HelpModal({ onClose }) {
  const [tab, setTab] = useState('faq')
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 fade-in duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 22 }}>help</span>
              </div>
              <div>
                <h2 className="text-[16px] font-extrabold text-gray-900">Trung tâm Trợ giúp</h2>
                <p className="text-[11px] text-gray-400">ULSA Green Credit System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4">
            {[
              { id: 'faq', label: 'Câu hỏi thường gặp', icon: 'quiz' },
              { id: 'guide', label: 'Hướng dẫn', icon: 'menu_book' },
              { id: 'contact', label: 'Liên hệ', icon: 'contact_support' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* FAQ Tab */}
            {tab === 'faq' && (
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[13px] font-semibold text-gray-800 pr-3">{item.q}</span>
                      <span
                        className="material-symbols-outlined text-gray-400 flex-shrink-0 transition-transform duration-200"
                        style={{ fontSize: 18, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 pt-0">
                        <p className="text-[12.5px] text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Guide Tab */}
            {tab === 'guide' && (
              <div className="space-y-3">
                <p className="text-[12px] text-gray-400 font-medium mb-4">Làm theo các bước dưới đây để bắt đầu tích lũy UGC:</p>
                {GUIDE_STEPS.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 19 }}>{step.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          Bước {i + 1}
                        </span>
                        <h4 className="text-[13px] font-bold text-gray-800">{step.title}</h4>
                      </div>
                      <p className="text-[12px] text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contact Tab */}
            {tab === 'contact' && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 20 }}>school</span>
                    <h3 className="text-[13px] font-extrabold text-gray-800">Ban Công nghệ Thông tin - ULSA</h3>
                  </div>
                  <p className="text-[12px] text-gray-500 leading-relaxed">
                    Trường Đại học Lao động - Xã hội (ULSA)<br/>
                    43 Trần Duy Hưng, Cầu Giấy, Hà Nội
                  </p>
                </div>

                {[
                  { icon: 'mail', label: 'Email hỗ trợ', value: 'cntt@ulsa.edu.vn', href: 'mailto:cntt@ulsa.edu.vn' },
                  { icon: 'phone', label: 'Điện thoại', value: '(024) 3553 3717', href: 'tel:02435533717' },
                  { icon: 'schedule', label: 'Giờ làm việc', value: 'Thứ 2 – Thứ 6: 7:30 – 17:00', href: null },
                  { icon: 'place', label: 'Phòng CNTT', value: 'Phòng 101, Tòa nhà A', href: null },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 18 }}>{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-[13px] font-bold text-emerald-600 hover:underline">{item.value}</a>
                      ) : (
                        <p className="text-[13px] font-semibold text-gray-700">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <div className="flex gap-2 items-start">
                    <span className="material-symbols-outlined text-blue-500 flex-shrink-0" style={{ fontSize: 18 }}>info</span>
                    <p className="text-[12px] text-blue-700 leading-relaxed">
                      Hệ thống UGC đang trong giai đoạn <strong>Demo/Thử nghiệm</strong>. Mọi dữ liệu giao dịch Blockchain chạy trên mạng cục bộ Hardhat, không phải mạng thật.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-[13px] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export default function AdminSidebar({ isCollapsed, setIsCollapsed, isAdmin }) {
  const loc = useLocation()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (isCollapsed) return
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isCollapsed])

  const navItems = isAdmin ? [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/events', label: 'Hoạt động', icon: 'event_note' },
    { path: '/admin/claims', label: 'Phê duyệt', icon: 'verified_user' },
    { path: '/admin/rewards', label: 'Ưu đãi', icon: 'redeem' },
    { type: 'section', label: 'Quản trị', adminOnly: true },
    { path: '/admin/users', label: 'Người dùng', icon: 'manage_accounts', adminOnly: true },
    { path: '/admin/treasury', label: 'Kho quỹ', icon: 'account_balance', adminOnly: true },
    { type: 'section', label: 'Blockchain' },
    { path: '/admin/provenance', label: 'Truy xuất', icon: 'policy' }
  ] : [
    { path: '/verifier/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/verifier/events', label: 'Hoạt động', icon: 'event_note' },
    { path: '/verifier/claims', label: 'Phê duyệt', icon: 'verified_user' },
    { path: '/verifier/rewards', label: 'Ưu đãi', icon: 'redeem' },
    { type: 'section', label: 'Blockchain' },
    { path: '/verifier/provenance', label: 'Truy xuất', icon: 'policy' }
  ]



  return (
    <>
      <aside className={cn("student-sidebar", isCollapsed ? "student-sidebar--collapsed" : "student-sidebar--expanded")}>

        {/* Sidebar Header / Logo */}
        <div className="sidebar-header">
          <Link
            to={isAdmin ? "/admin/dashboard" : "/verifier/dashboard"}
            className={cn("sidebar-logo-link", isCollapsed ? "sidebar-logo-link--collapsed" : "sidebar-logo-link--expanded")}
          >
            <div className="sidebar-logo-container">
              <img src={logoWeb} alt="UGC Logo" className="sidebar-logo-img--expanded" />
            </div>
          </Link>

          {isCollapsed && (
            <Link to={isAdmin ? "/admin/dashboard" : "/verifier/dashboard"} className="sidebar-logo-collapsed-link">
              <img src={logoWeb} alt="UGC Logo" className="sidebar-logo-img--collapsed" />
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("sidebar-toggle-btn", isCollapsed && "sidebar-toggle-btn--collapsed")}
          >
            <PanelLeft className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1 w-full">
          <div className="sidebar-nav-container flex flex-col min-h-full">
            {navItems.map((item, idx) => {
              if (item.adminOnly && !isAdmin) return null;

              if (item.type === 'section') {
                return (
                  <div key={`section-${idx}`} className={cn("mt-4 mb-2 px-5 transition-all duration-300", isCollapsed ? "opacity-0 h-0 overflow-hidden m-0 pt-0 pb-0" : "opacity-100")}>
                    <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-widest truncate">{item.label}</p>
                  </div>
                )
              }

              const isActive = loc.pathname === item.path
              return (
                <div key={item.path} className="sidebar-nav-item">
                  <TooltipPortal content={item.label} disabled={!isCollapsed}>
                    <Link
                      to={item.path}
                      className={cn("sidebar-nav-link", isActive ? "sidebar-nav-link--active" : "sidebar-nav-link--inactive")}
                    >
                      <span className={cn("material-symbols-outlined sidebar-nav-icon", isActive ? "sidebar-nav-icon--active" : "sidebar-nav-icon--inactive")}>
                        {item.icon}
                      </span>
                      <span className={cn("sidebar-nav-label", isCollapsed ? "sidebar-nav-label--collapsed" : "sidebar-nav-label--expanded")}>
                        {item.label}
                      </span>
                    </Link>
                  </TooltipPortal>
                </div>
              )
            })}



            <div className="mt-auto"></div>

            {/* Bottom Banner */}
            <div className={cn("sidebar-banner-container", isCollapsed ? "sidebar-banner-container--collapsed" : "sidebar-banner-container--expanded px-[12px] pb-6 w-full")}>
              <div
                className="relative rounded-[20px] overflow-hidden shadow-sm flex flex-col w-full"
                style={{ height: '295px' }}
              >
                {bannerImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="banner background"
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out z-0",
                      currentImageIndex === idx ? "opacity-100" : "opacity-0"
                    )}
                  />
                ))}

                {/* Overlay Content */}
                <div className="sidebar-banner__overlay">
                  <div className="sidebar-banner__header">
                    <h4 className="sidebar-banner__title">
                      Dấu ấn xanh ULSA
                    </h4>
                    <p className="sidebar-banner__subtitle">
                      Tích lũy tín chỉ UGC <br /> Lan tỏa giá trị bền vững.
                    </p>
                  </div>
                  <div className="sidebar-banner__footer">
                    <button className="sidebar-banner__button" style={{ whiteSpace: 'nowrap' }}>
                      Tìm hiểu thêm <span className="material-symbols-outlined sidebar-banner__button-icon">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Help Modal - rendered outside sidebar to avoid z-index issues */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  )
}
