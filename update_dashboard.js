const fs = require('fs');
const file = '/Users/tho/Desktop/Work/CV cá nhân/Ulsa-green-credits-demo-main/web/frontend/src/pages/DashboardPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Insert css import at top
if (!content.includes("import '../assets/dashboard.css'")) {
  content = content.replace("import React", "import '../assets/dashboard.css'\nimport React");
}

// Replace the student view
const studentViewStartRegex = /if \(!isAdmin\) \{([\s\S]*?)\/\/\s*--- ADMIN VIEW ---/;
const replacement = `if (!isAdmin) {
    const bal = balance ?? 0
    const level = getStudentLevel(bal)
    const approvedClaims = studentClaims.filter(c => c.status === 'approved')
    const pendingClaims  = studentClaims.filter(c => c.status === 'submitted')
    const totalEarned    = approvedClaims.reduce((s, c) => s + (c.credit_amount || 0), 0)
    const nextGoal       = bal < 50 ? 50 : bal < 100 ? 100 : bal < 200 ? 200 : 300
    const progressPct    = Math.min((bal / nextGoal) * 100, 100)
    const upcomingEvents = studentEvents
      .filter(e => e.status === 'published' && new Date(e.end_at) > new Date())
      .slice(0, 4)

    return (
      <div className="dashboard-page">
        <main className="container">
          <div className="welcome-section">
            <div>
              <h1>Xin chào, {user.full_name || 'Sinh viên'} 👋</h1>
              <p className="text-muted text-sm" style={{ marginTop: '6px' }}>Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;•&nbsp; <span className="text-green">Hôm nay bạn đã tích lũy được tín chỉ xanh nào chưa? 🌱</span></p>
            </div>
            <div className="progress-box">
              <div className="icon-circle bg-green-light"><i className="ph-fill ph-leaf"></i></div>
              <div className="flex-col gap-2">
                <div className="flex justify-between" style={{ width: '350px' }}>
                  <span>Bạn đã đạt <strong>{bal} / {nextGoal} UGC</strong></span>
                  <strong>{Math.round(progressPct)}%</strong>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: \`\${progressPct}%\` }}></div>
                </div>
              </div>
              <div className="text-xs text-muted" style={{ marginLeft: '10px' }}>Còn {Math.max(0, nextGoal - bal)} UGC để nhận huy hiệu {nextGoal === 100 ? 'Xanh' : 'Bạc'} <i className="ph-fill ph-medal text-muted" style={{ fontSize: '16px' }}></i></div>
            </div>
          </div>

          <div className="kpi-row">
            <div className="card kpi-card">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Số dư tín chỉ</span>
                <div className="icon-circle bg-green-light" style={{ width: '28px', height: '28px', fontSize: '14px' }}><i className="ph-fill ph-leaf"></i></div>
              </div>
              <div className="kpi-value">{loading ? '...' : bal}</div>
              <div className="trend"><i className="ph-bold ph-trend-up"></i> Cấp độ {level.label}</div>
            </div>
            <div className="card kpi-card">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Tổng đã kiếm</span>
                <div className="icon-circle bg-orange-light" style={{ width: '28px', height: '28px', fontSize: '14px' }}><i className="ph-fill ph-medal"></i></div>
              </div>
              <div className="kpi-value">{loading ? '...' : totalEarned}</div>
              <div className="trend"><i className="ph-bold ph-trend-up"></i> Đã ghi nhận</div>
            </div>
            <div className="card kpi-card">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Lần tham gia</span>
                <div className="icon-circle bg-blue-light" style={{ width: '28px', height: '28px', fontSize: '14px' }}><i className="ph-fill ph-users"></i></div>
              </div>
              <div className="kpi-value">{loading ? '...' : approvedClaims.length}</div>
              <div className="trend"><i className="ph-bold ph-trend-up"></i> Hoạt động xanh</div>
            </div>
            <div className="card kpi-card">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Đang chờ duyệt</span>
                <div className="icon-circle bg-purple-light" style={{ width: '28px', height: '28px', fontSize: '14px' }}><i className="ph-fill ph-clock"></i></div>
              </div>
              <div className="kpi-value flex items-center gap-2" style={{ fontSize: '24px' }}><i className="ph-fill ph-hourglass-high" style={{ color: '#f97316' }}></i> {pendingClaims.length} <span style={{ fontSize: '16px', fontWeight: 500 }}>yêu cầu</span></div>
              <div className="text-xs text-muted">Từ hệ thống Verifier</div>
            </div>
          </div>

          <div className="main-grid">
            <div className="left-column">
              <div className="chart-activity-row">
                <div className="card">
                  <div className="list-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h2>Tăng trưởng tín chỉ <i className="ph ph-info text-muted"></i></h2>
                      <span className="text-xs text-muted">Thống kê 7 ngày gần nhất</span>
                    </div>
                  </div>
                  <div className="mt-4" style={{ height: '210px' }}>
                    {loading ? <div className="flex justify-center items-center h-full"><span className="material-symbols-outlined animate-spin text-gray-300 text-3xl">progress_activity</span></div> : <StudentUGCChart studentId={user.id} api={api} />}
                  </div>
                  <a href="/claims" className="link-text" style={{ display: 'inline-block', marginTop: '15px' }}>Xem chi tiết thống kê &rarr;</a>
                </div>

                <div className="card">
                  <div className="list-header">
                    <h2>Sắp diễn ra</h2>
                    <a href="/events" className="link-text">Xem tất cả</a>
                  </div>
                  <ul className="activity-list">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-muted text-sm mt-4 text-center">Không có sự kiện sắp tới</p>
                    ) : (
                      upcomingEvents.map((ev, i) => (
                        <li key={ev.id} onClick={() => nav('/events')} className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={\`activity-icon \${i === 0 ? 'bg-green-light' : 'bg-blue-light'}\`} style={{ background: i !== 0 ? 'transparent' : '' }}><i className={i === 0 ? "ph-fill ph-tree" : "ph-fill ph-calendar-check text-blue-500"} style={{ color: i !== 0 ? '#0ea5e9' : '' }}></i></div>
                                <div className="flex-col">
                                    <span className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{ev.title}</span>
                                    <span className="text-xs text-muted">{new Date(ev.start_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} • {new Date(ev.start_at).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>
                            <span className="text-green font-semibold">+{ev.credit_amount} UGC</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="card">
                  <div className="list-header" style={{ marginBottom: '5px' }}>
                      <h2>Thành tích nổi bật</h2>
                      <a href="/training-points" className="link-text">Xem tất cả</a>
                  </div>
                  <div className="badges-container">
                    {achievements.slice(0, 5).map((a, i) => (
                      <div className="badge-item" key={i} style={{ opacity: a.done ? 1 : 0.4 }}>
                          <div className={\`badge-icon \${a.done ? 'bg-green-light' : 'bg-gray-100 text-gray-400'}\`}>
                            {a.done ? <i className="ph-fill ph-medal"></i> : <i className="ph ph-lock"></i>}
                          </div>
                          <div className="flex-col">
                              <span className="font-semibold text-sm truncate" style={{ width: '100px', display: 'inline-block' }}>{a.label}</span>
                              <span className="text-xs text-muted truncate" style={{ width: '100px', display: 'inline-block' }}>{a.description}</span>
                          </div>
                      </div>
                    ))}
                    {achievements.length === 0 && <p className="text-sm text-muted">Chưa có dữ liệu thành tích.</p>}
                  </div>
              </div>

              <div className="card wallet-card flex items-center justify-between">
                  <div className="flex-col gap-3" style={{ flex: 1, minWidth: '0' }}>
                      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ph-fill ph-check-circle text-green"></i> Ví Blockchain</h2>
                      <div className="flex gap-4 flex-wrap">
                          <div className="flex-col gap-2" style={{ flex: 1, minWidth: '0' }}>
                              <span className="text-xs text-muted">Địa chỉ ví</span>
                              <div className="input-group">
                                  {user.wallet_address || 'Chưa liên kết ví'}
                                  <i className="ph ph-copy cursor-pointer" onClick={() => { navigator.clipboard.writeText(user.wallet_address||''); showToast('Đã sao chép!') }}></i>
                              </div>
                          </div>
                          <div className="flex-col gap-2" style={{ flex: 1, minWidth: '0' }}>
                              <span className="text-xs text-muted">Smart Contract</span>
                              <div className="input-group">
                                  {contract || 'Đang tải...'}
                                  <i className="ph ph-copy cursor-pointer" onClick={() => { navigator.clipboard.writeText(contract||''); showToast('Đã sao chép!') }}></i>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="network-pill" style={{ marginTop: '25px', marginLeft: '20px' }}>
                      <div className="network-dot"></div> Hardhat - Chain 31337
                  </div>
              </div>

            </div>

            <div className="flex-col gap-5">
                
                <div className="card">
                    <div className="list-header">
                        <h2>Nhiệm vụ tuần này</h2>
                        <a href="/training-points" className="link-text">Xem thêm</a>
                    </div>
                    <ul className="task-list">
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="checkbox-custom checked"><i className="ph-bold ph-check" style={{ fontSize: '10px' }}></i></div>
                                <span>Đạp xe ít nhất 3 lần</span>
                            </div>
                            <span className="text-green font-semibold">2/3</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="checkbox-custom checked"><i className="ph-bold ph-check" style={{ fontSize: '10px' }}></i></div>
                                <span>Mang bình nước cá nhân</span>
                            </div>
                            <span className="text-green font-semibold">1/1</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="checkbox-custom"></div>
                                <span className="text-muted">Trồng cây</span>
                            </div>
                            <span className="text-muted">0/1</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="checkbox-custom"></div>
                                <span className="text-muted">Thu gom rác</span>
                            </div>
                            <span className="text-muted">0/1</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="checkbox-custom"></div>
                                <span className="text-muted">Đi xe buýt / Đi chung xe</span>
                            </div>
                            <span className="text-muted">0/1</span>
                        </li>
                    </ul>
                    <div className="flex-col gap-2" style={{ marginTop: '20px' }}>
                        <div className="progress-bar-container" style={{ width: '100%', height: '5px', background: '#f1f5f9' }}>
                            <div className="progress-bar-fill" style={{ width: '40%' }}></div>
                        </div>
                        <span className="text-xs text-muted">2 / 5 hoàn thành</span>
                    </div>
                </div>

                <div className="card" style={{ paddingBottom: 0 }}>
                    <div className="list-header">
                        <h2>Bảng xếp hạng</h2>
                        <a href="/rewards" className="link-text">Xem thêm</a>
                    </div>
                    <ul className="leaderboard-list">
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="rank-circle rank-1">1</div>
                                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '10px', background: '#d1d5db', color: '#1f2937' }}>👤</div>
                                <span className="font-semibold">Nguyễn Minh Anh</span>
                            </div>
                            <span className="font-semibold">560 UGC</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="rank-circle rank-2">2</div>
                                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '10px', background: '#d1d5db', color: '#1f2937' }}>👤</div>
                                <span className="font-semibold">Trần Quốc Bảo</span>
                            </div>
                            <span className="font-semibold">540 UGC</span>
                        </li>
                        <li>
                            <div className="flex items-center gap-3">
                                <div className="rank-circle rank-3">3</div>
                                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '10px', background: '#d1d5db', color: '#1f2937' }}>👤</div>
                                <span className="font-semibold">Lê Gia Huy</span>
                            </div>
                            <span className="font-semibold">520 UGC</span>
                        </li>
                        <li className="highlight-row">
                            <div className="flex items-center gap-3">
                                <div className="rank-circle rank-15">15</div>
                                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>{user.full_name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'SV'}</div>
                                <span className="font-semibold">Bạn</span>
                            </div>
                            <span className="font-semibold text-green">{bal} UGC</span>
                        </li>
                    </ul>
                </div>

            </div>
          </div>
        </main>
      </div>
    )
  }
  
  // --- ADMIN VIEW ---`;

content = content.replace(studentViewStartRegex, replacement);

fs.writeFileSync(file, content);
