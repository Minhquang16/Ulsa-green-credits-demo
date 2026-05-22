import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ulsaLogo from '../ulsa_logo.png'

export default function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

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
      showToast('❌ Đăng nhập thất bại!')
    } finally {
      setBusy(false)
    }
  }

  function quickLogin(u, p) {
    setUser(u)
    setPass(p)
    // Small timeout to allow state to update visually if needed
    setTimeout(() => {
        const btn = document.getElementById('loginBtn')
        if (btn) btn.click()
    }, 100)
  }

  return (
    <div id="page-login" className="page active">
      <section className="min-h-screen bg-surface flex items-stretch md:items-center justify-center font-body p-0 md:p-6 relative overflow-hidden">
        
        {/* Background Texture */}
        <div className="hidden md:block fixed top-0 right-0 w-1/2 h-full -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-surface to-transparent z-10"></div>
          <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuDPgvW8QIZYVe_-wITFrg7vO7vc0-0pd7--S_QZjOQjrD90bxzPst6lmAbgpOOGedAasIUZJrauGiCmohZARTpWxXQiw71shtL37xL68yVizrH2orVabn_ONQeFm1jPfFMcPHPbu8xvLgdo2cboMUfpWJFmjq3bq9fdcxnbZa_ZGfIYq6vqbGS2_ClQOLvPu1l_f_3iMrRQAwqsmGhxgpmFZgOcbnw34BpzzcLybXZnVUdXJbrtUjVkEEtJ2qG2SkbrLXcHUIscSjQ')] w-full h-full bg-cover grayscale opacity-10"></div>
        </div>

        <main className="w-full max-w-[480px] flex flex-col items-center animate-in">
          <header className="mb-10 text-center">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 drop-shadow-xl">
              <img src={ulsaLogo} alt="ULSA Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-headline text-3xl font-black tracking-tight text-primary mb-1">ULSA Green Credit</h1>
            <p className="text-on-surface-variant/75 text-sm">Hệ thống quản lý tín chỉ xanh bền vững</p>
          </header>

          <div className="w-full bg-surface-container-lowest rounded-3xl p-10 ambient-glow relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-primary/5 blur-3xl"></div>
            <div className="relative z-10">
              <div className="mb-7">
                <h2 className="font-headline text-2xl font-bold text-on-surface">Chào mừng trở lại</h2>
                <p className="text-on-surface-variant text-sm mt-1">Đăng nhập để truy cập hệ thống</p>
              </div>

              {error && (
                <div id="loginError" className="mb-4 px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span id="loginErrorMsg">{error === 'Unauthorized' ? 'Sai tên đăng nhập hoặc mật khẩu.' : error}</span>
                </div>
              )}

              <form id="loginForm" className="space-y-5" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant px-1" htmlFor="username">Tên đăng nhập</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">person</span>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                      id="username" name="username" placeholder="admin / verifier / student1" type="text" autoComplete="username"
                      value={user} onChange={e => setUser(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant px-1" htmlFor="password">Mật khẩu</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                    <input className="w-full bg-surface-container-high border-none rounded-xl py-3.5 pl-12 pr-12 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 transition-all outline-none"
                      id="password" name="password" placeholder="••••••••" type={showPassword ? "text" : "password"} autoComplete="current-password"
                      value={pass} onChange={e => setPass(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button id="loginBtn" className="w-full editorial-gradient text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2" 
                  type="submit" disabled={busy}>
                  {busy ? 'Đang xác thực...' : 'Truy cập hệ thống'}
                  <span className="material-symbols-outlined text-lg" style={{fontVariationSettings:"'wght' 600"}}>arrow_forward</span>
                </button>
              </form>

              <div className="mt-5 text-center text-xs">
                <span className="text-on-surface-variant">Bạn là sinh viên mới? </span>
                <button onClick={() => nav('/register')} className="font-bold text-primary hover:underline transition-all">
                  Đăng ký tài khoản
                </button>
              </div>
            </div>
          </div>

          <section className="w-full mt-10">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-px flex-1 bg-outline-variant/30"></div>
              <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/60">Truy cập nhanh theo vai trò</p>
              <div className="h-px flex-1 bg-outline-variant/30"></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => quickLogin('student1','student123')}
                className="group flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all mb-2">
                  <span className="material-symbols-outlined text-xl">school</span>
                </div>
                <span className="font-label text-[10px] uppercase font-bold tracking-wider text-on-surface-variant group-hover:text-on-surface transition-colors">Student</span>
              </button>
              <button onClick={() => quickLogin('verifier','verifier123')}
                className="group flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all mb-2">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
                </div>
                <span className="font-label text-[10px] uppercase font-bold tracking-wider text-on-surface-variant group-hover:text-on-surface transition-colors">Verifier</span>
              </button>
              <button onClick={() => quickLogin('admin','admin123')}
                className="group flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all mb-2">
                  <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                </div>
                <span className="font-label text-[10px] uppercase font-bold tracking-wider text-on-surface-variant group-hover:text-on-surface transition-colors">Admin</span>
              </button>
            </div>
          </section>

        </main>
      </section>
    </div>
  )
}
