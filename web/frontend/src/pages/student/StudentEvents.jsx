import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import QRScanner from '../../components/QRScanner.jsx'
import QRGenerator from '../../components/QRGenerator.jsx'
import '../../styles/student/student-events.css'
import logoWeb from '../../logo_web.png'
import ulsaLogo from '../../ulsa_logo.png'
function formatDate(s) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} — ${date}`
  } catch { return s }
}

function getEventStatus(start_at, end_at, offset = 0) {
  if (!start_at || !end_at) return 'ongoing';
  const now = new Date(Date.now() + offset);
  if (now < new Date(start_at)) return 'upcoming';
  if (now > new Date(end_at)) return 'completed';
  return 'ongoing';
}

function toDatetimeLocal(s) {
  if (!s) return ''
  try {
    const d = new Date(s)
    const pad = n => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}

const EMPTY_FORM = { activity_type_id: '', title: '', description: '', location: '', start_at: '', end_at: '' }
const EMPTY_AT = { name: '', credit_amount: '', description: '' }

export default function StudentEvents() {
  const { api, user } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [serverTimeOffset, setServerTimeOffset] = useState(0)
  const [topNotification, setTopNotification] = useState(null)
  const notificationShown = React.useRef(false)

  async function loadAll(currentStatus) {
    setError('')
    try {
      const q = new URLSearchParams()
      if (currentStatus) q.append('status', currentStatus)

      const [res, claimsRes] = await Promise.all([
        api(`/events?${q.toString()}`),
        api('/claims')
      ])

      setEvents(res.events || res)
      setClaims(claimsRes.claims || claimsRes || [])

      if (res.server_time) {
        setServerTimeOffset(new Date(res.server_time).getTime() - Date.now())
      }
    } catch (e) {
      setError(e.message)
      showToast('❌ Lỗi tải dữ liệu')
    }
  }

  useEffect(() => { loadAll(statusFilter) }, [statusFilter])

  async function submitClaim(eventId, file, note, token) {
    setBusy(true)
    try {
      const fd = new FormData()
      if (file) fd.append('evidence', file)
      fd.append('note', note || '')
      fd.append('token', token || '')
      await api(`/events/${eventId}/claims`, { method: 'POST', body: fd })
      showToast('🎉 Đã nộp minh chứng! Chờ duyệt để nhận UGC.')
      return true
    } catch (e) {
      showToast(`❌ ${e.message}`)
      return false
    } finally { setBusy(false) }
  }

  const filteredEvents = useMemo(() => {
    let result = [...events]
    // The backend now filters by status, but we keep this for robust local filtering if needed
    if (statusFilter !== 'all' && statusFilter !== 'latest' && statusFilter !== 'near') {
      result = result.filter(ev => getEventStatus(ev.start_at, ev.end_at, serverTimeOffset) === statusFilter)
    }
    if (searchQuery) {
      result = result.filter(ev => ev.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Hide events that ended more than 7 days ago
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    result = result.filter(ev => {
      if (!ev.end_at) return true;
      return new Date(ev.end_at).getTime() > oneWeekAgo;
    })

    // Sorting logic: 
    // 1. Newest active events (no claim or rejected)
    // 2. Pending claims (submitted)
    // 3. Approved claims
    // 4. Ended events
    result.sort((a, b) => {
      const claimA = claims.find(c => c.event_id === a.id)
      const claimB = claims.find(c => c.event_id === b.id)
      const statusA = claimA ? claimA.status : 'none'
      const statusB = claimB ? claimB.status : 'none'

      const order = { 'none': 1, 'rejected': 1, 'submitted': 2, 'approved': 3 }

      if (order[statusA] !== order[statusB]) {
        return order[statusA] - order[statusB]
      }

      // If same status, sort by newest first (created_at or start_at)
      const dateA = new Date(a.start_at || a.created_at).getTime()
      const dateB = new Date(b.start_at || b.created_at).getTime()
      return dateB - dateA
    })

    return result
  }, [events, statusFilter, searchQuery, serverTimeOffset, claims])

  const widgetTasks = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const tasks = events.map(ev => {
      const claim = claims.find(c => c.event_id === ev.id);
      const eventStatus = getEventStatus(ev.start_at, ev.end_at, serverTimeOffset);
      
      let state = 'pending';
      let finishedDate = null;
      
      if (claim) {
        if (claim.status === 'approved') {
          state = 'done';
          finishedDate = new Date(claim.updated_at || ev.end_at).getTime();
        } else if (claim.status === 'submitted') {
          state = 'in_progress';
        } else if (claim.status === 'rejected') {
          state = eventStatus === 'completed' ? 'expired' : 'pending';
          finishedDate = new Date(claim.updated_at || ev.end_at).getTime();
        }
      } else {
        if (eventStatus === 'completed') {
          state = 'expired';
          finishedDate = new Date(ev.end_at).getTime();
        }
      }
      
      return { 
        id: ev.id,
        label: ev.title, 
        state, 
        finishedDate 
      };
    });

    const activeTasks = tasks.filter(t => {
      if (t.finishedDate && t.finishedDate < oneWeekAgo) {
        return false;
      }
      return true;
    });

    const order = { 'in_progress': 1, 'pending': 2, 'done': 3 };
    activeTasks.sort((a, b) => order[a.state] - order[b.state]);

    return activeTasks;
  }, [events, claims, serverTimeOffset]);

  const completedCount = widgetTasks.filter(t => t.state === 'done').length;
  const totalCount = widgetTasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // --- STREAK CALCULATION ---
  const streakData = useMemo(() => {
    const getLocalDateStr = (dateObj) => {
      const d = new Date(dateObj);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    };

    const eventsByDate = {};
    events.forEach(ev => {
      const dateStr = getLocalDateStr(ev.start_at || ev.created_at || Date.now());
      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
      eventsByDate[dateStr].push(ev);
    });

    const claimsByEventId = {};
    claims.forEach(c => {
      if (c.status === 'approved') claimsByEventId[c.event_id] = true;
    });

    const today = new Date(Date.now() + serverTimeOffset);
    const todayStr = getLocalDateStr(today);
    const currentDayIndex = (today.getDay() + 6) % 7;
    
    let todayHasUnfinishedEvent = false;
    let isLastEventOfWeekDone = false;

    const weeklyChart = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - currentDayIndex + idx);
      const dateStr = getLocalDateStr(d);
      
      const dayEvents = eventsByDate[dateStr] || [];
      const hasEvent = dayEvents.length > 0;
      const isDone = hasEvent && dayEvents.some(ev => claimsByEventId[ev.id]);

      let status = 'no-event';
      if (hasEvent) {
        if (isDone) {
          status = 'done';
        } else if (dateStr < todayStr) {
          status = 'missed';
        } else {
          status = 'pending';
        }
      }

      if (dateStr === todayStr && hasEvent && !isDone) {
        todayHasUnfinishedEvent = true;
      }
      
      return { label, hasEvent, isDone, dateStr, status, events: dayEvents };
    });

    let lastEventDayStr = null;
    for (let i = 6; i >= 0; i--) {
      if (weeklyChart[i].hasEvent) {
        lastEventDayStr = weeklyChart[i].dateStr;
        break;
      }
    }
    if (lastEventDayStr === todayStr) {
      const dayEvents = eventsByDate[todayStr] || [];
      if (dayEvents.length > 0 && dayEvents.some(ev => claimsByEventId[ev.id])) {
        isLastEventOfWeekDone = true;
      }
    }

    const allEventDates = Object.keys(eventsByDate).sort().reverse();
    let streakCount = 0;

    for (const dateStr of allEventDates) {
      if (dateStr > todayStr) continue;
      const dayEvents = eventsByDate[dateStr];
      const isDone = dayEvents.some(ev => claimsByEventId[ev.id]);

      if (isDone) {
        streakCount++;
      } else {
        if (dateStr !== todayStr) break;
      }
    }

    return { weeklyChart, streakCount, todayHasUnfinishedEvent, isLastEventOfWeekDone };
  }, [events, claims, serverTimeOffset]);

  useEffect(() => {
    // Load confetti
    if (!window.confetti) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    if (!notificationShown.current && totalCount > 0) {
      const today = new Date().toLocaleDateString('vi-VN');
      const lastShownDate = localStorage.getItem('lastEventNotificationDate');
      const lastStreakDate = localStorage.getItem('lastStreakNotificationDate');

      // STREAK NOTIFICATIONS (Prioritized over regular tasks if triggered first)
      if (lastStreakDate !== today) {
        if (streakData.isLastEventOfWeekDone) {
          setTopNotification({ type: 'done', msg: <>🎉 Chúc mừng! Bạn đã chinh phục thành công <strong className="events-top-notification-highlight">Chuỗi Xanh</strong> của tuần này!</> });
          notificationShown.current = true;
          localStorage.setItem('lastStreakNotificationDate', today);
          setTimeout(() => setTopNotification(null), 5000);
          
          // Fireworks
          const duration = 4 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
          const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0 || !window.confetti) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            window.confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
          }, 250);
          return;
        } else if (streakData.todayHasUnfinishedEvent) {
          setTopNotification({ type: 'almost', msg: <>🔥 Đừng quên hoàn thành hoạt động hôm nay để giữ vững <strong className="events-top-notification-highlight">Chuỗi Xanh</strong> nhé!</> });
          notificationShown.current = true;
          localStorage.setItem('lastStreakNotificationDate', today);
          setTimeout(() => setTopNotification(null), 5000);
          return;
        }
      }

      // WEEKLY TASKS NOTIFICATIONS
      if (lastShownDate === today) {
        return; // Already shown today
      }

      if (completedCount === totalCount) {
        setTopNotification({ type: 'done', msg: <>🎉 Tuyệt vời! Bạn đã hoàn thành <strong className="events-top-notification-highlight">tất cả nhiệm vụ</strong> tuần này!</> });
        notificationShown.current = true;
        localStorage.setItem('lastEventNotificationDate', today);
        setTimeout(() => setTopNotification(null), 5000);
        
        // Shoot fireworks for 4s
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0 || !window.confetti) {
            return clearInterval(interval);
          }
          const particleCount = 50 * (timeLeft / duration);
          window.confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
        }, 250);

      } else if (completedCount === totalCount - 1 && totalCount > 1) {
        setTopNotification({ type: 'almost', msg: <>🔥 Cố lên! Bạn chỉ còn <strong className="events-top-notification-highlight">1 nhiệm vụ</strong> nữa là hoàn thành <strong className="events-top-notification-highlight">mục tiêu tuần</strong>!</> });
        notificationShown.current = true;
        localStorage.setItem('lastEventNotificationDate', today);
        setTimeout(() => setTopNotification(null), 5000);
      }
    }
  }, [completedCount, totalCount, streakData]);

  return (
    <div className="events-page-container">
      {topNotification && (
        <div className="events-top-notification">
          <div className="events-top-notification-card">
            <div className="events-top-notification-header">@botugc</div>
            <div className="events-top-notification-body">{topNotification.msg}</div>
            <div className="events-top-notification-footer">
              {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      <main className="events-page-main">
        {error && <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm">{error}</div>}


        <div className="events-header">
          <div className="events-header-text">
            <div className="events-badge-container">
              <div className="events-badge">
                <span className="events-badge-text">
                  🌱 Dấu ấn Xanh của bạn
                </span>
                <div className="events-badge-tooltip">
                  Mỗi sự kiện tham gia là một thay đổi tích cực. Hành động ngay để tích lũy UGC và lan tỏa phong cách sống xanh!
                  <div className="events-badge-tooltip-arrow"></div>
                </div>
              </div>
            </div>
            <h2 className="events-title">Kiến tạo mảng xanh, gom đầy tín chỉ</h2>
            <p className="events-subtitle" style={{ marginTop: '-2px' }}>Tham gia các hoạt động xanh để nhận UGC và lan tỏa lối sống bền vững 🌱</p>
          </div>

          <div className="events-actions">
            <div className="events-search">
              <span className="material-symbols-outlined events-search-icon">search</span>
              <input type="text" placeholder="Tìm kiếm hoạt động..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="events-search-input" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="events-filter-btn">
                  <div className="events-filter-text">
                    {statusFilter === 'all' && 'Tất cả trạng thái'}
                    {statusFilter === 'upcoming' && 'Sắp diễn ra'}
                    {statusFilter === 'ongoing' && 'Đang diễn ra'}
                    {statusFilter === 'completed' && 'Đã kết thúc'}
                    {statusFilter === 'latest' && 'Mới nhất'}
                    {statusFilter === 'near' && 'Gần tôi'}
                  </div>
                  <div className="events-filter-icon">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 border border-solid border-slate-200">
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-md cursor-pointer py-2">Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('upcoming')} className="rounded-md cursor-pointer py-2">Sắp diễn ra</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ongoing')} className="rounded-md cursor-pointer py-2">Đang diễn ra</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')} className="rounded-md cursor-pointer py-2">Đã kết thúc</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="events-layout">
          <div className="events-content">
            <div className="events-tabs custom-scrollbar">
              {[
                { label: 'Tất cả', value: 'all' },
                { label: 'Đang diễn ra', value: 'ongoing' },
                { label: 'Sắp diễn ra', value: 'upcoming' },
                { label: 'Mới nhất', value: 'latest' },
                { label: 'Gần tôi', value: 'near' }
              ].map((tab) => {
                const isActive = statusFilter === tab.value
                return (
                  <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                    className={`events-tab-btn ${isActive ? 'events-tab-btn--active' : 'events-tab-btn--inactive'}`}>
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="events-list">
              {filteredEvents.map(ev => {
                const claim = claims.find(c => c.event_id === ev.id)
                return (
                  <EventCard key={ev.id} ev={ev} serverTimeOffset={serverTimeOffset} onSubmitClaim={submitClaim} busy={busy} claim={claim} />
                )
              })}
              {filteredEvents.length === 0 && (
                <div className="events-empty">
                  <span className="material-symbols-outlined events-empty-icon">event_busy</span>
                  <p>Không tìm thấy nhiệm vụ nào phù hợp.</p>
                </div>
              )}
            </div>

            <div className="events-load-more">
              <button className="events-load-more-btn">
                Xem thêm <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
            </div>
          </div>

          <div className="events-sidebar">
            <div className="sidebar-widget">
              <div className="sidebar-widget-header">
                <h3 className="sidebar-widget-title">Nhiệm vụ tuần này</h3>
                <span className="sidebar-widget-link">Xem tất cả</span>
              </div>
              <ScrollArea className="h-[240px] w-full events-sidebar-scroll-area">
                <div className="sidebar-task-list" style={{ marginBottom: 0 }}>
                  {widgetTasks.length > 0 ? widgetTasks.map((t) => (
                    <div key={t.id} className={`sidebar-task-item ${t.state === 'pending' ? 'sidebar-task-item--pending' : ''}`}>
                      <div className="sidebar-task-info">
                        <span className={`material-symbols-outlined text-lg ${
                          t.state === 'done' ? 'sidebar-task-icon--done' : 
                          t.state === 'in_progress' ? 'sidebar-task-icon--inprogress' : 
                          t.state === 'expired' ? 'sidebar-task-icon--expired' : 
                          'sidebar-task-icon--pending'
                        }`}>
                          {t.state === 'done' ? 'check_circle' : 
                           t.state === 'in_progress' ? 'cached' : 
                           t.state === 'expired' ? 'cancel' : 
                           'radio_button_unchecked'}
                        </span>
                        <span className={`sidebar-task-name ${
                          t.state === 'in_progress' ? 'sidebar-task-name--inprogress' : 
                          t.state === 'expired' ? 'sidebar-task-name--expired' : ''
                        }`}>
                          {t.label}
                        </span>
                      </div>
                      <span className={
                        t.state === 'done' ? 'sidebar-task-progress--done' : 
                        t.state === 'in_progress' ? 'sidebar-task-progress--inprogress' :
                        t.state === 'expired' ? 'sidebar-task-progress--expired' :
                        'sidebar-task-progress--pending'
                      }>
                        {t.state === 'done' ? '1/1' : '0/1'}
                      </span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 font-medium">Chưa có nhiệm vụ nào</p>
                  )}
                </div>
              </ScrollArea>
              <div className="sidebar-progress-bar">
                <div className="sidebar-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="sidebar-progress-text">{completedCount} / {totalCount} hoàn thành</p>
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-widget-header">
                <h3 className="sidebar-widget-title">Chuỗi xanh</h3>
                <span className="sidebar-widget-link">Xem lịch sử</span>
              </div>
              <div className="sidebar-streak-info">
                <span className={`text-3xl sidebar-streak-fire ${streakData.streakCount >= 5 ? 'fire-huge' : streakData.streakCount >= 3 ? 'fire-big' : ''}`}>🔥</span>
                <div>
                  <h4 className="sidebar-streak-days">{streakData.streakCount} ngày</h4>
                  <p className={`sidebar-streak-text ${
                    streakData.streakCount === 0 ? 'streak-text-zero' :
                    streakData.todayHasUnfinishedEvent ? 'streak-text-danger' :
                    streakData.streakCount < 3 ? 'streak-text-normal' :
                    streakData.streakCount < 5 ? 'streak-text-fire' : 'streak-text-huge'
                  }`}>
                    {streakData.streakCount === 0 ? "Bắt đầu ngay!" :
                     streakData.todayHasUnfinishedEvent ? "Sắp đứt chuỗi!" :
                     streakData.streakCount < 3 ? "Đang khởi động" :
                     streakData.streakCount < 5 ? "Đang bốc cháy!" : "Không thể cản bước!"}
                  </p>
                </div>
              </div>
              <div className="sidebar-streak-chart">
                {streakData.weeklyChart.map((d, i) => (
                  <HoverCard key={d.label} openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="sidebar-streak-day cursor-pointer">
                        <div className={`sidebar-streak-circle sidebar-streak-circle--${d.status}`}>
                          {d.status === 'done' && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                          {d.status === 'missed' && <span className="material-symbols-outlined text-[14px] font-bold">close</span>}
                        </div>
                        <span className="sidebar-streak-label" style={{ opacity: d.hasEvent ? 1 : 0.5 }}>{d.label}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" className="w-56 p-3 text-sm text-left shadow-lg">
                      {d.status === 'done' && (
                        <div>
                          <p className="font-semibold text-green-600 mb-1">Đã tham gia</p>
                          <p className="text-slate-600 text-xs line-clamp-2">{d.events.length > 0 ? `Sự kiện: ${d.events[0].name}` : 'Bạn đã hoàn thành sự kiện.'}</p>
                        </div>
                      )}
                      {d.status === 'missed' && (
                        <div>
                          <p className="font-semibold text-red-600 mb-1">Bị hủy / Bỏ lỡ</p>
                          <p className="text-slate-600 text-xs line-clamp-2">{d.events.length > 0 ? `Sự kiện: ${d.events[0].name}` : 'Bạn đã không tham gia.'}</p>
                          <p className="text-slate-500 text-[10px] mt-1 italic">Có thể do bạn không minh chứng đúng hạn.</p>
                        </div>
                      )}
                      {d.status === 'pending' && (
                        <div>
                          <p className="font-semibold text-orange-600 mb-1">Sắp diễn ra / Đang chờ</p>
                          <p className="text-slate-600 text-xs line-clamp-2">{d.events.length > 0 ? `Sự kiện: ${d.events[0].name}` : 'Bạn có sự kiện chưa hoàn thành.'}</p>
                        </div>
                      )}
                      {d.status === 'no-event' && (
                        <div>
                          <p className="font-semibold text-slate-600 mb-1">Ngày trống</p>
                          <p className="text-slate-600 text-xs">Hôm nay không có hoạt động nào diễn ra.</p>
                        </div>
                      )}
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-widget-header">
                <h3 className="sidebar-widget-title">Hoạt động nổi bật</h3>
                <span className="sidebar-widget-link">Xem tất cả</span>
              </div>
              <div className="sidebar-highlight">
                <div className="sidebar-highlight-bg">🌍</div>
                <span className="sidebar-highlight-badge">Sự kiện lớn</span>
                <h4 className="sidebar-highlight-title">Ngày Môi trường Thế giới 2026</h4>
                <p className="sidebar-highlight-desc">Tham gia các hoạt động xanh nhận ngay</p>
                <div className="sidebar-highlight-reward">
                  +50 UGC
                </div>
                <div className="sidebar-highlight-time">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Còn 02 ngày 14 giờ
                </div>
              </div>
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-widget-header">
                <h3 className="sidebar-widget-title">Gợi ý cho bạn</h3>
                <span className="sidebar-widget-link">Xem tất cả</span>
              </div>
              <div className="sidebar-suggestion">
                <div className="sidebar-suggestion-icon">
                  <span className="text-2xl text-[#16a34a]">🚴</span>
                </div>
                <div className="sidebar-suggestion-info">
                  <h4 className="sidebar-suggestion-title">Marathon Xanh ULSA 2026</h4>
                  <p className="sidebar-suggestion-desc">Thử thách đạp xe 30km trong 7 ngày</p>
                  <div className="sidebar-suggestion-action">
                    <span className="sidebar-suggestion-reward">+30 UGC</span>
                    <button className="sidebar-suggestion-btn">
                      KHÁM PHÁ
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

    </div>
  )
}

function EventDetailsModal({ ev, imgSrc, onClose, onCheckIn, userRole, showQRScanner, open, serverTimeOffset, onOpenSubmitClaim, claim }) {
  const status = getEventStatus(ev.start_at, ev.end_at, serverTimeOffset);
  const isOngoing = status === 'ongoing';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="event-modal-container">

        {/* Close Button */}
        <button onClick={onClose} className="event-modal-close">
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>

        {/* Left Column: Image Area & Logos */}
        <div className="event-modal-left">
          <div className="event-modal-image-wrapper">
            <img alt={ev.title} className="event-modal-image" src={imgSrc} />
          </div>

          <div className="event-modal-logos-section">
            <div className="event-modal-logos">
              <img src={logoWeb} alt="Tool Logo" className="event-modal-logo-img-1" />
              <img src={ulsaLogo} alt="ULSA Logo" className="event-modal-logo-img-2" />
            </div>
            <p className="event-modal-logo-text">
              Nền tảng hỗ trợ quản lý hoạt động cộng đồng và xác minh tín chỉ bằng Blockchain.
            </p>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="event-modal-right">
          <div className="event-modal-scroll-area custom-scrollbar">

            {/* Badges */}
            <div className="event-modal-badges">
              <span className="event-modal-badge-primary">
                {ev.activity_name || 'SỰ KIỆN'}
              </span>
              <span className="event-modal-badge-secondary">
                +{ev.credit_amount} UGC
              </span>
            </div>

            {/* Title & Subtitle */}
            <h2 className="event-modal-title">
              {ev.title}
            </h2>
            <p className="event-modal-subtitle">
              Cùng nhau chia sẻ, trao đi những giá trị tốt đẹp cho cộng đồng.
            </p>

            {/* Details List */}
            <div className="event-modal-details-list">

              {/* Location */}
              <div className="event-modal-detail-item">
                <span className="material-symbols-outlined event-modal-detail-icon">location_on</span>
                <div>
                  <p className="event-modal-detail-label">Địa điểm</p>
                  <p className="event-modal-detail-value">{ev.location || 'Khu C - Đại học ULSA'}</p>
                </div>
              </div>

              {/* Time */}
              <div className="event-modal-detail-item">
                <span className="material-symbols-outlined event-modal-detail-icon">schedule</span>
                <div>
                  <p className="event-modal-detail-label">Thời gian</p>
                  <div>
                    <p className="event-modal-detail-value">
                      Bắt đầu: {formatDate(ev.start_at)}
                    </p>
                    <p className="event-modal-detail-value">
                      Kết thúc: {formatDate(ev.end_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Task */}
              <div className="event-modal-detail-item">
                <span className="material-symbols-outlined event-modal-detail-icon">description</span>
                <div>
                  <p className="event-modal-detail-label">Nhiệm vụ của bạn</p>
                  <p className="event-modal-detail-value clamp-2">
                    {ev.description || 'Tham gia hoạt động, góp phần giúp đỡ cộng đồng và phát triển bền vững.'}
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="event-modal-detail-item">
                <span className="material-symbols-outlined event-modal-detail-icon">verified</span>
                <div>
                  <p className="event-modal-detail-label">Minh chứng yêu cầu</p>
                  <div className="event-modal-detail-bullet-list">
                    <div className="event-modal-detail-bullet">
                      <span className="material-symbols-outlined">check</span>
                      Ảnh tham gia hoạt động
                    </div>
                    <div className="event-modal-detail-bullet">
                      <span className="material-symbols-outlined">check</span>
                      Xác nhận từ ban tổ chức
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Action Button Footer */}
          <div className="event-modal-footer">
            {userRole === 'student' && status === 'upcoming' && (
              <button disabled className="event-modal-btn-disabled" style={{ width: '100%', height: '38px', backgroundColor: '#e2e8f0', color: '#64748b', border: 'none', fontSize: '12px', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Sắp diễn ra
              </button>
            )}

            {userRole === 'student' && claim && claim.status === 'approved' && (
              <button disabled className="event-modal-btn-disabled" style={{ width: '100%', height: '38px', backgroundColor: '#189E1E', color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Đã tham gia
              </button>
            )}

            {userRole === 'student' && claim && claim.status === 'submitted' && (
              <button disabled className="event-modal-btn-disabled" style={{ width: '100%', height: '38px', backgroundColor: '#FB8C00', color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Chờ duyệt
              </button>
            )}

            {userRole === 'student' && status === 'completed' && (!claim || (claim.status !== 'approved' && claim.status !== 'submitted')) && (
              <button disabled className="event-modal-btn-disabled" style={{ width: '100%', height: '38px', backgroundColor: '#A5A5A5', color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Hết thời gian
              </button>
            )}

            {userRole === 'student' && isOngoing && (!claim || claim.status === 'rejected') && (
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                <button
                  onClick={() => { onClose(); showQRScanner(); }}
                  className="event-modal-btn-primary"
                  style={{ flex: 1, padding: '12px 0' }}
                >
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  Quét QR
                </button>
                <button
                  onClick={() => { onClose(); onOpenSubmitClaim(); }}
                  className="event-modal-btn-primary"
                  style={{ flex: 1, backgroundColor: '#0284c7', padding: '12px 0' }}
                >
                  <span className="material-symbols-outlined">upload_file</span>
                  Nộp ảnh
                </button>
              </div>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

function EventCard({ ev, serverTimeOffset, onSubmitClaim, busy, claim }) {
  const { user } = useAuth()
  const userRole = user?.role
  const { showToast } = useToast()
  const [showDetails, setShowDetails] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')

  const status = getEventStatus(ev.start_at, ev.end_at, serverTimeOffset)

  const statusConfig = {
    upcoming: { color: 'event-status-upcoming', label: 'SẮP DIỄN RA', icon: 'event' },
    ongoing: { color: 'event-status-ongoing', label: 'ĐANG DIỄN RA', icon: 'local_fire_department' },
    completed: { color: 'event-status-completed', label: 'ĐÃ KẾT THÚC', icon: 'check_circle' }
  }

  const tags = ['Sự kiện']
  if (ev.activity_name?.toLowerCase().includes('đạp xe')) tags.push('Cá nhân', 'Hàng ngày')
  else if (ev.activity_name?.toLowerCase().includes('tái chế')) tags.push('Nhóm', 'Cuối tuần')
  else tags.push('Nhóm', 'Dài hạn')

  const imageMap = {
    'hiến máu': 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&q=80',
    'dọn rác': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=80',
    'trồng cây': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'
  }
  const defaultImg = 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=800&q=80'
  const activityLower = ev.activity_name?.toLowerCase() || ''

  let imgSrc = defaultImg
  if (ev.image_url) {
    imgSrc = `${import.meta.env.VITE_BACKEND_URL}${ev.image_url}`
  } else if (ev.activity_description && ev.activity_description.startsWith('/uploads')) {
    imgSrc = `/api${ev.activity_description}`
  } else {
    imgSrc = imageMap[Object.keys(imageMap).find(k => activityLower.includes(k))] || defaultImg
  }

  const start = new Date(ev.start_at);
  const now = new Date(Date.now() + serverTimeOffset);
  const diffTime = start - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let timeStr = 'Đang diễn ra';
  if (status === 'upcoming') {
    timeStr = `Bắt đầu sau ${diffDays} ngày`;
    if (diffDays === 0) timeStr = `Bắt đầu sau ${diffHours} giờ`;
  } else if (status === 'completed') {
    timeStr = 'Đã kết thúc';
  } else {
    const end = new Date(ev.end_at);
    const diffE = Math.floor((end - now) / (1000 * 60 * 60 * 24));
    const diffEH = Math.floor(((end - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timeStr = `Còn ${diffE} ngày ${diffEH} giờ`;
  }

  return (
    <>
      <div className="event-card-wrapper group">
        <div className="event-card-img-box" onClick={() => setShowDetails(true)}>
          <img src={imgSrc} alt={ev.title} className="event-card-img" />
          <div className={`event-card-badge-top ${statusConfig[status].color}`}>
            <span className="material-symbols-outlined text-[12px]">{statusConfig[status].icon}</span>
            {statusConfig[status].label}
          </div>
          <div className="event-card-badge-bottom">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {ev.credit_amount} UGC
          </div>
        </div>

        <div className="event-card-info" onClick={() => setShowDetails(true)}>
          <span className="event-card-category">{ev.activity_name}</span>
          <h3 className="event-card-title">{ev.title}</h3>
          <p className="event-card-desc">{ev.description || 'Tham gia sự kiện xanh...'}</p>

          <div className="event-card-meta">
            <div className="event-card-meta-item">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span className="event-card-meta-text">{ev.location || 'Chưa cập nhật'}</span>
            </div>
            <div className="event-card-meta-item">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{new Date(ev.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="event-card-tags">
            {tags.map(t => (
              <span key={t} className="event-card-tag">{t}</span>
            ))}
          </div>
        </div>

        <div className="event-card-actions">
          <div className="event-card-reward">
            <div className="event-card-reward-badge" style={status === 'upcoming' ? { color: '#16a34a' } : {}}>
              +{ev.credit_amount} UGC
            </div>
            <div className="event-card-time" style={status === 'upcoming' ? { color: '#475569' } : {}}>
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeStr}
            </div>
          </div>

          <div className="event-card-btns">
            {status === 'upcoming' ? (
              <button className="event-card-btn-disabled w-full" style={{ boxSizing: 'border-box', backgroundColor: 'white', color: '#16a34a', border: '1px solid #16a34a', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: '700', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}>
                Xem trước
              </button>
            ) : claim && claim.status === 'approved' ? (
              <button className="event-card-btn-disabled w-full" style={{ boxSizing: 'border-box', backgroundColor: '#189E1E', color: 'white', border: 'none', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: '700', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled>
                Đã tham gia
              </button>
            ) : claim && claim.status === 'submitted' ? (
              <button className="event-card-btn-disabled w-full" style={{ boxSizing: 'border-box', backgroundColor: '#FB8C00', color: 'white', border: 'none', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: '700', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled>
                Chờ duyệt
              </button>
            ) : status === 'completed' ? (
              <button className="event-card-btn-disabled w-full" style={{ boxSizing: 'border-box', backgroundColor: '#A5A5A5', color: 'white', border: 'none', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: '700', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled>
                Hết thời gian
              </button>
            ) : (
              <button className="event-card-btn-primary w-full" onClick={() => setShowDetails(true)}>
                Tham gia
              </button>
            )}

            <button className="event-card-btn-text h-auto p-0 border-0 bg-transparent flex items-center justify-center gap-1 text-[13px] font-semibold text-[#0f172a] hover:opacity-80" onClick={() => setShowDetails(true)}>
              Xem chi tiết <span className="material-symbols-outlined text-[14px] leading-none">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <EventDetailsModal
          ev={ev}
          imgSrc={imgSrc}
          open={showDetails}
          onClose={() => setShowDetails(false)}
          onCheckIn={() => setShowScanner(true)}
          userRole={userRole}
          showQRScanner={() => setShowScanner(true)}
          serverTimeOffset={serverTimeOffset}
          onOpenSubmitClaim={() => setOpen(true)}
          claim={claim}
        />
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
      {open && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-headline font-black text-on-surface mb-2">Xác minh tham gia</h2>
            <p className="text-on-surface-variant text-sm mb-6">Tải lên hình ảnh minh chứng để hoàn tất quá trình Check-in và nhận {ev.credit_amount} UGC.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Hình ảnh minh chứng</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])}
                  className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Ghi chú (Tùy chọn)</label>
                <textarea placeholder="Nhập ghi chú thêm nếu có..." value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-surface-container-high rounded-xl p-3 text-sm outline-none border-none text-on-surface" rows={3}></textarea>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl bg-surface-container-highest font-bold text-sm text-on-surface hover:bg-surface-variant transition-colors">Để sau</button>
              <button onClick={async () => {
                if (await onSubmitClaim(ev.id, file, note)) setOpen(false);
              }} disabled={busy} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:scale-[1.02] shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                {busy ? 'Đang nộp...' : 'Gửi xác minh'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
