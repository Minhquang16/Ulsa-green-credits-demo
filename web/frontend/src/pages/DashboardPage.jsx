import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { TrendingUp } from "lucide-react"
import { Bar, BarChart as RechartsBarChart, Line, LineChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import ClaimsDataTable from '../components/ClaimsDataTable'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import iconCard1 from '../assets/icon_dashboard/ô_1.png'
import iconCard4 from '../assets/icon_dashboard/ô_4.png'
import logoWeb from '../logo_web.png'
import '../assets/dashboard.css'

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
  if (u?.student_card_image) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200`}>
        <img src={`/api${u.student_card_image}`} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    )
  }

  let bgClass = "bg-green-600"
  let label = "??"
  if (u?.role === 'admin') {
    bgClass = "bg-rose-600"
    label = "AD"
  } else if (u?.role === 'verifier') {
    bgClass = "bg-indigo-600"
    label = "VF"
  } else if (u?.full_name) {
    label = u.full_name.split(' ').pop()?.slice(0, 2).toUpperCase() || "??"
  }

  return (
    <div className={`${sizeClass} rounded-full ${bgClass} text-white font-black flex items-center justify-center flex-shrink-0 select-none shadow-sm text-xs`}>
      {label}
    </div>
  )
}

function BarChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-end justify-center gap-3 h-full pb-6">
      {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-gray-100" style={{ height: `${h}%` }} />
          <span className="text-[9px] text-gray-400">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}</span>
        </div>
      ))}
    </div>
  )
  const max = Math.max(...data.map(d => d.total_ugc), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-full pb-6">
      {data.map((d, i) => {
        const pct = Math.max((d.total_ugc / max) * 85, 4)
        const isMax = d.total_ugc === Math.max(...data.map(x => x.total_ugc))
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            {isMax && <span className="text-[9px] font-black text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">{d.total_ugc} UGC</span>}
            {!isMax && <span className="text-[9px] text-transparent">.</span>}
            <div className="w-full rounded-t-xl transition-all duration-700 relative group"
              style={{ height: `${pct}%`, background: isMax ? 'linear-gradient(to top,#16a34a,#4ade80)' : '#e5e7eb' }}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[9px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">{d.total_ugc}</div>
            </div>
            <span className="text-[9px] text-gray-400 font-medium">
              {new Date(d.day).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        )
      })}
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

// ── Student level helper ────────────────────────────────────────────────────
function getStudentLevel(balance) {
  if (balance >= 200) return { label: 'Xanh Bền Vững', color: '#89DB1F', bg: '#f3ffe0', icon: 'forest' }
  if (balance >= 100) return { label: 'Xanh Lá', color: '#89DB1F', bg: '#edffc0', icon: 'eco' }
  if (balance >= 50) return { label: 'Xanh Mầm', color: '#89DB1F', bg: '#f3ffe0', icon: 'grass' }
  return { label: 'Mới bắt đầu', color: '#6b7280', bg: '#f9fafb', icon: 'sprout' }
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '12px', borderRadius: '8px', color: '#111', fontSize: '13px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <p style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {payload.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: p.color }} />
                <span style={{ color: '#555', fontWeight: 500 }}>{p.name}</span>
              </div>
              <span style={{ fontWeight: 700, color: '#111' }}>{p.value} UGC</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

const chartConfig = {
  totalUgc: {
    label: "Tín chỉ",
    color: "#10b981", // Emerald 500
  },
}

function StudentUGCChart({ studentId, api }) {
  const [data, setData] = useState([]);
  const [totalUgc, setTotalUgc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeeklyStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/ugc/weekly-stats/${studentId}`);
      if (res && res.success) {
        setData(res.data);
        setTotalUgc(res.total_weekly_ugc);
      } else {
        throw new Error("Không thể tải cấu trúc dữ liệu.");
      }
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối API thống kê tín chỉ.");
    } finally {
      setLoading(false);
    }
  }, [studentId, api]);

  useEffect(() => {
    if (studentId) {
      fetchWeeklyStats();
    }
  }, [studentId, fetchWeeklyStats]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined animate-spin text-[32px] text-emerald-600">progress_activity</span>
      </div>
    );
  }

  // Khởi tạo data mặc định nếu API trả rỗng để tránh lỗi
  const chartData = (data && data.length > 0) ? data : [
    { day: 'T2', total_ugc: 0 }, { day: 'T3', total_ugc: 0 }, { day: 'T4', total_ugc: 0 },
    { day: 'T5', total_ugc: 0 }, { day: 'T6', total_ugc: 0 }, { day: 'T7', total_ugc: 0 }, { day: 'CN', total_ugc: 0 }
  ];

  // Tính scale cho trục Y
  const chartConfig = {
    total_ugc: {
      label: "UGC",
      color: "#22c55e",
    },
  };

  // Prevent repeating YAxis values when data is very small
  const maxUgc = Math.max(...chartData.map(d => d.total_ugc || 0));
  const tickStep = Math.max(1, Math.ceil(maxUgc / 4)); // Generate 5 ticks
  const yTicks = [0, tickStep, tickStep * 2, tickStep * 3, tickStep * 4];
  const actualMax = yTicks[yTicks.length - 1];

  return (
    <div style={{ height: '250px', width: '100%', marginTop: '20px', position: 'relative' }} className="select-none">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: -8,
            right: 12,
            top: 20,
            bottom: 0
          }}
        >
          <defs>
            <linearGradient id="fillUgc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-total_ugc)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-total_ugc)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={16}
            ticks={yTicks}
            domain={[0, actualMax]}
            tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
            width={45}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={<ChartTooltipContent />}
          />
          <Area
            dataKey="total_ugc"
            type="monotone"
            fill="url(#fillUgc)"
            stroke="var(--color-total_ugc)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--color-total_ugc)', strokeWidth: 0, opacity: 0.6 }}
            activeDot={{ r: 6, fill: 'var(--color-total_ugc)', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}



export default function DashboardPage() {
  const { api, user, logout } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [contract, setContract] = useState('')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [wallets, setWallets] = useState([])
  const [walletSearch, setWalletSearch] = useState('')
  const [walletRole, setWalletRole] = useState('all')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [timePeriod, setTimePeriod] = useState('month')
  const [showTimePicker, setShowTimePicker] = useState(false)
  // Student-specific state
  const [studentClaims, setStudentClaims] = useState([])
  const [studentEvents, setStudentEvents] = useState([])
  const [achievements, setAchievements] = useState([])
  const isAdmin = user.role === 'admin' || user.role === 'verifier'

  const timePeriodLabel = { week: '7 ngày qua', month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay' }[timePeriod]

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
        const [s, b, c, w] = await Promise.all([
          api(`/dashboard/stats?period=${timePeriod}`).catch(() => null),
          api('/wallet/balance').catch(() => ({ balance: null })),
          api('/wallet/contract').catch(() => ({ address: '' })),
          api('/wallets/all').catch(() => []),
        ])
        setStats(s); setBalance(b?.balance ?? null); setContract(c?.address || ''); setWallets(w || [])
      } else {
        const [b, c, claims, events, ach] = await Promise.all([
          api('/wallet/balance').catch(() => ({ balance: null })),
          api('/wallet/contract').catch(() => ({ address: '' })),
          api('/me/claims').catch(() => []),
          api('/events').catch(() => []),
          api('/me/achievements').catch(() => []),
        ])
        setBalance(b?.balance ?? null)
        setContract(c?.address || '')
        setStudentClaims(Array.isArray(claims) ? claims : [])
        setStudentEvents(Array.isArray(events) ? events : [])
        setAchievements(Array.isArray(ach) ? ach : [])
      }
    } catch { showToast('⚠️ Lỗi tải dashboard') } finally { setLoading(false) }
  }, [api, isAdmin, showToast, timePeriod])

  useEffect(() => { load() }, [load])

  async function handleApprove(id) {
    setApprovingId(id)
    try { await api(`/claims/${id}/approve`, { method: 'POST' }); showToast('✅ Đã duyệt thành công!'); load() }
    catch { showToast('❌ Lỗi khi duyệt') } finally { setApprovingId(null) }
  }

  // --- STUDENT VIEW ---
  if (!isAdmin) {
    const bal = balance ?? 0
    const level = getStudentLevel(bal)
    const approvedClaims = studentClaims.filter(c => c.status === 'approved')
    const pendingClaims = studentClaims.filter(c => c.status === 'submitted')
    const totalEarned = approvedClaims.reduce((s, c) => s + (c.credit_amount || 0), 0)
    const nextGoal = bal < 50 ? 50 : bal < 100 ? 100 : bal < 200 ? 200 : 300
    const progressPct = Math.min((bal / nextGoal) * 100, 100)
    const upcomingEvents = studentEvents
      .filter(e => e.status === 'published' && new Date(e.end_at) > new Date())
      .slice(0, 4)

    // Calculate real weekly tasks based on events the student can participate in
    const tasksList = studentEvents.slice(0, 5).map(ev => {
      // Check if student has submitted a claim for this event
      const claim = studentClaims.find(c => c.event_id === ev.id);
      const hasParticipated = claim && (claim.status === 'approved' || claim.status === 'submitted');
      
      return {
        label: ev.title,
        progress: hasParticipated ? 1 : 0,
        total: 1,
        done: !!hasParticipated,
        status: claim ? claim.status : null
      };
    });

    const tasksCompleted = tasksList.filter(t => t.done).length;
    const tasksTotal = tasksList.length || 1; // avoid division by zero
    const tasksProgressPct = (tasksCompleted / tasksTotal) * 100;

    // Trend calculations for KPI cards
    const now = new Date()
    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7)
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    let ugcThisWeek = 0, ugcLastWeek = 0, ugcThisMonth = 0, actThisMonth = 0
    approvedClaims.forEach(c => {
      const d = new Date(c.updated_at || c.created_at)
      if (d >= thisWeekStart) ugcThisWeek += c.credit_amount
      else if (d >= lastWeekStart) ugcLastWeek += c.credit_amount
      if (d >= thisMonthStart) { ugcThisMonth += c.credit_amount; actThisMonth++ }
    })
    const ugcTrend = ugcThisWeek - ugcLastWeek
    const ugcTrendStr = `${ugcTrend >= 0 ? '+' : ''}${ugcTrend} UGC so với tuần trước`

    // Streak calculation
    const streakDates = approvedClaims
      .map(c => { const d = new Date(c.updated_at || c.created_at); d.setHours(0, 0, 0, 0); return d.getTime() })
    const uniqueDates = [...new Set(streakDates)].sort((a, b) => b - a)
    let streakDays = 0, maxStreak = 0, run = 1
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === today.getTime() - i * 86400000) streakDays++
      else break
    }
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      if ((uniqueDates[i] - uniqueDates[i + 1]) / 86400000 === 1) { run++; if (run > maxStreak) maxStreak = run }
      else run = 1
    }
    maxStreak = Math.max(streakDays, maxStreak)

    const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,.05)', position: 'relative' }
    const BK = '#111214'
    const G = '#89DB1F'
    const LBL = { fontSize: 12, fontWeight: 600, color: '#aaa' }
    const BIG = { fontSize: 34, fontWeight: 900, lineHeight: 1.1 }

    return (
      <div className="dashboard-page" style={{ background: '#f5f5f5', minHeight: '100vh' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-8 space-y-6">

          {/* ── HEADER (Welcome Section + Progress Card) ── */}
          <div className="welcome-section" style={{ flexWrap: 'nowrap' }}>
            <div style={{ flexShrink: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Xin chào, {user.full_name || 'Hoàng Trường'}
              </h1>
              <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="text-muted text-sm" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                  Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span style={{ margin: '0 8px', color: '#ccc' }}>•</span>
                <span className="text-green" style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Hôm nay bạn đã tích lũy được tín chỉ xanh nào chưa? <span>🌱</span>
                </span>
              </div>
            </div>

            {/* Progress Card */}
            <div className="progress-card">
              <div className="icon-box">
                <img src={logoWeb} alt="logo" className="w-[20px] h-[20px] object-contain" />
              </div>
              <div className="content-area">
                <div className="top-text">
                  Bạn đã đạt <strong>{bal} / {nextGoal} UGC</strong>
                </div>
                <div className="bottom-row">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
                  </div>
                  <span className="percentage">{Math.round(progressPct)}%</span>
                  <span className="hint-text">
                    Còn {nextGoal - bal} UGC để nhận huy hiệu {nextGoal === 50 ? 'Đồng' : nextGoal === 100 ? 'Bạc' : 'Vàng'}
                  </span>
                </div>
              </div>
              <img src="https://cdn-icons-png.flaticon.com/512/3176/3176294.png" alt="badge" className="medal-icon" style={{ filter: 'grayscale(1)', opacity: 0.5 }} />
            </div>
          </div>


          {/* ── KPI CARDS ── */}
          <div className="kpi-row">
            {/* Card 1 */}
            <div className="kpi-card theme-green">
              <div className="kpi-icon-container">
                <img src={iconCard1} alt="UGC" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%' }} />
              </div>
              <div className="kpi-info" style={{ flex: 1 }}>
                <p className="kpi-title card1-title">Số dư tín chỉ</p>
                <div className="kpi-value-container">
                  <span className="kpi-value">{loading ? '…' : bal}</span>
                </div>
                <div className="card1-trend">
                  <span className="card1-trend-icon"><i className="ph-bold ph-trend-up"></i></span>
                  <span className="card1-trend-text-highle">{ugcTrendStr.split(' ')[0]}</span>
                  <span className="card1-trend-text">&nbsp;{ugcTrendStr.split(' ').slice(1).join(' ')}</span>
                </div>
              </div>
              <div className="top-right-badge">
                <span className="ugc-badge">UGC</span>
              </div>
            </div>

            {/* Ô 2: Tổng đã kiếm */}
            <div className="kpi-card theme-orange">
              <div className="kpi-icon-container">
                <div className="kpi-icon-inner">
                  <i className="ph-fill ph-medal" style={{ fontSize: '22px' }}></i>
                </div>
              </div>
              <div className="kpi-info" style={{ flex: 1 }}>
                <p className="kpi-title card2-title">Tổng đã kiếm</p>
                <div className="kpi-value-container">
                  <span className="kpi-value">{loading ? '…' : totalEarned}</span>
                </div>
                <div className="card2-trend">
                  <span className="card2-trend-icon"><i className="ph-bold ph-trend-up"></i></span>
                  <span className="card2-trend-text-highle">+{ugcThisMonth} UGC</span>
                  <span className="card2-trend-text">&nbsp;tháng này</span>
                </div>
              </div>
              <div className="top-right-badge">
                <div className="icon-badge">
                  <i className="ph-fill ph-medal"></i>
                </div>
              </div>
            </div>

            {/* Ô 3: Lần tham gia */}
            <div className="kpi-card theme-blue">
              <div className="kpi-icon-container">
                <div className="kpi-icon-inner">
                  <i className="ph-fill ph-users-three" style={{ fontSize: '22px' }}></i>
                </div>
              </div>
              <div className="kpi-info" style={{ flex: 1 }}>
                <p className="kpi-title card3-title">Lần tham gia</p>
                <div className="kpi-value-container">
                  <span className="kpi-value">{loading ? '…' : studentClaims.length}</span>
                </div>
                <div className="card3-trend">
                  <span className="card3-trend-icon"><i className="ph-bold ph-trend-up"></i></span>
                  <span className="card3-trend-text-highle">+{actThisMonth} hoạt động</span>
                  <span className="card3-trend-text">&nbsp;tháng này</span>
                </div>
              </div>
              <div className="top-right-badge">
                <div className="icon-badge">
                  <i className="ph-fill ph-users-three"></i>
                </div>
              </div>
            </div>

            {/* Ô 4: Chuỗi xanh hiện tại */}
            <div className="kpi-card theme-purple">
              <div className="kpi-icon-container">
                <img src={iconCard4} alt="Streak" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%' }} />
              </div>
              <div className="kpi-info" style={{ flex: 1 }}>
                <p className="kpi-title card4-title">Chuỗi xanh hiện tại</p>
                <div className="kpi-value-container">
                  <span className="kpi-value">{loading ? '…' : streakDays}</span>
                  <span className="kpi-value-unit">ngày</span>
                </div>
                <div className="card4-trend">
                  <span className="card4-trend-text">Kỷ lục của bạn: {maxStreak} ngày</span>
                </div>
              </div>
              <div className="top-right-badge">
                <div className="icon-badge">
                  <i className="ph-fill ph-calendar-blank"></i>
                </div>
              </div>
            </div>
          </div>


          {/* ===== MAIN GRID ===== */}
          <div className="main-grid">
            <div className="left-column">
              <div className="chart-activity-row">
                {/* Tăng trưởng tín chỉ (Chart) */}
                <div className="card flex flex-col">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }} className="flex items-center gap-1">Tăng trưởng tín chỉ <i className="ph ph-info" style={{ fontSize: '16px', color: '#94a3b8', cursor: 'pointer' }}></i></p>
                      <p style={{ fontSize: 13, color: '#888', marginTop: 4, fontWeight: 500 }}>Thống kê 7 ngày gần nhất</p>
                    </div>
                  </div>
                  <div className="chart-container flex-1">
                    {loading ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: 32, color: '#ddd' }}>hourglass_empty</span></div> : <StudentUGCChart studentId={user.id} api={api} />}
                  </div>
                  <div className="mt-2 pt-1">
                    <Link to="/claims" className="link-text flex items-center gap-1 w-max">
                      Xem chi tiết thống kê <i className="ph-bold ph-arrow-right"></i>
                    </Link>
                  </div>
                </div>

                {/* Hoạt động gần đây */}
                <div className="card flex flex-col">
                  <div className="list-header">
                    <p className="title-hd m-0">Hoạt động gần đây</p>
                    <Link to="/claims" className="link-text">Xem tất cả</Link>
                  </div>
                  <ul className="activity-list flex-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {studentClaims.slice(0, 4).map((c, i) => {
                      const imageMap = {
                        'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
                        'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
                        'nhựa': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
                        'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs',
                        'xe': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=150&auto=format&fit=crop&q=60',
                        'buýt': 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=150&auto=format&fit=crop&q=60',
                        'nước': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=150&auto=format&fit=crop&q=60'
                      };
                      const defaultImg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8';
                      const searchStr = ((c.event_title || '') + ' ' + (c.activity_name || '')).toLowerCase();
                      const matchedKey = Object.keys(imageMap).find(k => searchStr.includes(k));
                      let imgSrc = matchedKey ? imageMap[matchedKey] : defaultImg;
                      if (c.activity_description && c.activity_description.startsWith('/uploads')) {
                        imgSrc = `/api${c.activity_description}`;
                      }

                      const isPending = c.status === 'submitted';
                      const isRejected = c.status === 'rejected';

                      return (
                        <li key={i} style={{ opacity: isRejected ? 0.5 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="activity-icon" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <img src={imgSrc} alt={c.activity_name} className="w-full h-full object-cover" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#333' }}>{c.activity_name}</span>
                              <span style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                {new Date(c.updated_at || c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(c.updated_at || c.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          <div className={`font-semibold ${isPending ? 'text-orange-500' : isRejected ? 'text-red-500' : 'text-green'}`}>
                            {isPending ? 'Đang duyệt' : isRejected ? 'Từ chối' : `+${c.credit_amount} UGC`}
                          </div>
                        </li>
                      )
                    })}
                    {studentClaims.length === 0 && <p className="text-sm text-gray-500 text-center py-4 m-0">Chưa có hoạt động nào</p>}
                  </ul>
                </div>
              </div>

              {/* Thành tích nổi bật */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>Thành tích nổi bật</p>
                  <button className="text-[13px] font-bold text-green-600 hover:underline">Xem tất cả</button>
                </div>
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' }} className="horizontal-scroll-container">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow" style={{ flexShrink: 0, width: '220px' }}>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${a.done ? 'bg-green-50 border border-green-100' : 'bg-gray-50 opacity-40 border border-gray-200'}`}>
                        {a.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold m-0 truncate ${a.done ? 'text-gray-800' : 'text-gray-400'}`}>{a.label}</p>
                        <p className="text-[11px] text-gray-500 m-0 mt-0.5 truncate">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ví Blockchain */}
              <div className="card">
                <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 16px' }} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">verified_user</span> Ví Blockchain <span className="material-symbols-outlined text-gray-400 text-[16px]">expand_more</span>
                </p>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Địa chỉ ví</p>
                    <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-xl px-3 py-2.5">
                      <p className="font-mono text-[12px] text-gray-600 flex-1 truncate font-semibold m-0">{user.wallet_address || '0x90F79bf6EB2c4f870365E785982E1f101E93b906'}</p>
                      <button onClick={() => { navigator.clipboard.writeText(user.wallet_address || ''); showToast('Đã sao chép!') }} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Smart Contract</p>
                    <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-xl px-3 py-2.5">
                      <p className="font-mono text-[12px] text-gray-600 flex-1 truncate font-semibold m-0">{contract || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}</p>
                      <button onClick={() => { navigator.clipboard.writeText(contract || ''); showToast('Đã sao chép!') }} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-[#f4fbf7] rounded-xl px-4 py-2.5 h-[38px]">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <p className="text-[12px] font-bold text-green-700 m-0">Hardhat · Chain 31337</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="right-column">
              {/* Nhiệm vụ tuần này */}
              <div className="card flex flex-col">
                <div className="list-header">
                  <p className="title-hd m-0">Nhiệm vụ tuần này</p>
                  <Link to="/events" className="link-text">Xem thêm</Link>
                </div>
                <div className="flex-1">
                  <ul className="task-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tasksList.map((task, i) => (
                      <li key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${task.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                            {task.done && <i className="ph-bold ph-check" style={{ fontSize: '12px' }}></i>}
                          </div>
                          <span style={{ fontWeight: 500, color: task.done ? '#333' : '#666' }}>{task.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: task.done ? '#16a34a' : '#9ca3af' }}>{task.progress}/{task.total}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="w-full bg-gray-100 h-[6px] rounded-full mb-2 overflow-hidden">
                      <div className="bg-green-500 h-[6px] rounded-full transition-all duration-500" style={{ width: `${tasksProgressPct}%` }}></div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 500, margin: 0 }}>{tasksCompleted} / {tasksTotal} hoàn thành</p>
                  </div>
                </div>
              </div>

              {/* Bảng xếp hạng */}
              <div className="card mt-5">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>Bảng xếp hạng</p>
                  <button className="text-[13px] font-bold text-green-600 hover:underline">Xem thêm</button>
                </div>
                <div className="space-y-1">
                  {[
                    { rank: 1, name: 'Nguyễn Minh Anh', score: 560, isMe: false },
                    { rank: 2, name: 'Trần Quốc Bảo', score: 540, isMe: false },
                    { rank: 3, name: 'Lê Gia Huy', score: 520, isMe: false },
                    { rank: 15, name: user.full_name || 'Hoàng Trường', score: bal, isMe: true },
                  ].map((u, i) => (
                    <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl ${u.isMe ? 'bg-green-50' : 'hover:bg-gray-50 transition-colors'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${u.rank === 1 ? 'bg-orange-100 text-orange-600' : u.rank === 2 ? 'bg-gray-200 text-gray-600' : u.rank === 3 ? 'bg-orange-50 text-orange-500' : 'bg-transparent text-gray-600'}`}>
                          {u.rank}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-black text-slate-500">
                          {u.name.split(' ').pop().slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`text-[13px] font-bold ${u.isMe ? 'text-green-700' : 'text-gray-800'}`}>{u.name} {u.isMe && '(Bạn)'}</span>
                      </div>
                      <span className="text-[13px] font-bold text-gray-800">{u.score} UGC</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: CLAIMS TABLE — Full Shadcn Theme */}
          <ClaimsDataTable claims={studentClaims} loading={loading} nav={nav} />

        </div>
      </div>
    )
  }

  // --- ADMIN VIEW ---
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
      {/* ===== MODALS & DROPDOWNS — outside layout flow ===== */}
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-800">Trợ giúp & Hướng dẫn</h2>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>
            <div className="space-y-3">
              {[
                { icon: 'dashboard', title: 'Dashboard', desc: 'Tổng quan số liệu: tổng UGC, sinh viên, claims cần duyệt.' },
                { icon: 'pending_actions', title: 'Claims', desc: 'Xem và duyệt các yêu cầu tín chỉ từ sinh viên.' },
                { icon: 'eco', title: 'Sự kiện', desc: 'Quản lý các hoạt động xanh đang diễn ra.' },
                { icon: 'account_balance', title: 'Ngân sách', desc: 'Phát hành và theo dõi tổng cung UGC token.' },
                { icon: 'redeem', title: 'Đổi thưởng', desc: 'Xem các phần thưởng sinh viên có thể đổi bằng UGC.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-green-600 text-lg">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notification Panel */}
      {showNotif && (
        <div className="fixed inset-0 z-50" onClick={() => setShowNotif(false)}>
          <div className="absolute top-16 right-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 w-[380px] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-[15px] text-gray-800">Thông báo</h3>
              <button className="text-[13px] text-gray-500 hover:text-gray-800 font-medium transition-colors">
                Đánh dấu tất cả đã đọc
              </button>
            </div>

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

      {/* Profile Dropdown */}
      {showProfile && (
        <div className="fixed inset-0 z-50" onClick={() => setShowProfile(false)}>
          <div className="absolute top-16 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {renderAvatar(user, "w-10 h-10")}
                <div>
                  <p className="font-bold text-sm text-gray-800">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Quản trị viên' : user.role === 'verifier' ? 'Người duyệt' : 'Sinh viên'}</p>
                  <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                </div>
              </div>
            </div>
            <div className="p-2">
              <button onClick={() => { setShowProfile(false); showToast('Tính năng đang phát triển') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <span className="material-symbols-outlined text-gray-400 text-lg">manage_accounts</span> Cài đặt tài khoản
              </button>
              <button onClick={() => { logout(); nav('/login') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-sm text-red-600 transition-colors">
                <span className="material-symbols-outlined text-red-400 text-lg">logout</span> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Dropdown */}
      {showTimePicker && (
        <div className="fixed inset-0 z-50" onClick={() => setShowTimePicker(false)}>
          <div className="absolute top-32 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 w-48 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-2">
              {[['week', '7 ngày qua'], ['month', 'Tháng này'], ['quarter', 'Quý này'], ['year', 'Năm nay']].map(([val, label]) => (
                <button key={val} onClick={() => { setTimePeriod(val); setShowTimePicker(false); showToast(`Đang xem: ${label}`) }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between ${timePeriod === val ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                  {label}
                  {timePeriod === val && <span className="material-symbols-outlined text-green-600 text-base">check</span>}
                </button>
              ))}
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
            {/* Top Row */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className={`flex items-center bg-white border border-gray-200 rounded-2xl overflow-hidden h-9 shadow-sm transition-all duration-300 ${isSearchOpen ? 'w-[290px]' : 'w-9'}`}>
                <button
                  onClick={() => { setIsSearchOpen(!isSearchOpen); if (!isSearchOpen) setTimeout(() => document.getElementById('headerSearch')?.focus(), 50) }}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px] text-gray-600" style={{ fontVariationSettings: "'wght' 300" }}>search</span>
                </button>
                <input
                  id="headerSearch"
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={walletSearch}
                  onChange={e => setWalletSearch(e.target.value)}
                  className={`w-full outline-none focus:ring-0 caret-gray-800 text-[13px] text-gray-700 bg-transparent placeholder-gray-400 pr-3 transition-opacity duration-200 ${isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  onBlur={() => { if (!walletSearch) setIsSearchOpen(false) }}
                />
              </div>

              {/* Help */}
              <button onClick={() => setShowHelp(true)}
                className="w-9 h-9 flex-shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-150">
                <span className="material-symbols-outlined text-[20px] text-gray-600" style={{ fontVariationSettings: "'wght' 300" }}>help_outline</span>
              </button>

              {/* Notifications */}
              <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); setShowTimePicker(false) }}
                className={`w-9 h-9 flex-shrink-0 rounded-2xl border shadow-sm flex items-center justify-center relative active:scale-95 transition-all duration-150 ${showNotif ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <span className={`material-symbols-outlined text-[20px] ${showNotif ? 'text-green-600' : 'text-gray-600'}`} style={{ fontVariationSettings: "'wght' 300" }}>notifications</span>
                {(stats?.pendingClaims ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">
                    {stats.pendingClaims}
                  </span>
                )}
              </button>

              {/* Profile — circle avatar + chevron only, no text */}
              <div onClick={() => { setShowProfile(!showProfile); setShowNotif(false); setShowTimePicker(false) }}
                className={`flex flex-shrink-0 items-center gap-1 rounded-2xl border shadow-sm cursor-pointer h-9 pl-1 pr-2 active:scale-95 transition-all duration-150 ${showProfile ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                {renderAvatar(user, "w-7 h-7")}
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showProfile ? 'rotate-180 text-green-600' : 'text-gray-500'}`}>unfold_more</span>
              </div>

              {/* Export CSV */}
              <button onClick={exportCSV}
                className="flex flex-shrink-0 whitespace-nowrap items-center gap-2 px-4 h-9 rounded-2xl text-[13px] font-semibold text-white bg-[#2d7a4f] hover:bg-[#246140] active:scale-95 transition-all duration-150 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
                Xuất CSV
              </button>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center gap-2">
              <div onClick={() => { setShowTimePicker(!showTimePicker); setShowNotif(false); setShowProfile(false) }}
                className={`flex items-center gap-1 rounded-2xl border shadow-sm cursor-pointer px-3 h-8 active:scale-95 transition-all duration-150 ${showTimePicker ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <span className={`text-[13px] font-medium ${showTimePicker ? 'text-green-700' : 'text-gray-700'}`}>{timePeriodLabel}</span>
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showTimePicker ? 'rotate-180 text-green-600' : 'text-gray-500'}`}>expand_more</span>
              </div>
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

          {/* Bar Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Tổng quan UGC tiêu thụ</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">
                  {loading ? '...' : ((stats?.txHistory || []).reduce((a, b) => a + (b.total_ugc || 0), 0)).toLocaleString()} UGC
                  <span className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">7 ngày qua</span>
                </p>
              </div>
              <Link to="/rewards" className="text-xs font-bold text-gray-400 hover:text-green-600 flex items-center gap-1 transition-colors">
                ··· <span className="hidden">Xem thêm</span>
              </Link>
            </div>
            <div className="h-52 mt-6">
              <BarChart data={stats?.txHistory || []} />
            </div>
          </div>

          {/* Quick Approve */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Duyệt nhanh</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Claims mới nhất</p>
              </div>
              <Link to="/claims" className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
                Tất cả <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
              </Link>
            </div>
            <div className="space-y-2.5">
              {loading ? (
                <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-gray-300 text-3xl">refresh</span></div>
              ) : (stats?.recentClaims?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-4xl">task_alt</span>
                  <p className="text-sm font-medium">Không có claim nào chờ duyệt</p>
                </div>
              ) : stats.recentClaims.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-xs flex-shrink-0">
                    {c.student_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.student_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.activity_name} · {timeAgo(c.created_at)}</p>
                  </div>
                  <button onClick={() => handleApprove(c.id)} disabled={approvingId === c.id}
                    className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 text-xs font-black">
                    <span className="material-symbols-outlined text-base">{approvingId === c.id ? 'sync' : 'check'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Top Events + Blockchain Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top Events */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Hoạt động nổi bật</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Top chiến dịch đang chạy</p>
              </div>
              <Link to="/events" className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
                Xem tất cả <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
              </Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-gray-300 text-3xl">refresh</span></div>
              ) : (stats?.topEvents?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <span className="material-symbols-outlined text-4xl">event_busy</span>
                  <p className="text-sm">Chưa có chiến dịch nào</p>
                </div>
              ) : stats.topEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                    }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">{ev.activity_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ev.status === 'published' ? 'bg-green-100 text-green-700' :
                        ev.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                        }`}>{ev.status === 'published' ? 'Đang chạy' : ev.status === 'ended' ? 'Đã kết thúc' : 'Nháp'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-600">{ev.participant_count}</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">Tham gia</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Hạ tầng kỹ thuật</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">Trạng thái Blockchain</p>
            </div>

            {/* Network status */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-xl">lan</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-800 text-sm">Hardhat Node — Đang hoạt động</p>
                <p className="text-green-600 text-[10px] font-medium">http://localhost:8545 · Chain 31337</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            </div>

            {/* Contract + Block */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Block Number</p>
                <p className="font-mono font-black text-gray-800">{loading ? '...' : blockNum.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Gas Price</p>
                <p className="font-mono font-black text-gray-800">1 Gwei</p>
              </div>
            </div>

            {/* Smart contract address */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Địa chỉ Smart Contract (UGC Token)</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-700 flex-1 truncate">{contract || stats?.ugcContractAddress || '—'}</span>
                <button onClick={() => { navigator.clipboard.writeText(contract || ''); showToast('Đã sao chép!') }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>

            {/* Quick nav */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link to="/claims" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-bold text-xs hover:bg-green-700 transition-colors">
                <span className="material-symbols-outlined text-sm">pending_actions</span>Quản lý Claims
              </Link>
              <Link to="/treasury" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors">
                <span className="material-symbols-outlined text-sm">account_balance</span>Ngân sách
              </Link>
            </div>
          </div>
        </div>

        {/* ===== TẦNG 4: QUẢN LÝ VÍ BLOCKCHAIN ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Kho quỹ & Hạ tầng</p>
                <p className="text-lg font-black text-gray-900 mt-0.5">Quản lý Ví Blockchain</p>
                <p className="text-xs text-gray-400 mt-0.5">{wallets.length} địa chỉ ví trong hệ thống · Số dư UGC theo thời gian thực</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
                  <input
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 bg-gray-50 w-48"
                    placeholder="Tìm tên, địa chỉ..."
                    value={walletSearch} onChange={e => setWalletSearch(e.target.value)}
                  />
                </div>
                <select
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 bg-gray-50 font-semibold text-gray-600"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Người dùng</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Vai trò</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Địa chỉ ví</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Số dư UGC</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-16 text-center">
                    <span className="material-symbols-outlined animate-spin text-gray-300 text-4xl">refresh</span>
                  </td></tr>
                ) : wallets
                  .filter(w => {
                    const q = walletSearch.toLowerCase()
                    const matchSearch = !q || w.full_name?.toLowerCase().includes(q) || w.wallet_address?.toLowerCase().includes(q) || w.username?.toLowerCase().includes(q)
                    const matchRole = walletRole === 'all' || w.role === walletRole
                    return matchSearch && matchRole
                  })
                  .map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {renderAvatar(w, "w-9 h-9")}
                          <div>
                            <p className="text-sm font-bold text-gray-800">{w.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">@{w.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${w.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          w.role === 'verifier' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>{w.role === 'admin' ? 'Admin' : w.role === 'verifier' ? 'Verifier' : 'Sinh viên'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {w.wallet_address ? w.wallet_address.slice(0, 10) + '...' + w.wallet_address.slice(-6) : '—'}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(w.wallet_address || ''); showToast('Đã sao chép địa chỉ!') }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all">
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-black ${w.ugc_balance > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>{w.ugc_balance.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">UGC</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <a
                          href={`https://etherscan.io/address/${w.wallet_address}`}
                          target="_blank" rel="noreferrer"
                          onClick={e => { e.preventDefault(); showToast('Hardhat local — không hỗ trợ Etherscan thật') }}
                          className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center justify-center gap-0.5">
                          Xem on-chain <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>north_east</span>
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Tổng UGC lưu hành: <strong className="text-green-600 font-black">{wallets.reduce((a, w) => a + w.ugc_balance, 0).toLocaleString()} UGC</strong>
            </span>
            <span className="text-xs text-gray-400">{wallets.filter(w => w.ugc_balance > 0).length} ví đang có số dư</span>
          </div>
        </div>

      </div>
    </div>
  )
}
