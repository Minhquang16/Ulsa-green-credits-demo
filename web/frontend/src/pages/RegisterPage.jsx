import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'

export default function RegisterPage() {
  const { showToast } = useToast()
  const nav = useNavigate()
  const fileInputRef = useRef(null)

  // Common Fields
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Registration Fields
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentCardFile, setStudentCardFile] = useState(null)
  const [studentCardPreview, setStudentCardPreview] = useState('')

  // Handle Register
  async function handleRegister(e) {
    if (e) e.preventDefault()
    setError('')
    setSuccessMsg('')
    
    if (!user.trim() || !pass.trim() || !fullName.trim() || !studentId.trim()) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc.')
      return
    }
    if (!studentCardFile) {
      setError('Vui lòng tải lên ảnh thẻ sinh viên để Admin xác thực.')
      return
    }
    if (!/^\d{10}$/.test(studentId)) {
      setError('Mã sinh viên ULSA phải là dãy số gồm đúng 10 chữ số.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('username', user.trim())
      fd.append('password', pass.trim())
      fd.append('full_name', fullName.trim())
      fd.append('student_id', studentId.trim())
      fd.append('student_card', studentCardFile)

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: fd
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký tài khoản thất bại.')
      }

      showToast('✓ Đăng ký thành công! Đang chờ duyệt.')
      setSuccessMsg('Yêu cầu tạo tài khoản đã được gửi thành công! Vui lòng chờ Admin đối chiếu và duyệt ảnh thẻ sinh viên của bạn trước khi đăng nhập.')
      
      // Reset form
      setUser('')
      setPass('')
      setFullName('')
      setStudentId('')
      setStudentCardFile(null)
      setStudentCardPreview('')

      // Redirect to login after 6 seconds
      setTimeout(() => {
        nav('/login')
      }, 6000)

    } catch (err) {
      setError(err.message)
      showToast('❌ Đăng ký thất bại!')
    } finally {
      setBusy(false)
    }
  }

  // Handle File Change
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('Chỉ cho phép tải lên tệp tin định dạng hình ảnh.')
      return
    }
    
    setStudentCardFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setStudentCardPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Trigger file selection
  function triggerFileSelect() {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  return (
    <div id="page-register" className="min-h-screen bg-[#f3f4fd] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-body">
      
      {/* Outer background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Card Container */}
      <main className="w-full max-w-[940px] bg-white rounded-[28px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col md:flex-row relative z-10 min-h-[600px] border border-slate-100">
        
        {/* LEFT SIDE: Vibrant Space Blur Panel */}
        <div className="w-full md:w-[45%] bg-[#0d0b21] p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden select-none">
          {/* Mockup Asterisk (White) */}
          <div className="absolute top-8 left-8 z-20">
            <svg className="w-8 h-8 text-white opacity-95" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a1 1 0 0 1 1 1v6.34l4.48-4.48a1 1 0 1 1 1.42 1.42L14.42 11H21a1 1 0 1 1 0 2h-6.58l4.48 4.48a1 1 0 1 1-1.42 1.42L13 14.66V21a1 1 0 1 1-2 0v-6.34l-4.48 4.48a1 1 0 0 1-1.42-1.42L9.58 13H3a1 1 0 1 1 0-2h6.58L5.1 6.52a1 1 0 0 1 1.42-1.42L11 9.58V3a1 1 0 0 1 1-1z" />
            </svg>
          </div>

          {/* Leaf overlay blending with dark space */}
          <div className="absolute inset-0 bg-cover opacity-[0.07] mix-blend-overlay pointer-events-none" 
               style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDPgvW8QIZYVe_-wITFrg7vO7vc0-0pd7--S_QZjOQjrD90bxzPst6lmAbgpOOGedAasIUZJrauGiCmohZARTpWxXQiw71shtL37xL68yVizrH2orVabn_ONQeFn1jPfFMcPHPbu8xvLgdo2cboMUfpWJFmjq3bq9fdcxnbZa_ZGfIYq6vqbGS2_ClQOLvPu1l_f_3iMrRQAwqsmGhxgpmFZgOcbnw34BpzzcLybXZnVUdXJbrtUjVkEEtJ2qG2SkbrLXcHUIscSjQ')` }}>
          </div>

          {/* Radial Gradient Blobs for mockup look */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/25 via-[#8b5cf6]/20 to-[#db2777]/15 pointer-events-none"></div>
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-600/40 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }}></div>
          <div className="absolute bottom-12 right-0 w-72 h-72 bg-purple-600/50 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: '9s' }}></div>
          <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-pink-500/30 rounded-full blur-[70px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }}></div>

          {/* Bottom text copy */}
          <div className="mt-auto relative z-10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1.5">You can easily</p>
            <h2 className="font-headline text-2xl font-black tracking-tight leading-tight mb-3">
              Tích lũy tín chỉ xanh cho giảng đường tương lai cùng ULSA
            </h2>
            <p className="text-white/60 text-[11px] leading-relaxed font-medium">
              Đăng ký tài khoản sinh viên ULSA để bắt đầu ghi nhận hoạt động xanh và nhận phần thưởng tín chỉ số Blockchain.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Interactive Register Form */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[360px] mx-auto">
            
            {/* Mockup Asterisk (Purple/Indigo) */}
            <div className="mb-4">
              <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a1 1 0 0 1 1 1v6.34l4.48-4.48a1 1 0 1 1 1.42 1.42L14.42 11H21a1 1 0 1 1 0 2h-6.58l4.48 4.48a1 1 0 1 1-1.42 1.42L13 14.66V21a1 1 0 1 1-2 0v-6.34l-4.48 4.48a1 1 0 0 1-1.42-1.42L9.58 13H3a1 1 0 1 1 0-2h6.58L5.1 6.52a1 1 0 0 1 1.42-1.42L11 9.58V3a1 1 0 0 1 1-1z" />
              </svg>
            </div>

            {/* Title Block */}
            <div className="mb-6">
              <h1 className="font-headline text-2xl font-bold text-slate-900 tracking-tight">
                Tạo tài khoản
              </h1>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Bắt đầu hành trình xanh, đóng góp xã hội và nhận phần thưởng xứng đáng.
              </p>
            </div>

            {/* Error alerts */}
            {error && (
              <div id="registerError" className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in border border-red-100">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-start gap-2 leading-relaxed animate-in border border-emerald-100">
                <span className="material-symbols-outlined text-base mt-0.5">verified</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* REGISTRATION FORM */}
            <form id="registerForm" className="space-y-3" onSubmit={handleRegister}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Username *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                    placeholder="vd: nguyenvana" type="text" value={user} onChange={e => setUser(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Mật khẩu *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                    placeholder="••••••••" type="password" value={pass} onChange={e => setPass(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Họ và tên *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                    placeholder="HOÀNG VĂN TRƯỜNG" type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Mã sinh viên *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                    placeholder="vd: 1119090124" type="text" maxLength={10} value={studentId} onChange={e => setStudentId(e.target.value)} />
                </div>
              </div>

              {/* Upload Thẻ sinh viên */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">Ảnh chụp Thẻ sinh viên *</label>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                
                {!studentCardPreview ? (
                  <div onClick={triggerFileSelect} 
                       className="border border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-indigo-50/10 hover:bg-indigo-50/30 group">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-600 transition-colors text-xl mb-0.5">add_a_photo</span>
                    <p className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-700 transition-colors">Tải ảnh thẻ lên</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Kéo thả hoặc click vào đây</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-20 bg-slate-50 flex items-center justify-center group">
                    <img src={studentCardPreview} alt="Student Card Preview" className="h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                      <button type="button" onClick={triggerFileSelect} className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">cached</span>
                      </button>
                      <button type="button" onClick={() => { setStudentCardFile(null); setStudentCardPreview(''); }} className="p-1 rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button id="registerBtn" className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-headline font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 text-xs" 
                type="submit" disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'wght' 600"}}>arrow_forward</span>
              </button>
            </form>

            {/* Divider (or continue with) */}
            <div className="flex items-center gap-4 my-4">
              <div className="h-px flex-1 bg-slate-100"></div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">or continue with</p>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            {/* Social Buttons (Mocked Layout from Image) */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => showToast('Chức năng liên kết Behance đang phát triển')}
                className="flex items-center justify-center py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
                <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.22 5.38c1.33 0 2.36.32 3.08.97.71.65 1.07 1.54 1.07 2.68 0 .76-.17 1.41-.52 1.95-.35.54-.86.96-1.53 1.25.85.25 1.5.7 1.97 1.34.46.64.7 1.43.7 2.37 0 1.22-.38 2.2-1.15 2.92-.76.72-1.85 1.08-3.27 1.08H1v-14.6h7.22zm-3.3 5.48h3.04c.59 0 1.05-.12 1.38-.37.33-.25.5-.62.5-1.11 0-.46-.16-.81-.48-1.04-.32-.24-.77-.35-1.36-.35H4.92v2.87zm0 5.47h3.29c.65 0 1.15-.14 1.49-.43.34-.29.5-.72.5-1.28 0-.53-.17-.94-.52-1.22-.34-.28-.85-.42-1.52-.42H4.92v3.35zm14.44-4.52c.03-.98-.21-1.78-.71-2.4-.5-.62-1.23-.93-2.18-.93-.9 0-1.61.3-2.13.91-.52.6-.79 1.42-.81 2.42h5.83zm-5.83 2.02c.05.95.34 1.68.86 2.18.52.5 1.22.75 2.1.75.76 0 1.38-.17 1.86-.52.48-.35.8-.82.95-1.42h2.82c-.3 1.26-1 2.25-2.1 2.95-1.1.7-2.45 1.05-4.05 1.05-1.84 0-3.32-.57-4.43-1.7-1.11-1.14-1.67-2.67-1.67-4.58 0-1.88.55-3.39 1.64-4.53 1.09-1.14 2.52-1.71 4.29-1.71 1.76 0 3.16.55 4.2 1.66 1.04 1.1 1.54 2.61 1.49 4.53h-8.01zm.91-8.52h5.65v1.27h-5.65V5.33z" />
                </svg>
              </button>
              <button onClick={() => showToast('Chức năng liên kết Google đang phát triển')}
                className="flex items-center justify-center py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </button>
              <button onClick={() => showToast('Chức năng liên kết Facebook đang phát triển')}
                className="flex items-center justify-center py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
            </div>

            {/* Toggle Mode Link */}
            <div className="mt-5 text-center text-xs">
              <span className="text-slate-500">
                Đã có tài khoản?{' '}
              </span>
              <button onClick={() => nav('/login')} 
                className="font-bold text-indigo-600 hover:underline transition-all">
                Đăng nhập ngay
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
