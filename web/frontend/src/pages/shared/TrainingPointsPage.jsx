import React, { useState, useEffect, useCallback } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../auth.jsx';

// ─── Loading Skeleton ───────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ─── Grade badge color ──────────────────────────────────────────────────────
function gradeColor(grade) {
  if (grade === 'Xuất sắc') return 'text-[#fbbc05]';
  if (grade === 'Giỏi') return 'text-green-400';
  if (grade === 'Khá') return 'text-blue-300';
  return 'text-gray-300';
}

// ─── Custom Radar Tick ──────────────────────────────────────────────────────
const CustomTick = ({ payload, x, y, textAnchor, radarData }) => {
  const data = (radarData || []).find(d => d.subject === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={-8} textAnchor={textAnchor} fill="#4b5563" fontSize={11} fontWeight={600}>
        {payload.value}
      </text>
      <text x={0} y={6} textAnchor={textAnchor} fill="#0f9d58" fontSize={13} fontWeight={800}>
        {data ? data.student : ''}<tspan fill="#9ca3af" fontSize={10} fontWeight={600}>/100</tspan>
      </text>
    </g>
  );
};

// ─── Format date ────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

export default function TrainingPointsPage() {
  const { api } = useAuth();

  // State for each section
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [radarData, setRadarData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [quickStats, setQuickStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [trainingPoints, setTrainingPoints] = useState(null);

  const [lbScope, setLbScope] = useState('school');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load all data in parallel
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, radarRes, actRes, qsRes, achRes, tpRes] = await Promise.all([
        api('/training-points/profile'),
        api('/training-points/radar'),
        api('/training-points/recent-activity'),
        api('/training-points/quick-stats'),
        api('/me/achievements'),
        api('/me/training-points'),
      ]);
      if (profileRes.success) setProfile(profileRes.data);
      if (radarRes.success) setRadarData(radarRes.data);
      if (actRes.success) setRecentActivity(actRes.data);
      if (qsRes.success) setQuickStats(qsRes.data);
      setAchievements(Array.isArray(achRes) ? achRes : []);
      setTrainingPoints(tpRes || null);
    } catch (e) {
      setError('Không thể tải dữ liệu: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load leaderboard when scope changes
  const loadLeaderboard = useCallback(async (scope) => {
    try {
      const res = await api(`/training-points/leaderboard?scope=${scope}`);
      if (res.success) setLeaderboard(res.data);
    } catch (e) { /* ignore */ }
  }, [api]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadLeaderboard(lbScope); }, [lbScope, loadLeaderboard]);

  const achievedBadges = achievements.filter(a => a.done);
  const inProgressBadges = achievements.filter(a => !a.done).slice(0, 2);

  // ─── Derived from trainingPoints for progress bars ──────────────────────
  const breakdown = trainingPoints?.ugcBreakdown || {};
  const totalSections = {
    mandatory: (breakdown.iii_1?.points || 0) + (breakdown.iii_2?.points || 0) + (breakdown.iii_3?.points || 0),
    support: (breakdown.iii_4?.points || 0),
    optional: (breakdown.iv_3?.points || 0) + (breakdown.iv_4?.points || 0),
    encourage: 0
  };
  const score = profile?.trainingScore || 0;

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8 font-sans bg-[#f8fcf9] min-h-screen">
        <div className="flex flex-col xl:flex-row gap-6 mb-6">
          <Skeleton className="flex-1 h-[240px] rounded-[24px]" />
          <Skeleton className="w-full xl:w-[380px] h-[240px] rounded-[24px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[320px] rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8 font-sans bg-[#f8fcf9] min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-center">
          <span className="material-symbols-outlined text-[40px] mb-2 block">error</span>
          <p className="font-bold mb-2">Lỗi tải dữ liệu</p>
          <p className="text-sm">{error}</p>
          <button onClick={loadAll} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const p = profile || {};
  const u = p.user || {};

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 font-sans bg-[#f8fcf9] min-h-screen">

      {/* ── Top: Green CV Banner + Leaderboard ── */}
      <div className="flex flex-col xl:flex-row gap-6 mb-6">

        {/* Green CV Banner */}
        <div className="flex-1 bg-gradient-to-br from-[#1b8c4c] to-[#0f9d58] rounded-[24px] p-8 text-white relative overflow-hidden shadow-lg border border-green-700/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center bg-green-800 text-4xl font-bold overflow-hidden">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : (u.full_name?.charAt(0) || 'SV')}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#fbbc05] rounded-lg rotate-45 flex items-center justify-center border-2 border-white shadow-sm">
                <span className="material-symbols-outlined text-white -rotate-45 text-xl">eco</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-green-100">Hồ sơ năng lực xanh (Green CV)</h2>
                <span className="material-symbols-outlined text-[14px] text-white">verified</span>
              </div>
              <h1 className="text-3xl font-black mb-3">{u.full_name || '—'}</h1>
              <div className="text-sm text-green-50 mb-4 flex flex-wrap gap-4 justify-center md:justify-start">
                <span>MSV: {u.student_id || 'Chưa cập nhật'}</span>
                <span className="opacity-50">•</span>
                <span>Khoa: {u.faculty || 'Chưa cập nhật'}</span>
                <span className="opacity-50">•</span>
                <span>Lớp: {u.class_name || 'Chưa cập nhật'}</span>
              </div>
              <div className="text-sm text-green-50 mb-6 flex flex-col md:flex-row gap-2 md:gap-6 justify-center md:justify-start">
                <span>Email: {u.email || u.username || '—'}</span>
                <span>Thành viên từ: {u.created_at ? `${new Date(u.created_at).getMonth()+1}/${new Date(u.created_at).getFullYear()}` : '—'}</span>
              </div>
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                  Hạng hiện tại <span className="material-symbols-outlined text-[14px] text-[#fbbc05]">diamond</span> <strong className="text-white">{p.rankTitle || '—'}</strong>
                </span>
                <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                  Chuỗi xanh: <span className="text-[#fbbc05]">🔥</span> <strong>{p.streakData?.currentStreak || 0} ngày liên tiếp</strong>
                </span>
              </div>
            </div>

            {/* Score Ring */}
            <div className="flex flex-col items-center shrink-0 mt-6 md:mt-0">
              <p className="text-xs font-bold uppercase tracking-widest text-green-100 mb-3">Điểm rèn luyện hiện tại</p>
              <div className="relative w-36 h-36 flex items-center justify-center mb-2">
                <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbc05" strokeWidth="8"
                    strokeDasharray="283" strokeDashoffset={283 - (283 * score) / 100}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-black">{score}</span>
                  <span className="text-sm text-green-200">/100</span>
                </div>
              </div>
              <p className="text-xs text-green-100 mb-1">Xếp loại</p>
              <p className={`text-lg font-bold mb-2 ${gradeColor(p.grade)}`}>{p.grade || '—'}</p>
              <div className="flex items-center gap-1 text-sm font-bold text-white">
                <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                {p.rank ? `Top ${p.rank}` : '—'}
              </div>
              <p className="text-[10px] text-green-100">/ {p.totalStudents || 0} sinh viên</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="w-full xl:w-[380px] bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Bảng xếp hạng</h3>

          <div className="flex items-center bg-gray-50 rounded-xl p-1 mb-6">
            {[
              { key: 'school', label: 'Toàn trường' },
              { key: 'faculty', label: 'Khoa' },
              { key: 'class', label: 'Lớp' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setLbScope(tab.key)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-${lbScope === tab.key ? 'bold' : 'medium'} transition-colors
                  ${lbScope === tab.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {leaderboard ? (
              <>
                {(leaderboard.top3 || []).map((student, idx) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className={`w-6 flex justify-center font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-amber-700'}`}>{idx + 1}</div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs overflow-hidden">
                      {student.avatar_url
                        ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                        : ['🥇','🥈','🥉'][idx]}
                    </div>
                    <p className="text-sm font-medium text-gray-900 flex-1 truncate">{student.full_name}</p>
                    <p className="text-sm font-bold text-gray-900">{student.score}</p>
                  </div>
                ))}

                {(leaderboard.top3 || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                )}

                <div className="text-center text-gray-400 text-xs">...</div>

                {/* Current user */}
                {leaderboard.me && (
                  <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-100">
                    <div className="w-6 flex justify-center text-green-700 font-black text-sm">{leaderboard.me.rank}</div>
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800 overflow-hidden">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (u.full_name?.charAt(0) || 'SV')}
                    </div>
                    <p className="text-sm font-bold text-green-800 flex-1 truncate">{u.full_name || 'Bạn'}</p>
                    <p className="text-sm font-bold text-green-800">{leaderboard.me.score}</p>
                  </div>
                )}
              </>
            ) : (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-green-600">eco</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Điểm rèn luyện</p>
            <p className="text-2xl font-black text-green-700">{score} <span className="text-sm font-medium text-gray-400">/ 100</span></p>
            <p className="text-[11px] text-green-600 font-medium mt-1">{p.grade || '—'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
            <span className="font-bold text-yellow-500 text-lg">U</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">UGC Tích lũy</p>
            <p className="text-2xl font-black text-green-700">{p.ugcBalance?.toLocaleString() || 0} <span className="text-sm font-medium text-gray-400">UGC</span></p>
            <p className="text-[11px] text-gray-400 mt-1">Số dư blockchain</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-500">groups</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Hoạt động đã tham gia</p>
            <p className="text-2xl font-black text-green-700">{p.totalActivities || 0}</p>
            <p className="text-[11px] text-gray-400 mt-1">Claims được duyệt</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-500">emoji_events</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Xếp hạng toàn trường</p>
            <p className="text-2xl font-black text-green-700">
              {p.rank ? `Top ${p.rank}` : '—'} <span className="text-sm font-medium text-gray-400">/ {p.totalStudents || 0} SV</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Middle: Radar + Progress + Badges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Radar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 w-full">
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Phân bổ điểm theo tiêu chí (ESG)</h3>
          </div>
          {radarData.length > 0 ? (
            <>
              <div className="w-full h-[250px] my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid gridType="polygon" />
                    <PolarAngleAxis dataKey="subject" tick={<CustomTick radarData={radarData} />} />
                    <Radar name="Sinh viên" dataKey="student" stroke="#0f9d58" fill="#0f9d58" fillOpacity={0.4} />
                    <Radar name="Trung bình" dataKey="avg" stroke="#9ca3af" fill="none" strokeDasharray="3 3" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 w-full">
                <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f9d58]" /> Điểm của bạn
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-transparent border border-gray-400" /> Trung bình SV
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
              Chưa có dữ liệu hoạt động
            </div>
          )}
        </div>

        {/* Progress bars */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-6">Tiến trình học kỳ</h3>

          <div className="mb-8">
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-4xl font-black text-green-700">{score}</p>
              <p className="text-gray-400 font-medium">/ 100</p>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">{p.grade || '—'}</span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-[#0f9d58] rounded-full transition-all duration-1000" style={{ width: `${score}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>0</span><span>50</span><span>100</span>
            </div>
            {score < 100 && (
              <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-green-500">eco</span>
                Bạn cần thêm <strong className="text-gray-900">{100 - score} điểm</strong> để đạt mức tối đa
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 flex-1 content-start">
            {[
              { label: 'Bắt buộc', pts: totalSections.mandatory, max: 20 },
              { label: 'Bổ trợ', pts: totalSections.support, max: 10 },
              { label: 'Tự chọn', pts: totalSections.optional, max: 10 },
              { label: 'Khuyến khích', pts: totalSections.encourage, max: 0 }
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors cursor-pointer">
                <p className="text-[10px] text-gray-500 font-medium mb-1 text-center">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{s.pts}<span className="text-[10px] text-gray-400 font-normal">/{s.max || '?'}</span></p>
                {s.max > 0 && (
                  <div className="w-full h-1 bg-gray-200 rounded-full">
                    <div className="h-full bg-[#0f9d58] rounded-full" style={{ width: `${Math.min((s.pts / s.max) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Huy hiệu đã đạt ({achievedBadges.length})</h3>
            </div>
            {achievedBadges.length > 0 ? (
              <div className="flex justify-around items-end px-2 flex-wrap gap-3">
                {achievedBadges.slice(0, 5).map((b, idx) => (
                  <div key={b.id} className={`flex flex-col items-center gap-1.5 group cursor-pointer ${idx === achievedBadges.length - 1 || idx === 2 ? 'scale-110 origin-bottom' : ''}`}>
                    <div className={`w-10 h-10 bg-[#0f9d58] rounded-lg rotate-45 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border-2 border-green-300 shadow-sm`}>
                      <span className="text-white -rotate-45 text-lg">{b.icon || '🏆'}</span>
                    </div>
                    <p className="text-[9px] font-bold text-gray-700 text-center leading-tight max-w-[52px]">{b.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Chưa đạt huy hiệu nào.<br/>Tham gia hoạt động để mở khóa!</p>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Huy hiệu đang mở khóa</h3>
            </div>
            {inProgressBadges.length > 0 ? (
              <div className="flex flex-col gap-5">
                {inProgressBadges.map(b => (
                  <div key={b.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100 text-lg">
                      {b.icon || '🎯'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-900">{b.label}</p>
                      <p className="text-[10px] text-gray-500 mb-2">{b.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0f9d58] rounded-full" style={{ width: '30%' }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 w-12 text-right">0/{b.target_value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Bạn đã hoàn thành tất cả huy hiệu! 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Timeline + Quick Stats ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Timeline */}
        <div className="flex-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Lịch sử hoạt động gần đây</h3>
          </div>

          {recentActivity.length > 0 ? (
            <div className="relative flex justify-between px-2 md:px-6 flex-1 items-center">
              <div className="absolute top-[20px] left-12 right-12 h-0.5 bg-gray-100 -z-10 hidden sm:block" />
              {recentActivity.map((act, idx) => (
                <div key={act.id} className="flex flex-col items-center w-28 relative group cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white mb-2 relative z-10 shadow-sm transition-colors
                    ${act.ugcPositive ? 'bg-green-50 group-hover:bg-green-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${act.ugcPositive ? 'text-[#0f9d58]' : 'text-blue-500'}`}>
                      {act.icon}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium mb-0.5">{fmtDate(act.date)}</p>
                  <p className="text-[11px] font-bold text-gray-900 text-center mb-1 leading-tight line-clamp-2">{act.title}</p>
                  <p className="text-[9px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-center mb-1">{act.type}</p>
                  <p className={`text-[10px] font-bold mb-1 ${act.ugcPositive ? 'text-[#0f9d58]' : 'text-red-500'}`}>{act.ugc}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium
                    ${act.ugcPositive ? 'bg-green-50 text-[#0f9d58]' : 'bg-blue-50 text-blue-600'}`}>
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Chưa có hoạt động nào được duyệt.
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="w-full lg:w-[320px] bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-4">Thống kê nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-orange-500 mb-2 text-[24px]">local_fire_department</span>
              <p className="text-2xl font-black text-gray-900 mb-1">{quickStats?.streak ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Ngày chuỗi xanh</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-blue-500 mb-2 text-[24px]">task_alt</span>
              <p className="text-2xl font-black text-gray-900 mb-1">{quickStats?.totalClaims ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Hoạt động đã duyệt</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-[#fbbc05] mb-2 text-[24px]">toll</span>
              <p className="text-2xl font-black text-gray-900 mb-1">{quickStats?.ugcBalance ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">UGC tích lũy</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
              <span className="material-symbols-outlined text-[#0d8246] mb-2 text-[24px]">military_tech</span>
              <p className="text-2xl font-black text-gray-900 mb-1">{quickStats?.badgeCount ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-medium leading-tight px-1">Huy hiệu đã đạt</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
