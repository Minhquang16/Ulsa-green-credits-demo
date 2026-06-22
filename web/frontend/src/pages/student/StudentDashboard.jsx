/**
 * StudentDashboard.jsx
 * Dashboard dành riêng cho sinh viên.
 * Tách ra từ DashboardPage.jsx (dòng 491–1019).
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScrollArea } from '../../components/ui/scroll-area.jsx'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import ClaimsDataTable from '../../components/ClaimsDataTable.jsx'
import {
  renderAvatar,
  getStudentLevel,
  StudentUGCChart,
} from '../../utils/dashboardHelpers.jsx'

import iconCard1 from '../../assets/icon_dashboard/o_1.png'
import iconCard4 from '../../assets/icon_dashboard/o_4.png'
import logoWeb from '../../logo_web.png'
import '../../styles/student/student-dashboard.css'

// ── News default data ──────────────────────────────────────────────────────────
const DEFAULT_NEWS = [
  {
    id: 1,
    title: "ULSA phát động Chiến dịch 'Chủ Nhật Xanh' thu gom rác thải công nghệ",
    summary: 'Nhận ngay tới 50 UGC khi quyên góp pin cũ, điện thoại hỏng tại sảnh A1 vào Chủ nhật này.',
    content: "Nhằm nâng cao nhận thức bảo vệ môi trường, Ban Giám hiệu ULSA kết hợp với CLB Môi Trường phát động chiến dịch 'Chủ Nhật Xanh'. Sinh viên mang các thiết bị điện tử hỏng, pin cũ đến quyên góp tại sảnh A1 sẽ được quy đổi điểm rèn luyện và cộng trực tiếp Green Credits (UGC) vào tài khoản ví cá nhân.",
    date: '20/06/2026',
    author: 'Ban Giám hiệu & CLB Môi Trường',
    category: 'Sự kiện',
    icon: 'campaign',
    badgeColor: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: 2,
    title: 'ULSA đạt cột mốc 10.000 tín chỉ xanh UGC được lưu hành trên Blockchain',
    summary: 'Cộng đồng sinh viên ULSA tích cực giảm thiểu hơn 500kg khí thải CO2 thông qua hoạt động đạp xe.',
    content: 'Tính đến tháng 6/2026, hệ thống UGC đã ghi nhận hơn 1.200 lượt đăng ký hoạt động xanh từ sinh viên. Trong đó hoạt động đi bộ/đạp xe chiếm tỷ lệ cao nhất. Ban Quản trị dự án gửi lời cảm ơn và tuyên dương các tập thể lớp có đóng góp tích cực nhất trong tháng.',
    date: '18/06/2026',
    author: 'Ban Quản trị UGC',
    category: 'Tin tức',
    icon: 'newspaper',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 3,
    title: 'Thông báo bảo trì hệ thống RPC Node và nâng cấp Smart Contract',
    summary: 'Hệ thống ghi nhận điểm sẽ tạm ngừng đồng bộ trong khoảng thời gian từ 23h đến 24h ngày 22/6.',
    content: 'Để phục vụ công tác nâng cấp mạng lưới Hardhat Node và tích hợp thêm tính năng ví cá nhân bảo mật, toàn bộ hệ thống API và đồng bộ giao dịch on-chain sẽ được tạm khóa trong 1 giờ. Số dư UGC của sinh viên hoàn toàn an toàn và sẽ hiển thị bình thường sau bảo trì.',
    date: '15/06/2026',
    author: 'Phòng CNTT & Đảm bảo chất lượng',
    category: 'Thông báo',
    icon: 'build',
    badgeColor: 'bg-amber-100 text-amber-800'
  }
]

export default function StudentDashboard() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(null)
  const [studentClaims, setStudentClaims] = useState([])
  const [studentEvents, setStudentEvents] = useState([])
  const [achievements, setAchievements] = useState([])
  const [leaderboard, setLeaderboard] = useState({ top3: [], me: null, all: [] })
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [selectedNews, setSelectedNews] = useState(null)
  const [newsList, setNewsList] = useState([])

  // ── News init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('ulsa_green_news')
    if (stored) {
      try { setNewsList(JSON.parse(stored)) }
      catch { setNewsList(DEFAULT_NEWS) }
    } else {
      localStorage.setItem('ulsa_green_news', JSON.stringify(DEFAULT_NEWS))
      setNewsList(DEFAULT_NEWS)
    }
  }, [])

  // ── Data load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, c, claims, events, ach, lb] = await Promise.all([
        api('/wallet/balance').catch(() => ({ balance: null })),
        api('/wallet/contract').catch(() => ({ address: '' })),
        api('/me/claims').catch(() => []),
        api('/events').catch(() => []),
        api('/me/achievements').catch(() => []),
        api('/ugc/leaderboard').catch(() => null),
      ])
      setBalance(b?.balance ?? null)
      setStudentClaims(Array.isArray(claims) ? claims : [])
      setStudentEvents(Array.isArray(events) ? events : [])
      setAchievements(Array.isArray(ach) ? ach : [])
      if (lb && lb.success) {
        setLeaderboard({
          top3: lb.top3 || [],
          me: lb.me || null,
          all: lb.all || []
        })
      }
    } catch { showToast('⚠️ Lỗi tải dashboard') } finally { setLoading(false) }
  }, [api, showToast])

  useEffect(() => { load() }, [load])

  // ── Derived data ───────────────────────────────────────────────────────────
  const bal = balance ?? 0
  const level = getStudentLevel(bal)
  const approvedClaims = studentClaims.filter(c => c.status === 'approved')
  const pendingClaims = studentClaims.filter(c => c.status === 'submitted')
  const totalEarned = approvedClaims.reduce((s, c) => s + (c.credit_amount || 0), 0)
  // Tính toán lộ trình Huy hiệu dựa trên Bảng xếp hạng (Gamification)
  let nextGoal = 50;
  let targetName = 'Đồng';
  let targetRank = 3;
  let isTop1 = false;
  let currentMedal = 'none';

  if (leaderboard && leaderboard.all && leaderboard.all.length > 0) {
    const meLb = leaderboard.all.find(u => u.id === user.id) || leaderboard.me;
    const myRank = meLb ? meLb.rank : 999;

    if (myRank === 1) currentMedal = 'gold';
    else if (myRank === 2) currentMedal = 'silver';
    else if (myRank === 3) currentMedal = 'bronze';

    if (myRank === 1) {
      isTop1 = true;
      nextGoal = bal;
      targetName = 'Vàng';
    } else if (myRank === 2) {
      const top1 = leaderboard.all[0];
      nextGoal = top1 ? Math.max(top1.ugc_balance, bal + 1) : bal + 50;
      targetName = 'Vàng';
      targetRank = 1;
    } else if (myRank === 3) {
      const top2 = leaderboard.all[1];
      nextGoal = top2 ? Math.max(top2.ugc_balance, bal + 1) : bal + 50;
      targetName = 'Bạc';
      targetRank = 2;
    } else {
      const top3 = leaderboard.all[2];
      nextGoal = top3 ? Math.max(top3.ugc_balance, bal + 1) : bal + 50;
      targetName = 'Đồng';
      targetRank = 3;
    }
  }

  const progressPct = isTop1 ? 100 : Math.min((bal / (nextGoal || 1)) * 100, 100);
  const upcomingEvents = studentEvents
    .filter(e => e.status === 'published' && new Date(e.end_at) > new Date())
    .slice(0, 4)

  // Tasks based on events
  let tasksList = studentEvents.map(ev => {
    const claim = studentClaims.find(c => c.event_id === ev.id)
    const isApproved = claim && claim.status === 'approved'
    return {
      label: ev.title,
      progress: isApproved ? 1 : 0,
      total: 1,
      done: !!isApproved,
      status: claim ? claim.status : null
    }
  })

  const tasksCompleted = tasksList.filter(t => t.done).length
  const tasksTotal = tasksList.length || 1
  const tasksProgressPct = tasksList.length ? (tasksCompleted / tasksTotal) * 100 : 0

  // Trend calculations
  const now = new Date()
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7)
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-page" style={{ background: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      <div className="w-full px-2 lg:px-4 py-4 space-y-6">

        {/* ── HEADER (Welcome Section + Progress Card) ── */}
        <div className="dashboard-page__welcome-section">
          <div style={{ flexShrink: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Xin chào, {user.full_name || 'Sinh viên'}
            </h1>
            <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="dashboard-page__welcome-text-muted" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span style={{ margin: '0 8px', color: '#ccc' }}>•</span>
              <span className="dashboard-page__welcome-text-green" style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Hôm nay bạn đã tích lũy được tín chỉ xanh nào chưa? <span>🌱</span>
              </span>
            </div>
          </div>

          {/* Progress Card */}
          <div className="progress-card">
            <div className="progress-card__icon-box">
              <img src={logoWeb} alt="logo" className="w-[20px] h-[20px] object-contain" />
            </div>
            <div className="progress-card__content-area">
              <div className="progress-card__top-text">
                {isTop1 ? (
                  <span>Bạn đang dẫn đầu Bảng xếp hạng với <strong>{bal} UGC</strong></span>
                ) : (
                  <span>Bạn đã đạt <strong>{bal} / {nextGoal} UGC</strong></span>
                )}
              </div>
              <div className="progress-card__bottom-row">
                <div className="progress-card__progress-track">
                  <div className="progress-card__progress-fill" style={{ width: `${progressPct}%` }}></div>
                </div>
                <span className="progress-card__percentage">{Math.round(progressPct)}%</span>
                <span className="progress-card__hint-text">
                  {isTop1
                    ? "🎉 Chúc mừng bạn đã giành huy hiệu Vàng!"
                    : `Còn ${nextGoal - bal} UGC để nhận huy hiệu ${targetName} (vượt Top ${targetRank})`}
                </span>
              </div>
            </div>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3176/3176294.png"
              alt="badge"
              className="progress-card__medal-icon"
              style={{
                filter: currentMedal === 'none' ? 'grayscale(1)'
                  : currentMedal === 'silver' ? 'grayscale(1) brightness(1.2)'
                    : currentMedal === 'bronze' ? 'sepia(1) hue-rotate(-30deg) saturate(2) brightness(0.9)'
                      : 'none',
                opacity: currentMedal === 'none' ? 0.5 : 1
              }}
            />
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="dashboard-page__kpi-row">
          {/* Số dư */}
          <div className="kpi-card kpi-card--green">
            <div className="kpi-card__icon-container">
              <img src={iconCard1} alt="UGC" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div className="kpi-card__info" style={{ flex: 1 }}>
              <p className="kpi-card__title kpi-card__title--card1">Số dư tín chỉ</p>
              <div className="kpi-card__value-container">
                <span className="kpi-card__value">{loading ? '…' : bal}</span>
              </div>
              <div className="kpi-card__trend--card1">
                <span className="kpi-card__trend-icon--card1"><i className="ph-bold ph-trend-up"></i></span>
                <span className="kpi-card__trend-text-highlight--card1">{ugcTrendStr.split(' ')[0]}</span>
                <span className="kpi-card__trend-text--card1">&nbsp;{ugcTrendStr.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>
            <div className="kpi-card__top-right-badge">
              <span className="kpi-card__ugc-badge">UGC</span>
            </div>
          </div>

          {/* Tổng đã kiếm */}
          <div className="kpi-card kpi-card--orange">
            <div className="kpi-card__icon-container">
              <div className="kpi-card__icon-inner">
                <i className="ph-fill ph-medal" style={{ fontSize: '22px' }}></i>
              </div>
            </div>
            <div className="kpi-card__info" style={{ flex: 1 }}>
              <p className="kpi-card__title kpi-card__title--card2">Tổng đã kiếm</p>
              <div className="kpi-card__value-container">
                <span className="kpi-card__value">{loading ? '…' : totalEarned}</span>
              </div>
              <div className="kpi-card__trend--card2">
                <span className="kpi-card__trend-icon--card2"><i className="ph-bold ph-trend-up"></i></span>
                <span className="kpi-card__trend-text-highlight--card2">+{ugcThisMonth} UGC</span>
                <span className="kpi-card__trend-text--card2">&nbsp;tháng này</span>
              </div>
            </div>
            <div className="kpi-card__top-right-badge">
              <div className="kpi-card__icon-badge"><i className="ph-fill ph-medal"></i></div>
            </div>
          </div>

          {/* Lần tham gia */}
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-card__icon-container">
              <div className="kpi-card__icon-inner">
                <i className="ph-fill ph-users-three" style={{ fontSize: '22px' }}></i>
              </div>
            </div>
            <div className="kpi-card__info" style={{ flex: 1 }}>
              <p className="kpi-card__title kpi-card__title--card3">Lần tham gia</p>
              <div className="kpi-value-container">
                <span className="kpi-card__value">{loading ? '…' : studentClaims.length}</span>
              </div>
              <div className="kpi-card__trend--card3">
                <span className="kpi-card__trend-icon--card3"><i className="ph-bold ph-trend-up"></i></span>
                <span className="kpi-card__trend-text-highlight--card3">+{actThisMonth} hoạt động</span>
                <span className="kpi-card__trend-text--card3">&nbsp;tháng này</span>
              </div>
            </div>
            <div className="kpi-card__top-right-badge">
              <div className="kpi-card__icon-badge"><i className="ph-fill ph-users-three"></i></div>
            </div>
          </div>

          {/* Chuỗi xanh */}
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-card__icon-container">
              <img src={iconCard4} alt="Streak" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div className="kpi-card__info" style={{ flex: 1 }}>
              <p className="kpi-card__title kpi-card__title--card4">Chuỗi xanh hiện tại</p>
              <div className="kpi-card__value-container">
                <span className="kpi-card__value">{loading ? '…' : streakDays}</span>
                <span className="kpi-card__value-unit">ngày</span>
              </div>
              <div className="kpi-card__trend--card4">
                <span className="kpi-card__trend-text--card4">Kỷ lục của bạn: {maxStreak} ngày</span>
              </div>
            </div>
            <div className="kpi-card__top-right-badge">
              <div className="kpi-card__icon-badge"><i className="ph-fill ph-calendar-blank"></i></div>
            </div>
          </div>
        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="dashboard-page__main-grid">
          <div className="dashboard-page__left-column">
            <div className="dashboard-page__chart-activity-row">
              {/* Chart tăng trưởng tín chỉ */}
              <div className="dashboard-page__card flex flex-col h-[360px]">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }} className="flex items-center gap-1">Tăng trưởng tín chỉ <i className="ph ph-info" style={{ fontSize: '16px', color: '#94a3b8', cursor: 'pointer' }}></i></p>
                    <p style={{ fontSize: 13, color: '#888', marginTop: 4, fontWeight: 500 }}>Thống kê 7 ngày gần nhất</p>
                  </div>
                </div>
                <div className="chart-container flex-1">
                  {loading
                    ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: 32, color: '#ddd' }}>hourglass_empty</span></div>
                    : <StudentUGCChart studentId={user.id} api={api} />
                  }
                </div>
                <div className="mt-2 pt-1">
                  <Link to="/student/claims" className="dashboard-page__link-text flex items-center gap-1 w-max">
                    Xem chi tiết thống kê <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Hoạt động gần đây */}
              <div className="dashboard-page__card flex flex-col h-[360px]">
                <div className="dashboard-page__list-header">
                  <p className="dashboard-page__list-title m-0">Hoạt động gần đây</p>
                  <Link to="/student/claims" className="dashboard-page__link-text">Xem tất cả</Link>
                </div>
                <ScrollArea className="flex-1 pr-3 mr-[-15px] dashboard-page__activity-scroll">
                  <ul className="dashboard-page__activity-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {[...studentClaims]
                      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
                      .filter((c, index, self) => self.findIndex(x => x.event_id === c.event_id) === index)
                      .filter(c => {
                        const claimDate = new Date(c.updated_at || c.created_at);
                        return (new Date() - claimDate) <= 24 * 60 * 60 * 1000;
                      })
                      .map((c, i) => {
                        const imageMap = {
                          'hiến máu': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw',
                          'dọn rác': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
                          'nhựa': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14SOlq3R0r-3nDYB6Ko1XoLKnyxNGVKOXJ2dA-_6ik43yNN5K2S1sfW7LsskwyM7tM7-4DY3U-fZMxoMb5TVd5PIPFe7wuMX87JW2uZlRFGH8I4591sojg0ia--U5JX_qf24qJU5peW3GFd4JzeF5WHKcCCtV4xbuwPc1T9oq0Cf0IileiEHzkZOjTiVxCfDmO5QyTmv8DibNeqzxFsItPJu7MTf0geKtk26NeyAo9ph1h6mOO2Cd0VjAWHupo0dG8PIe_fhnI7I',
                          'trồng cây': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4KG8-XPwNqm7KEzQjUhCOM8qd38W--uWHs9NB-S1U0KfHDpmyGVb2mf8bt9ikxVn-ebXwpRFg0MedawTWeib0fRq1OLf1Uju2Ku8lj2TfgE-gc45Tm-Uouu7_j54zYKIroqVz-trQdlczFElFqCgkxjQx_LLh9cTyEbmGLHzR1Jb4wXLUzkRHHslf9wQS62aLV-OdGyBimSpFY6QVvKWXs11rc6jdro8pDExiDXGreHmy7q5C9JJiKY54JKP_KIFBO2s4XwA8vTs',
                          'xe': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=150&auto=format&fit=crop&q=60',
                          'buýt': 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=150&auto=format&fit=crop&q=60',
                          'nước': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=150&auto=format&fit=crop&q=60'
                        }
                        const defaultImg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtIhg0ZWFRXbL0h7Ube3PNjJGRZUluIeMrOkrS8c5_TNs-4VIrnRpbn5aRh_6vrT3C1rusVFoSkVOjL-QhfD7gTO-391AWkUkdPxx4jN63csv3uyUv0Notw0GmGi3j7JGIz7N-xAk5CUxeFnaOht3B-ab987F7-GPw64Z4k_fQAeWKRYP0CC-Xwz12teASa0qKElDVHEbNODdqNcHKysdNyCdFTTK2ieEKjHi0iEOq6xi4g634UwSu2eaoI3mlLoy3OzgyjYcK2w8'
                        const ev = studentEvents.find(e => e.id === c.event_id)

                        let imgSrc = defaultImg
                        if (ev && ev.activity_description && ev.activity_description.startsWith('/uploads')) {
                          imgSrc = `/api${ev.activity_description}`
                        } else if (c.activity_description && c.activity_description.startsWith('/uploads')) {
                          imgSrc = `/api${c.activity_description}`
                        } else {
                          const searchStr = (((ev ? ev.title : '') || c.event_title || '') + ' ' + (c.activity_name || '')).toLowerCase()
                          const matchedKey = Object.keys(imageMap).find(k => searchStr.includes(k))
                          if (matchedKey) imgSrc = imageMap[matchedKey]
                        }

                        const isPending = c.status === 'submitted'
                        const isRejected = c.status === 'rejected'

                        let statusClass = 'dashboard-page__activity-status--approved'
                        let statusText = `+${c.credit_amount} UGC`
                        if (isPending) {
                          statusClass = 'dashboard-page__activity-status--pending'
                          statusText = 'Đang duyệt'
                        } else if (isRejected) {
                          statusClass = 'dashboard-page__activity-status--rejected'
                          statusText = 'Từ chối'
                        }

                        const titleToShow = ev ? ev.title : c.activity_name

                        return (
                          <li key={i}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="dashboard-page__activity-icon" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <img src={imgSrc} alt={titleToShow} className="w-full h-full object-cover" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#333' }} className="line-clamp-1">{titleToShow}</span>
                                <span style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                  {new Date(c.updated_at || c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(c.updated_at || c.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                            <div className={`dashboard-page__activity-status ${statusClass}`}>
                              {statusText}
                            </div>
                          </li>
                        )
                      })}
                    {studentClaims.length === 0 && <p className="text-sm text-gray-500 text-center py-4 m-0">Chưa có hoạt động nào</p>}
                  </ul>
                </ScrollArea>
              </div>
            </div>

            {/* Thành tích nổi bật */}
            <div className="dashboard-page__card dashboard-page__achievements-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>Thành tích nổi bật</p>
                <button className="dashboard-page__link-text hover:underline" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Xem tất cả</button>
              </div>
              <div className="dashboard-page__badges-container dashboard-page__horizontal-scroll-container">
                {achievements.map((a, i) => (
                  <div key={i} className="dashboard-page__badge-item" style={{ opacity: a.done ? 1 : 0.4 }}>
                    <div className={`dashboard-page__badge-icon ${a.done ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200'}`}>
                      {a.icon}
                    </div>
                    <div className="dashboard-page__badge-text min-w-0">
                      <p className={`text-[12px] font-bold m-0 truncate ${a.done ? 'text-gray-800' : 'text-gray-400'}`}>{a.label}</p>
                      <p className="text-[10px] text-gray-500 m-0 mt-0.5 truncate">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Claims Table */}
            <div className="mt-5 mb-2 w-full max-w-full overflow-hidden relative">
              <ClaimsDataTable claims={studentClaims} loading={loading} nav={nav} />
            </div>

          </div>

          {/* Right column */}
          <div className="dashboard-page__right-column">
            {/* Nhiệm vụ tuần này */}
            <div className="dashboard-page__card flex flex-col h-[360px]">
              <div className="dashboard-page__list-header">
                <p className="dashboard-page__list-title m-0">Nhiệm vụ tuần này</p>
                <Link to="/student/events" className="dashboard-page__link-text">Xem thêm</Link>
              </div>
              <ScrollArea className="flex-1 dashboard-page__activity-scroll">
                <ul className="dashboard-page__task-list">
                  {tasksList.map((task, i) => (
                    <li key={i} className={task.done ? 'completed' : ''}>
                      <div className="dashboard-page__task-info">
                        <div className="dashboard-page__task-check">
                          {task.done && <i className="ph-bold ph-check text-[14px]"></i>}
                        </div>
                        <span className="dashboard-page__task-label">{task.label}</span>
                      </div>
                      <span className="dashboard-page__task-progress">{task.progress}/{task.total}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="dashboard-page__task-summary-footer">
                <div className="dashboard-page__task-summary-info">
                  <div className="dashboard-page__task-summary-track">
                    <div className="dashboard-page__task-summary-fill" style={{ width: `${tasksProgressPct}%` }}></div>
                  </div>
                  <span className="dashboard-page__task-summary-text">{tasksCompleted} / {tasksTotal} hoàn thành</span>
                </div>
                <button className="dashboard-page__task-summary-btn">
                  <i className="ph-fill ph-gift"></i>
                </button>
              </div>
            </div>

            {/* Bảng xếp hạng */}
            <div className="dashboard-page__card">
              <div className="dashboard-page__list-header">
                <p className="dashboard-page__list-title m-0">Bảng xếp hạng</p>
                <button onClick={() => setShowLeaderboardModal(true)} className="dashboard-page__link-text hover:underline" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Xem thêm</button>
              </div>
              <ul className="dashboard-page__leaderboard-list">
                {(leaderboard.me && leaderboard.me.rank <= 3 ? leaderboard.all.slice(0, 4) : leaderboard.all.slice(0, 3)).map((u, i) => {
                  const isMe = u.id === user.id
                  const rankClass = u.rank === 1 ? 'dashboard-page__rank-circle--gold' : u.rank === 2 ? 'dashboard-page__rank-circle--silver' : u.rank === 3 ? 'dashboard-page__rank-circle--bronze' : 'dashboard-page__rank-circle--default'

                  if (isMe) {
                    return (
                      <li key={i} className="dashboard-page__highlight-row">
                        <div className="dashboard-page__leaderboard-info">
                          <div className={`dashboard-page__rank-circle ${rankClass} flex-shrink-0`}>{u.rank}</div>
                          <div className="dashboard-page__avatar-box">{renderAvatar(user, 'w-9 h-9')}</div>
                          <span className="dashboard-page__leaderboard-name--highlight">{u.full_name} (Bạn)</span>
                        </div>
                        <span className="dashboard-page__leaderboard-score--highlight">{u.ugc_balance} UGC</span>
                      </li>
                    )
                  }

                  return (
                    <li key={i} className="dashboard-page__leaderboard-item">
                      <div className="dashboard-page__leaderboard-info">
                        <div className={`dashboard-page__rank-circle ${rankClass} flex-shrink-0`}>{u.rank}</div>
                        <div className="dashboard-page__avatar-box">{renderAvatar(u, 'w-9 h-9')}</div>
                        <span className="dashboard-page__leaderboard-name">{u.full_name}</span>
                      </div>
                      <span className="dashboard-page__leaderboard-score">{u.ugc_balance} UGC</span>
                    </li>
                  )
                })}
                {leaderboard.all.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 m-0">Đang tải bảng xếp hạng...</p>
                )}
              </ul>
              {leaderboard.me && leaderboard.me.rank > 3 && (
                <div className="dashboard-page__highlight-wrapper">
                  <div className="dashboard-page__leaderboard-info">
                    <div className="dashboard-page__rank-circle dashboard-page__rank-circle--default flex-shrink-0">{leaderboard.me.rank}</div>
                    <div className="dashboard-page__avatar-box">{renderAvatar(user, 'w-9 h-9')}</div>
                    <span className="dashboard-page__leaderboard-name--highlight">{leaderboard.me.full_name} (Bạn)</span>
                  </div>
                  <span className="dashboard-page__leaderboard-score--highlight">{leaderboard.me.ugc_balance} UGC</span>
                </div>
              )}
            </div>

            {/* Tin tức & Thông báo Xanh */}
            <div className="dashboard-page__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-lg">newspaper</span>
                  Tin tức & Thông báo
                </p>
                <Link to="/student/news" className="dashboard-page__link-text hover:underline" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Xem tất cả</Link>
              </div>
              <ScrollArea className="h-[220px] w-full pr-3">
                <div className="space-y-3.5">
                  {newsList.map((item) => (
                    <div key={item.id}
                      onClick={() => setSelectedNews(item)}
                      className="border border-gray-150 rounded-2xl p-4 bg-gray-50/20 hover:bg-gray-50 transition-all duration-200 cursor-pointer flex flex-col gap-3 group/news">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${item.badgeColor.split(' ')[0]} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined ${item.badgeColor.split(' ')[1]} text-[20px]`}>{item.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${item.badgeColor}`}>{item.category}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{item.date}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-extrabold text-[13px] text-gray-800 mb-1 leading-snug line-clamp-2 group-hover/news:text-emerald-700 transition-colors">{item.title}</h5>
                        <div className="mt-1 flex items-center gap-1 text-[10.5px] text-emerald-600 font-bold group-hover/news:underline">
                          Đọc chi tiết <span className="material-symbols-outlined text-[12px] transition-transform group-hover/news:translate-x-0.5">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newsList.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">Chưa có tin tức hay thông báo nào.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Leaderboard Modal */}
        {showLeaderboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLeaderboardModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">leaderboard</span> Bảng xếp hạng toàn trường
                </h2>
                <button onClick={() => setShowLeaderboardModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pr-1 space-y-1.5 scrollbar-thin">
                {leaderboard.all.map((u, i) => {
                  const isMe = u.id === user.id
                  const rankClass = u.rank === 1 ? 'dashboard-page__rank-circle--gold' : u.rank === 2 ? 'dashboard-page__rank-circle--silver' : u.rank === 3 ? 'dashboard-page__rank-circle--bronze' : 'dashboard-page__rank-circle--default'
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl transition-all ${isMe ? 'bg-[#F0FDF4] border border-green-200 shadow-sm' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`dashboard-page__rank-circle ${rankClass} flex-shrink-0`}>{u.rank}</div>
                        {renderAvatar(u, 'w-9 h-9')}
                        <span className={`text-[13.5px] font-semibold ${isMe ? 'text-gray-800 font-bold' : 'text-gray-700'}`}>
                          {u.full_name} {isMe && '(Bạn)'}
                        </span>
                      </div>
                      <span className={`text-[13.5px] font-bold ${isMe ? 'dashboard-page__text-green' : 'text-gray-600'}`}>
                        {u.ugc_balance} UGC
                      </span>
                    </div>
                  )
                })}
                {leaderboard.all.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">Chưa có dữ liệu bảng xếp hạng.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* News Detail Modal */}
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedNews(null)}>
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full mx-4 flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="space-y-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedNews.badgeColor}`}>
                    {selectedNews.category}
                  </span>
                  <p className="text-[11px] text-gray-400 font-semibold mt-1">Đăng bởi: {selectedNews.author} · {selectedNews.date}</p>
                </div>
                <button onClick={() => setSelectedNews(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 py-4 pr-1 scrollbar-thin">
                <h3 className="text-base font-extrabold text-gray-900 leading-snug mb-3">{selectedNews.title}</h3>
                <p className="text-xs text-gray-800 leading-relaxed font-semibold bg-gray-50 p-3.5 rounded-2xl border border-gray-100/50 mb-4">{selectedNews.summary}</p>
                <p className="text-xs text-gray-650 leading-relaxed whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => setSelectedNews(null)} className="py-2 px-5 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold text-xs rounded-xl transition-all">Đóng</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
