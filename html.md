<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UGC Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <style>
        :root {
            --primary: #10b981; /* Green */
            --primary-light: #d1fae5;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1f2937;
            --text-muted: #6b7280;
            --border-color: #f1f5f9;
            --shadow: 0 2px 10px rgba(0,0,0,0.03);
            --radius: 12px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-main); }
        ul { list-style: none; }
        a { text-decoration: none; color: inherit; }

        /* Typography */
        h1 { font-size: 20px; font-weight: 700; }
        h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
        .text-sm { font-size: 13px; }
        .text-xs { font-size: 11px; }
        .text-muted { color: var(--text-muted); }
        .text-green { color: var(--primary); }
        .font-semibold { font-weight: 600; }
        
        /* Layout */
        .container { max-width: 1300px; margin: 0 auto; padding: 0 20px 40px 20px; }
        .card { background: var(--card-bg); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); border: 1px solid var(--border-color); }
        .flex { display: flex; }
        .flex-col { display: flex; flex-direction: column; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }
        .gap-5 { gap: 20px; }

        /* Header */
        header { background: var(--card-bg); border-bottom: 1px solid var(--border-color); padding: 0 30px; display: flex; align-items: center; justify-content: space-between; height: 70px; margin-bottom: 24px;}
        .logo { font-size: 24px; font-weight: 800; display: flex; align-items: center;}
        .logo span { color: var(--primary); margin-right: 2px;}
        .nav-links { display: flex; gap: 30px; height: 100%;}
        .nav-links li { display: flex; align-items: center; cursor: pointer; color: var(--text-muted); font-weight: 500; font-size: 14px; border-bottom: 3px solid transparent;}
        .nav-links li.active { color: var(--text-main); border-bottom: 3px solid var(--primary); }
        .header-actions { display: flex; align-items: center; gap: 20px; }
        .icon-btn { font-size: 20px; color: var(--text-muted); cursor: pointer; }
        .user-profile { display: flex; align-items: center; gap: 10px; cursor: pointer;}
        .avatar { width: 36px; height: 36px; background: #1f2937; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;}

        /* Welcome Section */
        .welcome-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 20px; }
        .progress-card {
            background: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03);
            width: 100%;
            max-width: 750px;
            flex: 1;
        }
        .icon-box {
            width: 42px;
            height: 42px;
            background-color: #ecfdf5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .icon-box svg {
            width: 20px;
            height: 20px;
            fill: #10b981;
        }
        .content-area {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .top-text {
            font-size: 14px;
            color: #374151;
            text-align: left;
        }
        .top-text strong {
            font-weight: 700;
            color: #111827;
        }
        .bottom-row {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .progress-track {
            flex-grow: 1;
            height: 8px;
            background-color: #ecfdf5;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
            border-radius: 10px;
            transition: width 0.6s ease;
        }
        .percentage {
            font-weight: 700;
            font-size: 16px;
            color: #1f2937;
        }
        .hint-text {
            font-size: 12px;
            color: #6b7280;
            font-weight: 400;
            white-space: nowrap;
        }
        .medal-icon {
            width: 24px;
            height: 24px;
            flex-shrink: 0;
        }
        .icon-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .bg-green-light { background: var(--primary-light); color: var(--primary); }

        /* Dashboard Grid System */
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
        .kpi-card .kpi-value { font-size: 28px; font-weight: 700; margin: 10px 0; }
        .kpi-card .trend { display: flex; align-items: center; font-size: 12px; color: var(--primary); font-weight: 500; gap: 4px;}

        .main-grid { display: grid; grid-template-columns: 8.5fr 3.5fr; gap: 20px; }
        .left-column { display: flex; flex-direction: column; gap: 20px; }
        .chart-activity-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }

        /* Chart Area */
        .chart-container { position: relative; height: 200px; margin-top: 20px;}
        .chart-y-axis { position: absolute; left: 0; top: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
        .chart-x-axis { display: flex; justify-content: space-between; margin-left: 30px; margin-top: 10px; font-size: 11px; color: var(--text-muted); }
        .chart-svg-wrapper { margin-left: 30px; height: 180px; width: calc(100% - 30px); position: relative;}
        .chart-tooltip { position: absolute; right: 0; top: 30px; background: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid var(--border-color);}

        /* Lists */
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .link-text { color: var(--primary); font-size: 13px; font-weight: 500; text-decoration: none; }
        
        .activity-list li, .task-list li, .leaderboard-list li { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
        .activity-list li:last-child, .task-list li:last-child, .leaderboard-list li:last-child { margin-bottom: 0; }
        .activity-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        
        /* Badges */
        .badges-container { display: flex; justify-content: space-between; align-items: center; margin-top: 10px;}
        .badge-item { display: flex; align-items: center; gap: 12px; }
        .badge-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }

        /* Wallet Section */
        .wallet-card { padding: 15px 20px; }
        .input-group { background: #f8fafc; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); font-family: monospace;}
        .network-pill { background: #ecfdf5; color: var(--primary); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
        .network-dot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; }

        /* Leaderboard & Tasks Specifics */
        .rank-circle { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: white;}
        .rank-1 { background: #eab308; }
        .rank-2 { background: #94a3b8; }
        .rank-3 { background: #f97316; }
        .rank-15 { background: #1f2937; }
        .highlight-row { background: #ecfdf5; margin: 0 -20px; padding: 12px 20px; border-radius: 0 0 var(--radius) var(--radius); }

        .checkbox-custom { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; color: transparent; }
        .checkbox-custom.checked { background: var(--primary); border-color: var(--primary); color: white; }

        /* Colors for specific icons */
        .bg-orange-light { background: #ffedd5; color: #f97316; }
        .bg-blue-light { background: #e0f2fe; color: #0ea5e9; }
        .bg-purple-light { background: #f3e8ff; color: #a855f7; }
    </style>
</head>
<body>

    <header>
        <div class="logo"><span style="transform: rotate(-15deg); display: inline-block;">🍃</span>UGC</div>
        <ul class="nav-links">
            <li class="active">Tổng quan</li>
            <li>Hoạt động</li>
            <li>Ghi nhận</li>
            <li>Điểm rèn luyện</li>
            <li>Ưu đãi</li>
        </ul>
        <div class="header-actions">
            <i class="ph ph-gear icon-btn"></i>
            <i class="ph ph-bell icon-btn"></i>
            <div class="user-profile">
                <div class="avatar">TR</div>
                <div class="flex-col">
                    <span class="font-semibold text-sm">Hoàng Trường</span>
                    <span class="text-xs text-muted">student@ulsa.edu.vn</span>
                </div>
                <i class="ph ph-caret-down text-muted"></i>
            </div>
        </div>
    </header>

    <main class="container">
        <div class="welcome-section">
            <div>
                <h1>Xin chào, Hoàng Trường 👋</h1>
                <p class="text-muted text-sm" style="margin-top: 6px;">Hôm nay là Thứ Sáu, 12 tháng 6, 2026 &nbsp;•&nbsp; <span class="text-green">Hôm nay bạn đã tích lũy được tín chỉ xanh nào chưa? 🌱</span></p>
            </div>
            <div class="progress-card">
                <div class="icon-box">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                        <path d="M244.92,79.52c-10.74-40.41-33.84-7.53-239.5-62A8,8,0,0,0,.64,28.66C-1.89,64.24,11.39,83.56,24.08,91.14a51.68,51.68,0,0,0,24,.6c-1,4.72-1.74,9.66-2.14,14.77C40,158,63,184.28,92.51,190a61.1,61.1,0,0,0,44.75-10.42A76.62,76.62,0,0,0,165.71,213.6c-4.47,4.47-15.62,10.64-28,8.23a8,8,0,1,0-3.06,15.7A42,42,0,0,0,143,238c11.83,0,22.75-4.45,32.61-13.27,15.77-14.1,22.42-32.9,23.36-42l34.42-34.43a8,8,0,0,0,0-11.32ZM25.26,77.34C16.89,72.33,10.23,59.39,15.67,31.78,41.48,46.7,68.41,52,90.43,51a71.85,71.85,0,0,0-46.71,25.28C36,81.44,29.94,80.14,25.26,77.34ZM183,184c-3.19.12-6.32.22-9.35.22a94,94,0,0,1-30-4.83,8,8,0,0,0-5.46.22,45.45,45.45,0,0,1-34.54,4.28c-20.89-4.85-35.4-23.77-40.85-53.3A80.89,80.89,0,0,1,75,81.65a56.46,56.46,0,0,1,18-12.72c35.61-15,64.27.76,81,18.06A80.37,80.37,0,0,1,183,184Z"></path>
                    </svg>
                </div>

                <div class="content-area">
                    <div class="top-text">
                        Bạn đã đạt <strong>320 / 500 UGC</strong>
                    </div>
                    
                    <div class="bottom-row">
                        <div class="progress-track">
                            <div class="progress-fill" style="width: 64%;"></div>
                        </div>
                        <div class="percentage">64%</div>
                        <div class="hint-text">Còn 180 UGC để nhận huy hiệu Bạc</div>
                        
                        <svg class="medal-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C16 2 19 5 19 9C19 11.3 17.8 13.4 16 14.7V22L12 19L8 22V14.7C6.2 13.4 5 11.3 5 9C5 5 8 2 12 2ZM12 4C9.2 4 7 6.2 7 9C7 11.8 9.2 14 12 14C14.8 14 17 11.8 17 9C17 6.2 14.8 4 12 4ZM10 11L12 8L14 11H10Z" fill="#94a3b8"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <div class="kpi-row">
            <div class="card kpi-card">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold">Số dư tín chỉ</span>
                    <div class="icon-circle bg-green-light" style="width: 28px; height: 28px; font-size: 14px;"><i class="ph-fill ph-leaf"></i></div>
                </div>
                <div class="kpi-value">320</div>
                <div class="trend"><i class="ph-bold ph-trend-up"></i> +20 UGC so với tuần trước</div>
            </div>
            <div class="card kpi-card">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold">Tổng đã kiếm</span>
                    <div class="icon-circle bg-orange-light" style="width: 28px; height: 28px; font-size: 14px;"><i class="ph-fill ph-medal"></i></div>
                </div>
                <div class="kpi-value">520</div>
                <div class="trend"><i class="ph-bold ph-trend-up"></i> +50 UGC tháng này</div>
            </div>
            <div class="card kpi-card">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold">Lần tham gia</span>
                    <div class="icon-circle bg-blue-light" style="width: 28px; height: 28px; font-size: 14px;"><i class="ph-fill ph-users"></i></div>
                </div>
                <div class="kpi-value">18</div>
                <div class="trend"><i class="ph-bold ph-trend-up"></i> +3 hoạt động tháng này</div>
            </div>
            <div class="card kpi-card">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold">Chuỗi xanh hiện tại</span>
                    <div class="icon-circle bg-purple-light" style="width: 28px; height: 28px; font-size: 14px;"><i class="ph-fill ph-calendar-check"></i></div>
                </div>
                <div class="kpi-value flex items-center gap-2" style="font-size: 24px;"><i class="ph-fill ph-fire" style="color: #f97316;"></i> 12 <span style="font-size: 16px; font-weight: 500;">ngày</span></div>
                <div class="text-xs text-muted">Kỷ lục của bạn: 28 ngày</div>
            </div>
        </div>

        <div class="main-grid">
            <div class="left-column">
                
                <div class="chart-activity-row">
                    <div class="card">
                        <div class="list-header" style="margin-bottom: 0;">
                            <div>
                                <h2>Tăng trưởng tín chỉ <i class="ph ph-info text-muted"></i></h2>
                                <span class="text-xs text-muted">Thống kê 7 ngày gần nhất</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <div class="chart-tooltip">320 UGC</div>
                            <div class="chart-y-axis">
                                <span>400</span><span>300</span><span>200</span><span>100</span><span>0</span>
                            </div>
                            <div class="chart-svg-wrapper">
                                <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style="stop-color:rgba(16, 185, 129, 0.2);stop-opacity:1" />
                                            <stop offset="100%" style="stop-color:rgba(16, 185, 129, 0);stop-opacity:1" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M0,130 L80,110 L160,80 L240,70 L320,50 L400,30 L500,10 L500,150 L0,150 Z" fill="url(#grad1)" />
                                    <polyline points="0,130 80,110 160,80 240,70 320,50 400,30 500,10" fill="none" stroke="#10b981" stroke-width="2.5" />
                                    <circle cx="0" cy="130" r="4" fill="#10b981"/>
                                    <circle cx="80" cy="110" r="4" fill="#10b981"/>
                                    <circle cx="160" cy="80" r="4" fill="#10b981"/>
                                    <circle cx="240" cy="70" r="4" fill="#10b981"/>
                                    <circle cx="320" cy="50" r="4" fill="#10b981"/>
                                    <circle cx="400" cy="30" r="4" fill="#10b981"/>
                                    <circle cx="500" cy="10" r="4" fill="#10b981" stroke="white" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="chart-x-axis">
                                <span>T7</span><span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span>
                            </div>
                        </div>
                        <a href="#" class="link-text" style="display: inline-block; margin-top: 15px;">Xem chi tiết thống kê &rarr;</a>
                    </div>

                    <div class="card">
                        <div class="list-header">
                            <h2>Hoạt động gần đây</h2>
                            <a href="#" class="link-text">Xem tất cả</a>
                        </div>
                        <ul class="activity-list">
                            <li>
                                <div class="flex items-center gap-3">
                                    <div class="activity-icon bg-green-light" style="background: transparent;"><i class="ph ph-bicycle text-muted" style="font-size: 20px;"></i></div>
                                    <div class="flex-col">
                                        <span class="font-semibold">Đạp xe xanh</span>
                                        <span class="text-xs text-muted">11:21 • 12/06/2026</span>
                                    </div>
                                </div>
                                <span class="text-green font-semibold">+10 UGC</span>
                            </li>
                            <li>
                                <div class="flex items-center gap-3">
                                    <div class="activity-icon bg-green-light"><i class="ph-fill ph-recycle"></i></div>
                                    <div class="flex-col">
                                        <span class="font-semibold">Thu gom chai nhựa</span>
                                        <span class="text-xs text-muted">08:45 • 11/06/2026</span>
                                    </div>
                                </div>
                                <span class="text-green font-semibold">+15 UGC</span>
                            </li>
                            <li>
                                <div class="flex items-center gap-3">
                                    <div class="activity-icon bg-green-light"><i class="ph-fill ph-tree"></i></div>
                                    <div class="flex-col">
                                        <span class="font-semibold">Trồng cây gây rừng</span>
                                        <span class="text-xs text-muted">16:20 • 09/06/2026</span>
                                    </div>
                                </div>
                                <span class="text-green font-semibold">+20 UGC</span>
                            </li>
                            <li>
                                <div class="flex items-center gap-3">
                                    <div class="activity-icon bg-blue-light" style="background: transparent;"><i class="ph-fill ph-drop text-blue-500" style="color: #0ea5e9;"></i></div>
                                    <div class="flex-col">
                                        <span class="font-semibold">Mang bình nước cá nhân</span>
                                        <span class="text-xs text-muted">07:30 • 08/06/2026</span>
                                    </div>
                                </div>
                                <span class="text-green font-semibold">+5 UGC</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="list-header" style="margin-bottom: 5px;">
                        <h2>Thành tích nổi bật</h2>
                        <a href="#" class="link-text">Xem tất cả</a>
                    </div>
                    <div class="badges-container">
                        <div class="badge-item">
                            <div class="badge-icon bg-green-light"><i class="ph-fill ph-leaf"></i></div>
                            <div class="flex-col">
                                <span class="font-semibold text-sm">Green Beginner</span>
                                <span class="text-xs text-muted">Đạt 50 UGC</span>
                            </div>
                        </div>
                        <div class="badge-item">
                            <div class="badge-icon bg-purple-light"><i class="ph-fill ph-bicycle"></i></div>
                            <div class="flex-col">
                                <span class="font-semibold text-sm">Bike Lover</span>
                                <span class="text-xs text-muted">Đạp xe 5 lần</span>
                            </div>
                        </div>
                        <div class="badge-item">
                            <div class="badge-icon bg-green-light"><i class="ph-fill ph-recycle"></i></div>
                            <div class="flex-col">
                                <span class="font-semibold text-sm">Recycler</span>
                                <span class="text-xs text-muted">Thu gom 10 lần</span>
                            </div>
                        </div>
                        <div class="badge-item">
                            <div class="badge-icon bg-green-light"><i class="ph-fill ph-tree"></i></div>
                            <div class="flex-col">
                                <span class="font-semibold text-sm">Tree Planter</span>
                                <span class="text-xs text-muted">Trồng 5 cây</span>
                            </div>
                        </div>
                        <div class="badge-item">
                            <div class="badge-icon bg-blue-light"><i class="ph-fill ph-lightning"></i></div>
                            <div class="flex-col">
                                <span class="font-semibold text-sm">Active User</span>
                                <span class="text-xs text-muted">Tham gia 10 hoạt động</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card wallet-card flex items-center justify-between">
                    <div class="flex-col gap-3" style="flex: 1;">
                        <h2 style="margin:0; display:flex; align-items:center; gap:6px;"><i class="ph-fill ph-check-circle text-green"></i> Ví Blockchain</h2>
                        <div class="flex gap-4">
                            <div class="flex-col gap-2" style="flex: 1;">
                                <span class="text-xs text-muted">Địa chỉ ví</span>
                                <div class="input-group">
                                    0x90F79bF6EB2C4f870365E785982E1f101E93b906
                                    <i class="ph ph-copy cursor-pointer"></i>
                                </div>
                            </div>
                            <div class="flex-col gap-2" style="flex: 1;">
                                <span class="text-xs text-muted">Smart Contract</span>
                                <div class="input-group">
                                    0x5FbDB2315678afecb367f032d93F642f64180aa3
                                    <i class="ph ph-copy cursor-pointer"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="network-pill" style="margin-top: 25px; margin-left: 20px;">
                        <div class="network-dot"></div> Hardhat - Chain 31337
                    </div>
                </div>

            </div>

            <div class="flex-col gap-5">
                
                <div class="card">
                    <div class="list-header">
                        <h2>Nhiệm vụ tuần này</h2>
                        <a href="#" class="link-text">Xem thêm</a>
                    </div>
                    <ul class="task-list">
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="checkbox-custom checked"><i class="ph-bold ph-check" style="font-size: 10px;"></i></div>
                                <span>Đạp xe ít nhất 3 lần</span>
                            </div>
                            <span class="text-green font-semibold">2/3</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="checkbox-custom checked"><i class="ph-bold ph-check" style="font-size: 10px;"></i></div>
                                <span>Mang bình nước cá nhân</span>
                            </div>
                            <span class="text-green font-semibold">1/1</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="checkbox-custom"></div>
                                <span class="text-muted">Trồng cây</span>
                            </div>
                            <span class="text-muted">0/1</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="checkbox-custom"></div>
                                <span class="text-muted">Thu gom rác</span>
                            </div>
                            <span class="text-muted">0/1</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="checkbox-custom"></div>
                                <span class="text-muted">Đi xe buýt / Đi chung xe</span>
                            </div>
                            <span class="text-muted">0/1</span>
                        </li>
                    </ul>
                    <div class="flex-col gap-2" style="margin-top: 20px;">
                        <div class="progress-bar-container" style="width: 100%; height: 5px; background: #f1f5f9;">
                            <div class="progress-bar-fill" style="width: 40%;"></div>
                        </div>
                        <span class="text-xs text-muted">2 / 5 hoàn thành</span>
                    </div>
                </div>

                <div class="card" style="padding-bottom: 0;">
                    <div class="list-header">
                        <h2>Bảng xếp hạng</h2>
                        <a href="#" class="link-text">Xem thêm</a>
                    </div>
                    <ul class="leaderboard-list">
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="rank-circle rank-1">1</div>
                                <div class="avatar" style="width: 28px; height: 28px; font-size: 10px; background: #d1d5db; color: #1f2937;">👤</div>
                                <span class="font-semibold">Nguyễn Minh Anh</span>
                            </div>
                            <span class="font-semibold">560 UGC</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="rank-circle rank-2">2</div>
                                <div class="avatar" style="width: 28px; height: 28px; font-size: 10px; background: #d1d5db; color: #1f2937;">👤</div>
                                <span class="font-semibold">Trần Quốc Bảo</span>
                            </div>
                            <span class="font-semibold">540 UGC</span>
                        </li>
                        <li>
                            <div class="flex items-center gap-3">
                                <div class="rank-circle rank-3">3</div>
                                <div class="avatar" style="width: 28px; height: 28px; font-size: 10px; background: #d1d5db; color: #1f2937;">👤</div>
                                <span class="font-semibold">Lê Gia Huy</span>
                            </div>
                            <span class="font-semibold">520 UGC</span>
                        </li>
                        <li class="highlight-row">
                            <div class="flex items-center gap-3">
                                <div class="rank-circle rank-15">15</div>
                                <div class="avatar" style="width: 28px; height: 28px; font-size: 11px;">TR</div>
                                <span class="font-semibold">Hoàng Trường (Bạn)</span>
                            </div>
                            <span class="font-semibold text-green">320 UGC</span>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    </main>

</body>
</html>