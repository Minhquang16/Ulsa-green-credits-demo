/**
 * dashboardHelpers.jsx
 * Các helper functions và sub-components dùng chung cho tất cả dashboard roles.
 * Được tách ra từ DashboardPage.jsx để tránh lặp code.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// ── Utility functions ──────────────────────────────────────────────────────────

export function shortAddr(h) {
  return h ? h.slice(0, 6) + '...' + h.slice(-4) : '—'
}

export function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'Vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

// ── Avatar Renderer ────────────────────────────────────────────────────────────

export function renderAvatar(u, sizeClass = 'w-10 h-10') {
  if (u?.avatar_url) {
    const src = u.avatar_url.startsWith('http') ? u.avatar_url : u.avatar_url;
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm`}>
        <img src={src} alt="avatar" className="w-full h-full object-cover" />
      </div>
    )
  }

  // Preset photo avatars for mock students to match mockup
  if (u?.username === 'minhanh') {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm`}>
        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCa5hqxGqi0xefKNJWNuFNGScvF7fvvyqTIOZ8D1qoLwE4-Z2JtDqiXj4Y4q-uTlv2U13UoAQIBW6rEAVkzXOChWH_jVZLnIVUaxTgLldXppdkEvndQofXNuVa634y5_HMxSE1dNQOKxGJiOBmLC59aZ-5VqOAX_SYAMXAEtWTUfMq7tiqsIfNSDzW0y8CQaFTAkSE8IqBrfzFjfNgYgyo_ez7BAGZIShCFnjPLDLqXXJgz7soAXOonZmWpPn56V9_Il7tfSQHKVaw" alt="avatar" className="w-full h-full object-cover" />
      </div>
    )
  }

  let bgColor = '#2a3d34'
  let label = '??'
  if (u?.role === 'admin') {
    bgColor = '#e11d48' // rose-600
    label = 'AD'
  } else if (u?.role === 'verifier') {
    bgColor = '#4f46e5' // indigo-600
    label = 'VF'
  } else if (u?.full_name) {
    const cleanName = u.full_name.replace(/\s*\(Bạn\)\s*$/gi, '').trim()
    label = cleanName.split(' ').pop()?.slice(0, 2).toUpperCase() || '??'
  }

  return (
    <div className={`${sizeClass} rounded-full text-white font-semibold flex items-center justify-center flex-shrink-0 select-none shadow-sm text-xs`} style={{ backgroundColor: bgColor }}>
      {label}
    </div>
  )
}

// ── Bar Chart (Admin) ──────────────────────────────────────────────────────────

export function BarChart({ data }) {
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

// ── Line Sparkline ─────────────────────────────────────────────────────────────

export function LineSparkline({ value, positive = true }) {
  const pts = [20, 35, 28, 45, 38, 52, 47, 60].map((y, x) => ({ x: x * 14, y: 80 - y }))
  const d = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`
  return (
    <svg width="80" height="32" viewBox="0 0 98 80" className="overflow-visible">
      <path d={d} fill="none" stroke={positive ? '#16a34a' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Trend Renderer ─────────────────────────────────────────────────────────────

export function renderTrend(trend, pos, isBottom = false) {
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

// ── Student Level Helper ───────────────────────────────────────────────────────

export function getStudentLevel(balance) {
  if (balance >= 200) return { label: 'Xanh Bền Vững', color: '#89DB1F', bg: '#f3ffe0', icon: 'forest' }
  if (balance >= 100) return { label: 'Xanh Lá', color: '#89DB1F', bg: '#edffc0', icon: 'eco' }
  if (balance >= 50) return { label: 'Xanh Mầm', color: '#89DB1F', bg: '#f3ffe0', icon: 'grass' }
  return { label: 'Mới bắt đầu', color: '#6b7280', bg: '#f9fafb', icon: 'sprout' }
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

export function CustomTooltip({ active, payload, label }) {
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
    )
  }
  return null
}

// ── Chart Config ───────────────────────────────────────────────────────────────

export const chartConfig = {
  totalUgc: {
    label: 'Tín chỉ',
    color: '#10b981',
  },
}

// ── Student UGC Chart ──────────────────────────────────────────────────────────

export function StudentUGCChart({ studentId, api }) {
  const [data, setData] = useState([])
  const [totalUgc, setTotalUgc] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWeeklyStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api(`/ugc/weekly-stats/${studentId}`)
      if (res && res.success) {
        setData(res.data)
        setTotalUgc(res.total_weekly_ugc)
      } else {
        throw new Error('Không thể tải cấu trúc dữ liệu.')
      }
    } catch (err) {
      console.error(err)
      setError('Không thể kết nối API thống kê tín chỉ.')
    } finally {
      setLoading(false)
    }
  }, [studentId, api])

  useEffect(() => {
    if (studentId) {
      fetchWeeklyStats()
    }
  }, [studentId, fetchWeeklyStats])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined animate-spin text-[32px] text-emerald-600">progress_activity</span>
      </div>
    )
  }

  // Khởi tạo data mặc định nếu API trả rỗng để tránh lỗi
  const chartData = (data && data.length > 0) ? data : [
    { day: 'T2', total_ugc: 0 }, { day: 'T3', total_ugc: 0 }, { day: 'T4', total_ugc: 0 },
    { day: 'T5', total_ugc: 0 }, { day: 'T6', total_ugc: 0 }, { day: 'T7', total_ugc: 0 }, { day: 'CN', total_ugc: 0 }
  ]

  const maxVal = Math.max(...chartData.map(d => d.total_ugc), 1)
  const step = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 100 ? 20 : 50
  const actualMax = Math.ceil(maxVal / step) * step + step
  const yTicks = Array.from({ length: Math.floor(actualMax / step) + 1 }, (_, i) => i * step)

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 160, paddingBottom: 0, bottom: 0 }}>
      <ChartContainer
        config={{ total_ugc: { label: 'UGC', color: '#10b981' } }}
        style={{
          width: '100%',
          height: '100%',
          paddingBottom: 0,
          bottom: 0
        }}
      >
        <AreaChart
          data={chartData}
          margin={{
            top: 16,
            right: 4,
            left: 0,
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
  )
}
