import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ulsaLogo from '../logo_web.png'

const TESTIMONIALS = [
  {
    quote: "Hệ thống tín chỉ xanh ULSA giúp tôi theo dõi từng hoạt động xanh một cách minh bạch. Mọi đóng góp đều được ghi nhận trên Blockchain, không thể làm giả.",
    name: "Nguyễn Minh Anh",
    role: "Sinh viên K65 · Khoa Công nghệ Thông tin",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    quote: "Đăng nhập vào hệ thống lần đầu tôi đã bị ấn tượng bởi sự đơn giản. Chỉ vài cú click là có thể nộp claim và theo dõi trạng thái phê duyệt realtime.",
    name: "Trần Thanh Hương",
    role: "Sinh viên K64 · Khoa Kinh tế",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg"
  },
  {
    quote: "Là verifier, tôi có thể duyệt hàng loạt yêu cầu nhanh chóng. Giao diện quản trị rõ ràng, thông tin sinh viên đầy đủ — tiết kiệm rất nhiều thời gian.",
    name: "ThS. Lê Văn Đức",
    role: "Giảng viên · Phòng Công tác Sinh viên",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    quote: "Sau khi được phê duyệt, tín chỉ xuất hiện ngay trong ví Blockchain của tôi. Cảm giác sở hữu một thứ gì đó thật sự có giá trị trên chuỗi khối.",
    name: "Hoàng Đức Mạnh",
    role: "Sinh viên K63 · Khoa Lâm nghiệp",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg"
  },
]

function TestimonialPanel() {
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setShow(false)
      setTimeout(() => { setIdx(i => (i + 1) % TESTIMONIALS.length); setShow(true) }, 450)
    }, 4500)
    return () => clearInterval(t)
  }, [])

  const item = TESTIMONIALS[idx]

  return (
    <div className="h-full flex flex-col justify-between p-12 xl:p-16 relative z-10">
      {/* Top: logo area */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30 bg-white/15 backdrop-blur-sm shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
          <span className="text-white text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Blockchain Verified</span>
        </div>
      </div>

      {/* Middle: Quote card */}
      <div
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        }}
        className="rounded-2xl p-8 border border-white/40"
      >

        {/* Quote mark */}
        <div className="text-5xl font-serif text-[#164e2e]/20 leading-none mb-3 select-none">❝</div>

        <p className="text-[#0e3b20] text-[16px] font-medium leading-[1.75] mb-7">
          {item.quote}
        </p>

        <div className="flex items-center gap-3.5">
          <img
            src={item.avatar}
            alt={item.name}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 shadow-md border-2 border-white/50"
          />
          <div>
            <p className="text-[#0e3b20] font-bold text-[15px] leading-tight">{item.name}</p>
            <p className="text-[#1f663c] font-medium text-[12px] mt-0.5">{item.role}</p>
          </div>
        </div>
      </div>

      {/* Bottom: dots */}
      <div className="flex gap-2.5 items-center">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setShow(false); setTimeout(() => { setIdx(i); setShow(true) }, 300) }}
            className={`rounded-full transition-all duration-400 ${i === idx ? 'w-7 h-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
        <span className="ml-auto text-white/80 text-[11px] font-mono tracking-widest">{String(idx + 1).padStart(2, '0')} / {String(TESTIMONIALS.length).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login, user: authUser } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (authUser) {
      nav('/')
    }
  }, [authUser, nav])

  async function handleLogin(e) {
    if (e) e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(user, pass)
      showToast('✓ Đăng nhập thành công!')
      nav('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function quickLogin(u, p) {
    setUser(u); setPass(p)
    setTimeout(() => document.getElementById('loginBtn')?.click(), 100)
  }

  return (
    <div id="page-login" className="min-h-screen flex font-body">

      {/* ═══════════════════════════════════════ */}
      {/* LEFT – Login Form                       */}
      {/* ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 xl:px-28 py-12 bg-white relative overflow-hidden">

        {/* Subtle bg accent */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-50 opacity-60 translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[400px] mx-auto lg:mx-0 relative z-10">

          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-12">
            <img src={ulsaLogo} alt="UGC Logo" className="object-contain" style={{ maxHeight: '20px' }} />
            <div>
              <p className="font-black text-gray-900 text-[15px] leading-none">ULSA Green Credit</p>
              <p className="text-gray-500 text-[11px] mt-1">Hệ thống tín chỉ xanh bền vững</p>
            </div>
          </div>

          {/* Page title */}
          <div className="mb-8">
            <h1 className="font-headline text-[28px] font-black text-gray-900 leading-tight tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Chào mừng trở lại! Vui lòng nhập thông tin để tiếp tục.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div id="loginError" className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0">error</span>
              <span>{error === 'Unauthorized' ? 'Sai tên đăng nhập hoặc mật khẩu.' : error}</span>
            </div>
          )}

          {/* Form */}
          <form id="loginForm" onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5" htmlFor="username">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-gray-400 pointer-events-none">person</span>
                <input
                  id="username" name="username" type="text" autoComplete="username"
                  placeholder="Nhập tên đăng nhập của bạn"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/12 focus:bg-white transition-all"
                  value={user} onChange={e => setUser(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider" htmlFor="password">
                  Mật khẩu
                </label>
                <button type="button" className="text-[11px] text-gray-900 font-semibold hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-gray-400 pointer-events-none">lock</span>
                <input
                  id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/12 focus:bg-white transition-all"
                  value={pass} onChange={e => setPass(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              id="loginBtn" type="submit" disabled={busy}
              className="w-full h-11 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-md hover:shadow-lg"
              style={{ background: busy ? '#4b9e67' : 'linear-gradient(135deg, #2A925A 0%, #60b651 50%, #96D947 100%)' }}
            >
              {busy ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xác thực...
                </>
              ) : (
                <>
                  Đăng nhập
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 600" }}>arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Register */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Chưa có tài khoản?{' '}
            <button onClick={() => nav('/register')} className="font-bold text-gray-900 hover:underline">
              Đăng ký ngay
            </button>
          </p>

          {/* Quick access */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Truy cập nhanh</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Student', icon: 'school', u: 'student1', p: 'student123', clr: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700' },
                { label: 'Verifier', icon: 'verified_user', u: 'verifier', p: 'verifier123', clr: 'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700' },
                { label: 'Admin', icon: 'admin_panel_settings', u: 'admin', p: 'admin123', clr: 'hover:border-red-300 hover:bg-red-50 hover:text-red-600' },
              ].map(({ label, icon, u, p, clr }) => (
                <button key={label} onClick={() => quickLogin(u, p)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${clr}`}>
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* RIGHT – Testimonial Panel              */}
      {/* ═══════════════════════════════════════ */}
      <div className="hidden lg:block lg:w-[42%] xl:w-[44%] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2A925A 0%, #60b651 50%, #96D947 100%)' }}>

        {/* Soft glows matching the new gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(150,217,71,0.3) 0%, rgba(42,146,90,0.1) 45%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none translate-x-1/4 translate-y-1/4"
          style={{ background: 'radial-gradient(circle, rgba(42,146,90,0.6) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full pointer-events-none -translate-x-1/3 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, rgba(150,217,71,0.25) 0%, transparent 70%)' }} />

        {/* Grid pattern – giống ảnh mẫu */}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <TestimonialPanel />
      </div>
    </div>
  )
}
