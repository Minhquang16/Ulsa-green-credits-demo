import React, { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CalendarIcon, ChevronDownIcon, TrendingUp } from "lucide-react"
import { Line, LineChart, CartesianGrid, XAxis } from "recharts"
import ClaimsDataTable from '../../components/ClaimsDataTable'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

import iconCard1 from '../../assets/icon_dashboard/o_1.png'
import iconCard4 from '../../assets/icon_dashboard/o_4.png'
import logoWeb from '../../logo_web.png'
import '../../styles/admin/admin-dashboard.css'

function shortAddr(h) { return h ? h.slice(0, 6) + '...' + h.slice(-4) : '—' }
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'Vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function renderAvatar(u, sizeClass = "w-10 h-10") {
  // Preset photo avatars for mock students to match mockup
  if (u?.username === 'minhanh') {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm`}>
        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" alt="Nguyễn Minh Anh" className="w-full h-full object-cover" />
      </div>
    )
  }
  if (u?.username === 'quocbao') {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm`}>
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" alt="Trần Quốc Bảo" className="w-full h-full object-cover" />
      </div>
    )
  }
  if (u?.username === 'giahuy') {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm`}>
        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80" alt="Lê Gia Huy" className="w-full h-full object-cover" />
      </div>
    )
  }

  if (u?.student_card_image) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200`}>
        <img src={`/api${u.student_card_image}`} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    )
  }

  let bgClass = "bg-[#1e293b]" // Dark slate/navy to match mockup
  let label = "??"
  if (u?.role === 'admin') {
    bgClass = "bg-rose-600"
    label = "AD"
  } else if (u?.role === 'verifier') {
    bgClass = "bg-indigo-600"
    label = "VF"
  } else if (u?.full_name) {
    const cleanName = u.full_name.replace(/\s*\(Bạn\)\s*$/gi, '').trim();
    label = cleanName.split(' ').pop()?.slice(0, 2).toUpperCase() || "??"
  }

  return (
    <div className={`${sizeClass} rounded-full ${bgClass} text-white font-semibold flex items-center justify-center flex-shrink-0 select-none shadow-sm text-xs`}>
      {label}
    </div>
  )
}

function LineSparkline({ value, positive = true }) {
  const pts = [20, 35, 28, 45, 38, 52, 47, 60].map((y, x) => ({ x: x * 14, y: 80 - y }))
  const d = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`
  return (
    <svg width="80" height="32" viewBox="0 0 98 80" className="overflow-visible">
      <path d={d} fill="none" stroke={positive ? '#16a34a' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function renderTrend(trend, pos, isBottom = false) {
  if (trend === '● Đang kết nối') {
    return <span className={`text-[10px] font-bold ${isBottom ? 'text-black' : 'text-green-600'}`}>{trend}</span>
  }
  if (trend === 'Tất cả đã duyệt') {
    return <span className="text-[10px] font-bold text-black">{trend}</span>
  }
  if (trend === 'Cần xử lý ngay') {
    return <span className="text-[10px] font-bold text-red-500">{trend}</span>
  }

  const match = trend?.match(/^(\+\d+(?:\.\d+)?%)(.*)$/)
  if (match) {
    const pct = match[1]
    const rest = match[2]
    return (
      <span className="text-[10px] font-bold text-green-600">
        {pct}
        {rest && <span className="text-black">{rest}</span>}
      </span>
    )
  }

  return <span className={`text-[10px] font-bold ${pos ? 'text-green-600' : 'text-red-500'}`}>{trend}</span>
}

// Admin charts logic only
export default function AdminDashboard() {
  const { api, user, logout } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()
  const location = useLocation()

  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [contract, setContract] = useState('')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [wallets, setWallets] = useState([])
  const [walletSearch, setWalletSearch] = useState('')
  const [walletRole, setWalletRole] = useState('all')
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [showNotif, setShowNotif] = useState(false)
  const [showAddNewsModal, setShowAddNewsModal] = useState(false)
  const [newsList, setNewsList] = useState([])
  const [selectedNews, setSelectedNews] = useState(null)
  const [newNews, setNewNews] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'Tin tức',
    author: 'Ban Quản trị UGC'
  })

  const isAdmin = user.role === 'admin' || user.role === 'verifier'

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search') || ''
    setWalletSearch(query)
  }, [location.search])

  useEffect(() => {
    const DEFAULT_NEWS = [
      {
        id: 1,
        title: "ULSA phát động Chiến dịch 'Chủ Nhật Xanh' thu gom rác thải công nghệ",
        summary: "Nhận ngay tới 50 UGC khi quyên góp pin cũ, điện thoại hỏng tại sảnh A1 vào Chủ nhật này.",
        content: "Nhằm nâng cao nhận thức bảo vệ môi trường, Ban Giám hiệu ULSA kết hợp với CLB Môi Trường phát động chiến dịch 'Chủ Nhật Xanh'. Sinh viên mang các thiết bị điện tử hỏng, pin cũ đến quyên góp tại sảnh A1 sẽ được quy đổi điểm rèn luyện và cộng trực tiếp Green Credits (UGC) vào tài khoản ví cá nhân.",
        date: "20/06/2026",
        author: "Ban Giám hiệu & CLB Môi Trường",
        category: "Sự kiện",
        icon: "campaign",
        badgeColor: "bg-emerald-100 text-emerald-800"
      },
      {
        id: 2,
        title: "ULSA đạt cột mốc 10.000 tín chỉ xanh UGC được lưu hành trên Blockchain",
        summary: "Cộng đồng sinh viên ULSA tích cực giảm thiểu hơn 500kg khí thải CO2 thông qua hoạt động đạp xe.",
        content: "Tính đến tháng 6/2026, hệ thống UGC đã ghi nhận hơn 1.200 lượt đăng ký hoạt động xanh từ sinh viên. Trong đó hoạt động đi bộ/đạp xe chiếm tỷ lệ cao nhất. Ban Quản trị dự án gửi lời cảm ơn và tuyên dương các tập thể lớp có đóng góp tích cực nhất trong tháng.",
        date: "18/06/2026",
        author: "Ban Quản trị UGC",
        category: "Tin tức",
        icon: "newspaper",
        badgeColor: "bg-blue-100 text-blue-800"
      },
      {
        id: 3,
        title: "Thông báo bảo trì hệ thống RPC Node và nâng cấp Smart Contract",
        summary: "Hệ thống ghi nhận điểm sẽ tạm ngừng đồng bộ trong khoảng thời gian từ 23h đến 24h ngày 22/6.",
        content: "Để phục vụ công tác nâng cấp mạng lưới Hardhat Node và tích hợp thêm tính năng ví cá nhân bảo mật, toàn bộ hệ thống API và đồng bộ giao dịch on-chain sẽ được tạm khóa trong 1 giờ. Số dư UGC của sinh viên hoàn toàn an toàn và sẽ hiển thị bình thường sau bảo trì.",
        date: "15/06/2026",
        author: "Phòng CNTT & Đảm bảo chất lượng",
        category: "Thông báo",
        icon: "build",
        badgeColor: "bg-amber-100 text-amber-800"
      }
    ]
    const stored = localStorage.getItem('ulsa_green_news')
    if (stored) {
      try {
        setNewsList(JSON.parse(stored))
      } catch (e) {
        setNewsList(DEFAULT_NEWS)
      }
    } else {
      localStorage.setItem('ulsa_green_news', JSON.stringify(DEFAULT_NEWS))
      setNewsList(DEFAULT_NEWS)
    }
  }, [])

  const handlePublishNews = (e) => {
    e.preventDefault()
    if (!newNews.title || !newNews.summary || !newNews.content) {
      showToast('Vui lòng điền đầy đủ thông tin bài đăng!')
      return
    }
    const iconMap = {
      'Sự kiện': 'campaign',
      'Tin tức': 'newspaper',
      'Thông báo': 'build'
    }
    const colorMap = {
      'Sự kiện': 'bg-emerald-100 text-emerald-800',
      'Tin tức': 'bg-blue-100 text-blue-800',
      'Thông báo': 'bg-amber-100 text-amber-800'
    }
    const freshItem = {
      id: Date.now(),
      ...newNews,
      date: new Date().toLocaleDateString('vi-VN'),
      icon: iconMap[newNews.category] || 'campaign',
      badgeColor: colorMap[newNews.category] || 'bg-emerald-100 text-emerald-800'
    }
    const updated = [freshItem, ...newsList]
    setNewsList(updated)
    localStorage.setItem('ulsa_green_news', JSON.stringify(updated))
    showToast('✅ Đăng tin tức/thông báo xanh thành công!')
    setShowAddNewsModal(false)
    setNewNews({
      title: '',
      summary: '',
      content: '',
      category: 'Tin tức',
      author: 'Ban Quản trị UGC'
    })
  }

  const dateRangeLabel = dateRange?.from ? (
    dateRange.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      : format(dateRange.from, 'dd/MM/yyyy')
  ) : 'Chọn khoảng thời gian'

  const fromDateString = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const toDateString = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  const chartConfig = {
    ugc: {
      label: 'UGC tiêu thụ',
      color: '#60a5fa',
    },
  }

  const chartData = (stats?.txHistory || []).map(item => ({
    day: format(new Date(item.day), 'dd/MM', { locale: vi }),
    fullDay: format(new Date(item.day), 'dd/MM/yyyy', { locale: vi }),
    ugc: Number(item.total_ugc || 0),
  }))

  const totalConsumed = chartData.reduce((sum, item) => sum + item.ugc, 0)
  const firstPoint = chartData[0]?.ugc ?? 0
  const lastPoint = chartData[chartData.length - 1]?.ugc ?? 0
  const trendPercent = firstPoint > 0 ? ((lastPoint - firstPoint) / firstPoint) * 100 : null
  const trendLabel = trendPercent === null
    ? 'Chưa đủ dữ liệu để so sánh xu hướng'
    : `${trendPercent >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(trendPercent).toFixed(1).replace('.', ',')}% so với đầu kỳ`

  function exportCSV() {
    if (!wallets.length) { showToast('Không có dữ liệu để xuất'); return }
    const headers = ['Họ và tên', 'Tên đăng nhập', 'Vai trò', 'Địa chỉ ví', 'Số dư UGC']
    const rows = wallets.map(w => [
      w.full_name || '',
      w.username || '',
      w.role === 'admin' ? 'Quản trị viên' : w.role === 'verifier' ? 'Người duyệt' : 'Sinh viên',
      w.wallet_address || '',
      w.ugc_balance ?? 0
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `ugc-wallets-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('✅ Đã xuất file CSV thành công!')
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isAdmin) {
        const statsParams = new URLSearchParams({ period: 'month' })
        if (fromDateString && toDateString) {
          statsParams.set('from', fromDateString)
          statsParams.set('to', toDateString)
        }
        const [s, b, c, w] = await Promise.all([
          api(`/dashboard/stats?${statsParams.toString()}`).catch(() => null),
          api('/wallet/balance').catch(() => ({ balance: null })),
          api('/wallet/contract').catch(() => ({ address: '' })),
          api('/wallets/all').catch(() => []),
        ])
        setStats(s); setBalance(b?.balance ?? null); setContract(c?.address || ''); setWallets(w || [])
      }
    } catch { showToast('⚠️ Lỗi tải dashboard') } finally { setLoading(false) }
  }, [api, isAdmin, showToast, fromDateString, toDateString])

  useEffect(() => { load() }, [load])

  async function handleApprove(id) {
    setApprovingId(id)
    try { await api(`/claims/${id}/approve`, { method: 'POST' }); showToast('✅ Đã duyệt thành công!'); load() }
    catch { showToast('❌ Lỗi khi duyệt') } finally { setApprovingId(null) }
  }

  const pending = stats?.pendingClaims ?? 0
  const students = stats?.totalStudents ?? 0
  const supply = stats?.totalSupply ?? 0
  const blockNum = stats?.blockNumber ?? 0

  const kpis = [
    { label: 'Tổng cung UGC', value: loading ? '...' : supply.toLocaleString(), sub: 'Token đang lưu hành', icon: 'token', trend: '+5.2%', pos: true, link: '/treasury' },
    { label: 'Sinh viên tham gia', value: loading ? '...' : students, sub: 'Đã liên kết ví', icon: 'school', trend: '+1.8% thành viên mới', pos: true, link: '/admin' },
    { label: 'Chờ phê duyệt', value: loading ? '...' : pending, sub: 'Claims cần xử lý', icon: 'pending_actions', trend: pending > 0 ? `Cần xử lý ngay` : 'Tất cả đã duyệt', pos: pending === 0, link: '/claims', alert: pending > 0 },
    { label: 'Block hiện tại', value: loading ? '...' : blockNum.toLocaleString(), sub: 'Hardhat network', icon: 'hub', trend: '● Đang kết nối', pos: true, link: null },
  ]

  return (
    <div style={{ background: '#ffffff' }} className="min-h-screen">

      {/* Notification Panel */}
      {showNotif && (
        <div className="fixed inset-0 z-50" onClick={() => setShowNotif(false)}>
          <div className="absolute top-16 right-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 w-[380px] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Body (Scrollable list) */}
            <div className="max-h-[400px] overflow-y-auto">
              <div className="flex flex-col">
                {(stats?.pendingClaims ?? 0) > 0 ? (
                  <>
                    {/* Notification Item 1 (Unread) */}
                    <div className="flex gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors bg-blue-50/30">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 border border-orange-200">
                        <span className="material-symbols-outlined text-orange-600 text-[20px]">pending_actions</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] text-gray-800 leading-snug font-bold">
                          Hệ thống cần bạn xử lý
                        </p>
                        <p className="text-[13px] text-gray-600 leading-snug mt-0.5">
                          Bạn có <span className="font-bold text-orange-600">{stats?.pendingClaims} claims</span> mới đang chờ phê duyệt. Vui lòng kiểm tra và xử lý ngay.
                        </p>
                        <p className="text-[12px] text-gray-500 mt-1 font-medium text-blue-600">1 giờ trước</p>
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                    {/* Empty state (when there are no notifications) */}
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[32px] text-gray-300">notifications_off</span>
                    </div>
                    <p className="text-[14px] font-medium text-gray-600">Bạn không có thông báo nào</p>
                    <p className="text-[13px] text-gray-400 mt-1">Khi có cập nhật mới, thông báo sẽ hiển thị tại đây.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={(e) => { e.preventDefault(); setShowNotif(false); }}
                className="w-full py-2 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                Xem tất cả thông báo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-4 pb-8 space-y-7">

        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Tổng quan Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Cập nhật trạng thái hệ thống ULSA Green Credit.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Export CSV */}
              <button onClick={exportCSV}
                className="flex flex-shrink-0 whitespace-nowrap items-center gap-2 px-4 h-9 rounded-2xl text-[13px] font-semibold text-white bg-[#2d7a4f] hover:bg-[#246140] active:scale-95 transition-all duration-150 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
                Xuất CSV
              </button>

              {/* Đăng tin tức */}
              <button onClick={() => setShowAddNewsModal(true)}
                className="flex flex-shrink-0 whitespace-nowrap items-center gap-2 px-4 h-9 rounded-2xl text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all duration-150 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Đăng tin tức
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex h-9 w-[238px] justify-between rounded-2xl border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <CalendarIcon className="h-4 w-4 text-gray-600" />
                      <span className="truncate">{dateRangeLabel}</span>
                    </span>
                    <ChevronDownIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-xl overflow-hidden border border-gray-200 shadow-lg"
                  align="start"
                  style={{
                    '--primary': '240 5.9% 10%',
                    '--primary-foreground': '0 0% 98%',
                    '--accent': '240 4.8% 95.9%',
                    '--accent-foreground': '240 5.9% 10%',
                    '--radius': '0.5rem',
                  }}
                >
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={vi}
                    disabled={dateRange?.from && !dateRange?.to ? [{ before: dateRange.from }] : []}
                    formatters={{
                      formatWeekdayName: (date) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
                      formatCaption: (date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
                      formatMonthCaption: (date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 ${k.alert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-black font-semibold">{k.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.alert ? 'bg-red-100' : 'bg-gray-50'}`}>
                  <span className={`material-symbols-outlined text-base ${k.alert ? 'text-red-500' : 'text-gray-400'}`}>{k.icon}</span>
                </div>
              </div>
              <p className={`text-3xl font-black mb-1 ${k.alert ? 'text-red-600' : 'text-gray-900'}`}>{k.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-600 font-medium">{k.sub}</p>
                {k.link
                  ? <Link to={k.link} className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 hover:gap-1 transition-all">Chi tiết <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>north_east</span></Link>
                  : renderTrend(k.trend, k.pos)
                }
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                {renderTrend(k.trend, k.pos, true)}
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Chart + Quick Approve */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Line Chart */}
          <Card className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Tổng quan UGC tiêu thụ
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl font-black text-gray-900">
                    {loading ? '...' : `${totalConsumed.toLocaleString('vi-VN')} UGC`}
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                      {dateRangeLabel}
                    </span>
                  </CardTitle>
                </div>
                <Link to="/admin/rewards" className="text-xs font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                  Chi tiết <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-0">
              <div className="h-[280px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 px-6">
                    <span className="material-symbols-outlined text-4xl">show_chart</span>
                    <p className="mt-2 text-sm font-medium">Chưa có dữ liệu UGC trong khoảng thời gian này</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <LineChart
                      accessibilityLayer
                      data={chartData}
                      margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Line
                        dataKey="ugc"
                        type="natural"
                        stroke="var(--color-ugc)"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 px-6 pb-6 pt-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                {trendLabel}
                <TrendingUp className={`h-4 w-4 ${trendPercent != null && trendPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
              </div>
              <div className="leading-none text-gray-500">
                Tổng UGC được ghi nhận từ hoạt động hoàn / trả và đổi thưởng trong khoảng đã chọn.
              </div>
            </CardFooter>
          </Card>

          {/* Quick Approve */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">Duyệt nhanh</p>
                <p className="mt-1.5 text-[18px] font-black tracking-tight text-gray-900">Claims mới nhất</p>
              </div>
              <Link to="/admin/claims" className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-green-600 transition-all hover:gap-1.5 hover:text-green-700">
                Tất cả <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>north_east</span>
              </Link>
            </div>
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-10 text-gray-300"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span></div>
              ) : (stats?.recentClaims?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-4xl">task_alt</span>
                  <p className="text-sm font-medium text-gray-500">Chưa có yêu cầu nào cần duyệt</p>
                </div>
              ) : stats.recentClaims.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 transition-colors hover:bg-gray-50/80 group">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700 text-[10px] shadow-sm">
                    {c.student_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-bold tracking-tight text-gray-900">{c.student_name}</p>
                    <p className="truncate text-[11px] text-gray-500">{c.activity_name} · {timeAgo(c.created_at)}</p>
                  </div>
                  <button onClick={() => handleApprove(c.id)} disabled={approvingId === c.id}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white disabled:opacity-40">
                    <span className="material-symbols-outlined text-[16px]">{approvingId === c.id ? 'sync' : 'check'}</span>
                  </button>
                </div>
              ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Row 3: Top Events + Blockchain Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top Events */}
          <div className="flex h-fit self-start flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-400">Hoạt động nổi bật</p>
                <p className="mt-0.5 text-[14px] font-black tracking-tight text-gray-900">Top chiến dịch đang chạy</p>
              </div>
              <Link to="/admin/events" className="flex items-center gap-1 text-[12px] font-semibold text-green-600 transition-all hover:gap-1.5 hover:text-green-700">
                Xem tất cả <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>north_east</span>
              </Link>
            </div>
            <ScrollArea className="h-[188px] pr-3">
              <div className="space-y-1.5 pb-1">
              {loading ? (
                <div className="flex justify-center py-5 text-gray-300"><span className="material-symbols-outlined animate-spin text-xl">refresh</span></div>
              ) : (stats?.topEvents?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 text-center text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-2xl">event_busy</span>
                  <p className="text-sm font-medium text-gray-500">Chưa có chiến dịch nào</p>
                </div>
              ) : stats.topEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-2.5 py-2 transition-colors hover:bg-gray-50/80">
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl font-black text-[9px] ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                    }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[11px] font-bold tracking-tight text-gray-900">{ev.title}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="truncate text-[9px] font-medium text-gray-500">{ev.activity_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ev.status === 'published' ? 'bg-green-100 text-green-700' :
                        ev.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                        }`}>{ev.status === 'published' ? 'Đang chạy' : ev.status === 'ended' ? 'Đã kết thúc' : 'Nháp'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-black text-green-600">{ev.participant_count}</p>
                    <p className="text-[9px] font-semibold uppercase text-gray-400">Tham gia</p>
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          </div>

          {/* Blockchain Status */}
          <div className="flex h-full min-h-[300px] flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2.5">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Hạ tầng kỹ thuật</p>
              <p className="mt-0.5 text-[15px] font-black text-gray-900">Trạng thái Blockchain</p>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-3">
              {/* Network status */}
              <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-3 shadow-sm">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-green-500">
                  <span className="material-symbols-outlined text-lg text-white">lan</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-green-800">Hardhat Node — Đang hoạt động</p>
                  <p className="text-[10px] font-medium text-green-600">http://localhost:8545 · Chain 31337</p>
                </div>
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500 animate-pulse" />
              </div>

              {/* Contract + Block */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Block Number</p>
                  <p className="font-mono text-[20px] font-black leading-none text-gray-800">{loading ? '...' : blockNum.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Gas Price</p>
                  <p className="font-mono text-[20px] font-black leading-none text-gray-800">1 Gwei</p>
                </div>
              </div>

              {/* Smart contract address */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ Smart Contract (UGC Token)</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate font-mono text-xs text-gray-700">{contract || stats?.ugcContractAddress || '—'}</span>
                  <button onClick={() => { navigator.clipboard.writeText(contract || ''); showToast('Đã sao chép!') }}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600">
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                </div>
              </div>

              {/* Quick nav */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <Link to="/admin/claims" className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-2 text-[11px] font-bold text-white transition-colors hover:bg-green-700">
                  <span className="material-symbols-outlined text-sm">pending_actions</span>Quản lý Claims
                </Link>
                <Link to="/treasury" className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 py-2 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-200">
                  <span className="material-symbols-outlined text-sm">account_balance</span>Ngân sách
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TẦNG 4: QUẢN LÝ VÍ BLOCKCHAIN ===== */}
        <div className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400">Kho quỹ & Hạ tầng</p>
                <p className="mt-0.5 text-lg font-black text-gray-900">Quản lý Ví Blockchain</p>
                <p className="mt-0.5 text-xs text-gray-400">{wallets.length} địa chỉ ví trong hệ thống · Số dư UGC theo thời gian thực</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
                  <input
                    className="w-48 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-green-400"
                    placeholder="Tìm tên, địa chỉ..."
                    value={walletSearch} onChange={e => setWalletSearch(e.target.value)}
                  />
                </div>
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600 outline-none focus:border-green-400"
                  value={walletRole} onChange={e => setWalletRole(e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="student">Sinh viên</option>
                  <option value="admin">Admin</option>
                  <option value="verifier">Verifier</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0">
              <div className="min-w-[920px]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_rgba(229,231,235,1)]">
                    <TableRow className="border-0 bg-gray-50/80 hover:bg-gray-50">
                      <TableHead className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Người dùng</TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Vai trò</TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Địa chỉ ví</TableHead>
                      <TableHead className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Số dư UGC</TableHead>
                      <TableHead className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-16 text-center">
                          <span className="material-symbols-outlined animate-spin text-4xl text-gray-300">refresh</span>
                        </TableCell>
                      </TableRow>
                    ) : wallets
                      .filter(w => {
                        const q = walletSearch.toLowerCase()
                        const matchSearch = !q || w.full_name?.toLowerCase().includes(q) || w.wallet_address?.toLowerCase().includes(q) || w.username?.toLowerCase().includes(q)
                        const matchRole = walletRole === 'all' || w.role === walletRole
                        return matchSearch && matchRole
                      })
                      .map(w => (
                        <TableRow key={w.id} className="group border-gray-50 transition-colors hover:bg-gray-50/80">
                          <TableCell className="px-5 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              {renderAvatar(w, "w-9 h-9")}
                              <div>
                                <p className="text-sm font-bold text-gray-800">{w.full_name}</p>
                                <p className="font-mono text-[10px] text-gray-400">@{w.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 align-middle">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${w.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              w.role === 'verifier' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>{w.role === 'admin' ? 'Admin' : w.role === 'verifier' ? 'Verifier' : 'Sinh viên'}</span>
                          </TableCell>
                          <TableCell className="px-5 py-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-500">
                                {w.wallet_address ? w.wallet_address.slice(0, 10) + '...' + w.wallet_address.slice(-6) : '—'}
                              </span>
                              <button
                                onClick={() => { navigator.clipboard.writeText(w.wallet_address || ''); showToast('Đã sao chép địa chỉ!') }}
                                className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100">
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-right align-middle">
                            <span className={`text-lg font-black ${w.ugc_balance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {w.ugc_balance.toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-gray-400">UGC</span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center align-middle">
                            <a
                              href={`https://etherscan.io/address/${w.wallet_address}`}
                              target="_blank" rel="noreferrer"
                              onClick={e => { e.preventDefault(); showToast('Hardhat local — không hỗ trợ Etherscan thật') }}
                              className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-green-600 hover:text-green-700">
                              Xem on-chain <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3">
            <span className="text-xs text-gray-500">
              Tổng UGC lưu hành: <strong className="text-green-600 font-black">{wallets.reduce((a, w) => a + w.ugc_balance, 0).toLocaleString()} UGC</strong>
            </span>
            <span className="text-xs text-gray-500">{wallets.filter(w => w.ugc_balance > 0).length} ví đang có số dư</span>
          </div>
        </div>

      </div>

      {/* Add News Modal */}
      {showAddNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddNewsModal(false)}>
          <form onSubmit={handlePublishNews} className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full mx-4 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">newspaper</span> Đăng tin tức / thông báo mới
              </h3>
              <button type="button" onClick={() => setShowAddNewsModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1 scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Tiêu đề tin tức</label>
                <input 
                  type="text" 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-green-500 outline-none"
                  placeholder="Nhập tiêu đề tin nổi bật..."
                  value={newNews.title}
                  onChange={e => setNewNews({...newNews, title: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Thể loại</label>
                  <select 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-green-500 outline-none bg-white font-medium"
                    value={newNews.category}
                    onChange={e => setNewNews({...newNews, category: e.target.value})}
                  >
                    <option value="Tin tức">Tin tức</option>
                    <option value="Sự kiện">Sự kiện</option>
                    <option value="Thông báo">Thông báo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Người đăng / Phòng ban</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-green-500 outline-none"
                    placeholder="VD: Ban Giám hiệu"
                    value={newNews.author}
                    onChange={e => setNewNews({...newNews, author: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Tóm tắt ngắn</label>
                <textarea 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-green-500 outline-none h-16 resize-none"
                  placeholder="Tóm tắt ngắn gọn nội dung tin tức hiển thị tại trang chủ..."
                  value={newNews.summary}
                  onChange={e => setNewNews({...newNews, summary: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Nội dung chi tiết</label>
                <textarea 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-green-500 outline-none h-32 resize-none"
                  placeholder="Mô tả đầy đủ nội dung thông báo hoặc bài viết..."
                  value={newNews.content}
                  onChange={e => setNewNews({...newNews, content: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddNewsModal(false)} 
                className="py-2 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all">
                Hủy
              </button>
              <button type="submit" 
                className="py-2 px-5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm">
                Đăng tin tức
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
