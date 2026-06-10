import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../auth.jsx'
import logoWeb from '../logo_web.png'
import ulsaLogo from '../ulsa_logo.png'

export default function RegisterPage() {
  const { user: authUser } = useAuth()
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

  // OCR step state: '' | 'ocr' | 'register'
  const [busyStep, setBusyStep] = useState('')

  useEffect(() => {
    if (authUser) {
      nav('/')
    }
  }, [authUser, nav])

  // --- Helper: normalize Vietnamese text for comparison ---
  function normalizeViet(s) {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u00f0\u0110\u0111]/gi, 'd') // đ Đ
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  // --- OCR verify using Tesseract.js (runs locally, no API key) ---
  async function verifyStudentCard(imageFile) {
    const { createWorker } = await import('tesseract.js')

    // psm 11 = sparse text (handles rotated/skewed cards well)
    const worker = await createWorker(['vie', 'eng'], 1, {
      workerBlobURL: false,
    })
    await worker.setParameters({ tessedit_pageseg_mode: '11' })

    try {
      const { data: { text, confidence } } = await worker.recognize(imageFile)
      await worker.terminate()

      console.log('[OCR raw text]:', text)
      console.log('[OCR confidence]:', confidence)

      // If OCR read almost nothing (very blurry/bad image), skip and warn
      if (!text || text.trim().length < 5 || confidence < 10) {
        return { success: null, lowConfidence: true, text }
      }

      const ocrNorm = normalizeViet(text)

      // Chỉ cần tìm thấy MSV là đủ (tên thường khó OCR khi ảnh xoay/nền màu)
      const normId = studentId.trim().replace(/\s/g, '')
      const idFound = ocrNorm.replace(/\s/g, '').includes(normId) ||
        text.replace(/\s/g, '').includes(normId)

      return { success: idFound, idFound, text, confidence }
    } catch (err) {
      try { await worker.terminate() } catch (_) { }
      throw err
    }
  }




  async function handleRegister(e) {
    if (e) e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!user.trim() || !pass.trim() || !fullName.trim() || !studentId.trim()) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc.')
      return
    }
    if (!studentCardFile) {
      setError('Vui lòng tải lên ảnh thẻ sinh viên để xác thực.')
      return
    }
    if (!/^\d{10}$/.test(studentId)) {
      setError('Mã sinh viên ULSA phải là dãy số gồm đúng 10 chữ số.')
      return
    }

    setBusy(true)

    // ---- STEP 1: OCR XAC THUC THE SINH VIEN ----
    setBusyStep('ocr')
    try {
      const result = await verifyStudentCard(studentCardFile)

      if (result.lowConfidence) {
        // Ảnh xoay/mờ quá — OCR không đọc được, bỏ qua và để Admin duyệt thủ công
        console.warn('⚠️ OCR confidence quá thấp, bỏ qua xác thực tự động')
      } else if (result.success === false) {
        setError(`❌ Không tìm thấy mã sinh viên "${studentId}" trong ảnh thẻ. Hãy đảm bảo ảnh chụp rõ mã số (có thể thấy dãy số ${studentId} trên thẻ).`)
        setBusy(false)
        setBusyStep('')
        return
      } else {
        console.log('✅ Xác thực thẻ sinh viên thành công — MSV khớp', result)
      }
    } catch (ocrErr) {
      // If Tesseract fails to load, warn and proceed (don’t block registration)
      console.warn('⚠️ OCR không chạy được, bỏ qua xác thực:', ocrErr.message)
    }

    // ---- STEP 2: GỬi ĐĂNG KÝ ----
    setBusyStep('register')
    try {
      const fd = new FormData()
      fd.append('username', user.trim())
      fd.append('password', pass.trim())
      fd.append('full_name', fullName.trim())
      fd.append('student_id', studentId.trim())
      fd.append('student_card', studentCardFile)

      const res = await fetch('/api/auth/register', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Đăng ký tài khoản thất bại.')

      showToast('✓ Đăng ký thành công! Đang chờ duyệt.')
      setSuccessMsg('Yêu cầu tạo tài khoản đã được gửi! Vui lòng chờ Admin phê duyệt ảnh thẻ sinh viên trước khi đăng nhập.')
      setUser(''); setPass(''); setFullName(''); setStudentId('')
      setStudentCardFile(null); setStudentCardPreview('')
      setTimeout(() => nav('/login'), 6000)
    } catch (err) {
      setError(err.message)
      showToast('❌ Đăng ký thất bại!')
    } finally {
      setBusy(false)
      setBusyStep('')
    }
  }

  // Handle File Change — just set preview; OCR runs on submit
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Chỉ cho phép tải lên tệp tin định dạng hình ảnh.')
      return
    }
    setError('')
    setStudentCardFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setStudentCardPreview(reader.result)
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

        {/* LEFT SIDE: Green Card Panel */}
        <div className="w-full md:w-[45%] flex flex-col justify-between text-white relative overflow-hidden select-none"
          style={{
            background: 'linear-gradient(135deg, #2A925A 0%, #60b651 50%, #96D947 100%)',
            clipPath: 'polygon(0% 0%, 100% 0%, 92% 50%, 100% 100%, 0% 100%)',
            zIndex: 2
          }}>
          <style>{`
            @keyframes orbitSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes orbitSpin2 {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
          `}</style>

          {/* Soft radial glow overlays */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(34,197,94,0.12) 0%, transparent 60%)' }}></div>
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(0,110,47,0.25)' }}></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none" style={{ background: 'rgba(0,90,40,0.3)' }}></div>

          {/* Top: tagline */}
          <div className="relative z-10 px-8 pt-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[3px]" style={{ color: 'rgba(200,240,210,0.75)' }}>Bắt đầu hành trình xanh</p>
          </div>

          {/* CENTER: Project logo with orbit rings */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6 px-8">
            {/* Outer orbit ring */}
            <div style={{
              width: '210px', height: '210px',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 0 60px rgba(34,197,94,0.15)',
            }}>
              {/* Spinning orbit dot - clockwise */}
              <div style={{ position: 'absolute', inset: 0, animation: 'orbitSpin 5s linear infinite' }}>
                <div style={{
                  position: 'absolute', top: '-5px', left: '50%', transform: 'translateX(-50%)',
                  width: '10px', height: '10px', background: '#4ade80', borderRadius: '50%',
                  boxShadow: '0 0 14px #4ade80, 0 0 28px rgba(74,222,128,0.6)',
                }} />
              </div>
              {/* Middle ring */}
              <div style={{
                width: '168px', height: '168px',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* Counter-clockwise dot */}
                <div style={{ position: 'absolute', inset: 0, animation: 'orbitSpin2 8s linear infinite' }}>
                  <div style={{
                    position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                    width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%',
                    boxShadow: '0 0 10px #22c55e',
                  }} />
                </div>
                {/* Inner glow circle with 🌿 */}
                <div style={{
                  width: '128px', height: '128px',
                  background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, rgba(0,110,47,0.15) 60%, transparent 100%)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 30px rgba(34,197,94,0.1)',
                  animation: 'pulseGlow 4s ease-in-out infinite',
                }}>
                  <div style={{ fontSize: '52px', filter: 'drop-shadow(0 4px 14px rgba(34,197,94,0.5))' }}>🌿</div>
                </div>
              </div>
            </div>

            {/* App name */}
            <p className="mt-5 font-headline font-black text-xl tracking-tight text-white">ULSA Green Credits</p>

            {/* Description */}
            <p className="mt-3 text-center text-[11px] leading-relaxed px-4 text-white/60">
              Đăng ký tài khoản để bắt đầu ghi nhận hoạt động xanh và nhận phần thưởng tín chỉ số trên Blockchain.
            </p>

            {/* BLOCKCHAIN VERIFIED badge */}
            <div style={{
              marginTop: '20px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '100px', padding: '6px 16px',
              background: 'rgba(34,197,94,0.1)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: '7px', height: '7px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 8px #4ade80' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Blockchain Verified</span>
            </div>
          </div>


        </div>

        {/* CHEVRON ECHO LAYERS - clean layered separation */}
        <div className="hidden md:block absolute top-0 bottom-0 pointer-events-none" style={{
          left: 'calc(45% - 40px)', width: '60px', zIndex: 1,
          clipPath: 'polygon(0% 0%, 100% 0%, 60% 50%, 100% 100%, 0% 100%)',
          background: 'rgba(0,100,42,0.30)'
        }} />
        <div className="hidden md:block absolute top-0 bottom-0 pointer-events-none" style={{
          left: 'calc(45% - 25px)', width: '55px', zIndex: 0,
          clipPath: 'polygon(0% 0%, 100% 0%, 45% 50%, 100% 100%, 0% 100%)',
          background: 'rgba(0,100,42,0.15)'
        }} />


        {/* RIGHT SIDE: Interactive Register Form */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[360px] mx-auto">

            {/* Dual logos: UGC + ULSA side by side — each in same fixed box */}
            <div className="-mt-4 mb-4 flex items-center justify-center gap-4">
              {/* Logo 1: UGC */}
              <div className="w-28 h-auto flex items-center justify-center">
                <img src={logoWeb} alt="UGC Logo" className="max-w-full object-contain" style={{ maxHeight: '20px' }} />
              </div>
              {/* Divider */}
              <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
              {/* Logo 2: ULSA */}
              <div className="w-28 h-auto flex items-center justify-center">
                <img src={ulsaLogo} alt="ULSA Logo" className="object-contain" style={{ maxHeight: '39px' }} />
              </div>
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
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#006e2f] focus:ring-2 focus:ring-[#006e2f]/10 transition-all outline-none"
                    placeholder="Tên đăng nhập của bạn" type="text" value={user} onChange={e => setUser(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Mật khẩu *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#006e2f] focus:ring-2 focus:ring-[#006e2f]/10 transition-all outline-none"
                    placeholder="••••••••" type="password" value={pass} onChange={e => setPass(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Họ và tên *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#006e2f] focus:ring-2 focus:ring-[#006e2f]/10 transition-all outline-none"
                    placeholder="Họ và tên đầy đủ" type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Mã sinh viên *</label>
                  <input className="w-full bg-[#f8f9fc] border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#006e2f] focus:ring-2 focus:ring-[#006e2f]/10 transition-all outline-none"
                    placeholder="10 chữ số" type="text" maxLength={10} value={studentId} onChange={e => setStudentId(e.target.value)} />
                </div>
              </div>

              {/* Upload Thẻ sinh viên */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">Ảnh chụp Thẻ sinh viên *</label>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                {!studentCardPreview ? (
                  <div onClick={triggerFileSelect}
                    className="border border-dashed border-green-200 hover:border-green-600 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-green-50/10 hover:bg-green-50/30 group">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-[#006e2f] transition-colors text-xl mb-0.5">add_a_photo</span>
                    <p className="text-[10px] font-bold text-slate-600 group-hover:text-[#006e2f] transition-colors">Tải ảnh thẻ lên</p>
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

                {/* OCR notice */}
                {studentCardPreview && (
                  <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">document_scanner</span>
                    Ảnh sẽ được xác thực bằng OCR khi nhấn Đăng ký
                  </p>
                )}
              </div>

              <button id="registerBtn"
                className="w-full hover:brightness-110 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-headline font-bold py-3 px-4 rounded-xl shadow-lg shadow-green-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 text-xs"
                style={{ background: busy ? '#4b9e67' : 'linear-gradient(135deg, #2A925A 0%, #60b651 50%, #96D947 100%)' }}
                type="submit" disabled={busy}>
                {busyStep === 'ocr' ? (
                  <><svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang phân tích ảnh thẻ...</>
                ) : busyStep === 'register' ? (
                  <><svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang đăng ký...</>
                ) : (
                  <>Đăng ký tài khoản
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'wght' 600" }}>arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode Link */}
            <div className="mt-5 text-center text-xs">
              <span className="text-slate-500">
                Đã có tài khoản?{' '}
              </span>
              <button onClick={() => nav('/login')}
                className="font-bold text-[#006e2f] hover:underline transition-all">
                Đăng nhập ngay
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
