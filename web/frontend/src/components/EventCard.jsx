/**
 * EventCard.jsx
 * Component thẻ hiển thị một sự kiện xanh — dùng chung cho tất cả roles.
 * Tách ra từ EventsPage.jsx để tái sử dụng và giảm kích thước file gốc.
 */

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '../context/ToastContext.jsx'
import QRScanner from './QRScanner.jsx'
import QRGenerator from './QRGenerator.jsx'

// ── Helper ─────────────────────────────────────────────────────────────────────
function formatDate(s) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} — ${date}`
  } catch { return s }
}

export function getEventStatus(start_at, end_at) {
  if (!start_at || !end_at) return 'ongoing'
  const now = new Date()
  const start = new Date(start_at)
  const end = new Date(end_at)
  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'ongoing'
  return 'completed'
}

// ── Event Details Modal ────────────────────────────────────────────────────────
function EventDetailsModal({ ev, imgSrc, onClose, userRole, showQRScanner }) {
  const status = getEventStatus(ev.start_at, ev.end_at)
  const isOngoing = status === 'ongoing'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="relative h-48 shrink-0 bg-slate-100 flex items-center justify-center">
          <img alt={ev.title} className="w-full h-full object-contain" src={imgSrc} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">{ev.activity_name}</span>
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">+{ev.credit_amount} UGC</span>
          </div>

          <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-4 leading-tight">{ev.title}</h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Địa điểm</p>
                <p className="text-sm">{ev.location || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">schedule</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Thời gian</p>
                <p className="text-sm">Bắt đầu: {formatDate(ev.start_at)}</p>
                <p className="text-sm">Kết thúc: {formatDate(ev.end_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary mt-0.5">description</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Nhiệm vụ của bạn</p>
                <p className="text-sm whitespace-pre-line leading-relaxed">{ev.description || 'Tham gia sự kiện và quét mã QR tại địa điểm tổ chức để nhận UGC.'}</p>
              </div>
            </div>
          </div>

          {userRole === 'student' && (
            <div className="pt-4 border-t border-outline-variant/20">
              {status === 'upcoming' && (
                <div className="p-4 rounded-xl bg-orange-50 text-orange-800 text-sm font-medium text-center border border-orange-100">
                  ⏳ Nhiệm vụ chưa bắt đầu. Hãy quay lại sau nhé!
                </div>
              )}
              {status === 'completed' && (
                <div className="p-4 rounded-xl bg-surface-variant text-on-surface-variant text-sm font-medium text-center">
                  ✅ Nhiệm vụ đã kết thúc.
                </div>
              )}
              {isOngoing && (
                <button onClick={() => { onClose(); showQRScanner() }}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 transition-all">
                  <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                  Quét QR Check-in Nhận UGC
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Event Card ─────────────────────────────────────────────────────────────────

const IMAGE_MAP = {
  'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
  'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
  'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs'
}
const DEFAULT_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8'

export function EventCard({ ev, userRole, onSubmitClaim, busy, onEdit, onDelete }) {
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

  const tags = ['Sự kiện']
  if (ev.activity_name?.toLowerCase().includes('đạp xe')) tags.push('Cá nhân', 'Hàng ngày')
  else if (ev.activity_name?.toLowerCase().includes('tái chế')) tags.push('Nhóm', 'Cuối tuần')
  else tags.push('Nhóm', 'Dài hạn')

  const activityLower = ev.activity_name?.toLowerCase() || ''
  let imgSrc = IMAGE_MAP[Object.keys(IMAGE_MAP).find(k => activityLower.includes(k))] || DEFAULT_IMG
  if (ev.activity_description && ev.activity_description.startsWith('/uploads')) {
    imgSrc = `/api${ev.activity_description}`
  }

  const start = new Date(ev.start_at)
  const now = new Date()
  const diffTime = start - now
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  let timeStr = 'Đang diễn ra'
  if (status === 'upcoming') {
    timeStr = diffDays === 0 ? `Bắt đầu sau ${diffHours} giờ` : `Bắt đầu sau ${diffDays} ngày`
  } else if (status === 'completed') {
    timeStr = 'Đã kết thúc'
  } else {
    const end = new Date(ev.end_at)
    const diffE = Math.floor((end - now) / (1000 * 60 * 60 * 24))
    const diffEH = Math.floor(((end - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    timeStr = `Còn ${diffE} ngày ${diffEH} giờ`
  }

  return (
    <>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row overflow-hidden group">
        {/* Image */}
        <div className="w-full sm:w-[260px] shrink-0 h-[180px] sm:h-[160px] relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setShowDetails(true)}>
          <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-sm ${statusConfig[status].color}`}>
            <span className="material-symbols-outlined text-[12px]">{statusConfig[status].icon}</span>
            {statusConfig[status].label}
          </div>
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-lg text-[11px] font-extrabold shadow-md flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {ev.credit_amount} UGC
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-slate-100 cursor-pointer group-hover:bg-slate-50/50 transition-colors" onClick={() => setShowDetails(true)}>
          <span className="text-[10px] font-extrabold text-[#16a34a] uppercase tracking-wider mb-1.5">{ev.activity_name}</span>
          <h3 className="text-base font-extrabold text-slate-800 leading-snug mb-1 line-clamp-1">{ev.title}</h3>
          <p className="text-xs text-slate-500 mb-3 line-clamp-1">{ev.description || 'Tham gia sự kiện xanh...'}</p>
          <div className="flex items-center gap-4 mb-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
              <span className="truncate max-w-[120px]">{ev.location || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
              <span>{new Date(ev.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            {tags.map(t => <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">{t}</span>)}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full sm:w-[180px] shrink-0 p-5 flex flex-col items-center justify-center bg-white gap-3">
          <div className="text-center w-full">
            <div className="inline-block px-4 py-1.5 bg-[#f0f9f4] text-[#16a34a] font-extrabold text-sm rounded-lg mb-2">
              +{ev.credit_amount} UGC
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeStr}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 mt-2">
            {status === 'ongoing' ? (
              <button onClick={() => setShowScanner(true)} className="w-full py-2 bg-[#16a34a] text-white text-xs font-bold rounded-lg shadow-sm shadow-[#16a34a]/30 hover:bg-[#15803d] transition-colors">
                Tham gia
              </button>
            ) : (
              <button onClick={() => setShowDetails(true)} className="w-full py-2 bg-white border border-[#16a34a] text-[#16a34a] text-xs font-bold rounded-lg hover:bg-[#16a34a]/5 transition-colors">
                Xem trước
              </button>
            )}
            <button onClick={() => setShowDetails(true)} className="w-full py-1.5 text-[11px] font-bold text-[#16a34a] hover:underline flex items-center justify-center gap-1">
              Xem chi tiết <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Admin/verifier actions */}
          {userRole !== 'student' && (
            <div className="w-full flex gap-2 border-t border-slate-100 pt-2">
              <button onClick={onEdit}
                className="flex-1 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">edit</span> Sửa
              </button>
              <button onClick={onDelete}
                className="flex-1 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">delete</span> Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {showDetails && createPortal(
        <EventDetailsModal
          ev={ev}
          imgSrc={imgSrc}
          userRole={userRole}
          onClose={() => setShowDetails(false)}
          showQRScanner={() => setShowScanner(true)}
        />,
        document.body
      )}

      {showQR && createPortal(<QRGenerator eventId={ev.id} onClose={() => setShowQR(false)} />, document.body)}
      {showScanner && createPortal(
        <QRScanner eventId={ev.id} onClose={() => setShowScanner(false)}
          onSuccess={(msg, isOffline) => {
            setShowScanner(false)
            showToast(isOffline ? '⚠️ ' + msg : '✅ ' + msg)
            setCheckedInStatus(isOffline ? 'offline' : 'online')
            if (!isOffline) setOpen(true)
          }} />,
        document.body
      )}
    </>
  )
}
