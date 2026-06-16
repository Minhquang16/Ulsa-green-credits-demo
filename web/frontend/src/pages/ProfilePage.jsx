import React, { useState, useRef } from 'react';
import '../assets/profile.css';
import { useAuth } from '../auth.jsx';

export default function ProfilePage() {
    const { user, setUser, api } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const fileInputRef = useRef(null);

    // Lấy dữ liệu thật từ user object
    const studentInfo = {
        name: user?.full_name || user?.username || "Sinh viên",
        code: user?.student_id || "Chưa cập nhật",
        classStr: user?.class_name || "Chưa phân lớp",
        majorStr: user?.cohort ? `Khóa ${user.cohort}` : "",
        email: user?.email || (user?.username?.includes('@') ? user.username : (user?.username ? `${user.username}@ulsa.edu.vn` : "")),
        joinedDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : "---",
        rankName: "Xanh Mầm", // TODO: Lấy từ API xếp hạng
        rankProgress: 320,
        rankMax: 1000,
        walletAddress: user?.wallet_address || "Chưa kết nối ví",
        balance: 125, // TODO: Lấy từ API ví
        totalEarned: 1250,
        totalEvents: 28,
        longestStreak: 12,
        schoolRank: 15,
        schoolTotal: 2000,
    };

    const getInitials = (name) => {
        if (!name) return 'SV';
        const words = name.trim().split(/\s+/);
        if (words.length > 1) {
            return (words[0][0] + words[words.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await api('/me/avatar', {
                method: 'POST',
                body: formData
            });
            if (res && res.success) {
                setUser(res.user);
            }
        } catch (error) {
            console.error("Lỗi upload ảnh:", error);
            alert("Lỗi khi tải ảnh lên!");
        }
    };

    const badges = [
        { id: 1, name: "Xanh Mầm", date: "10/06/2026", color: "#29A646", icon: "eco" },
        { id: 2, name: "Người hùng tái chế", date: "05/06/2026", color: "#29A646", icon: "recycling" },
        { id: 3, name: "Tiết kiệm nước", date: "28/05/2026", color: "#3b82f6", icon: "water_drop" },
        { id: 4, name: "Bảo vệ động vật", date: "20/05/2026", color: "#d97706", icon: "pets" },
        { id: 5, name: "Tham gia nhiệt tình", date: "15/05/2026", color: "#9333ea", icon: "local_fire_department" },
    ];

    const inProgressBadges = [
        { id: 1, name: "Người hùng tái chế", current: 30, max: 50, icon: "recycling" },
        { id: 2, name: "Green Explorer", current: 7, max: 10, icon: "forest" },
        { id: 3, name: "Tiết kiệm năng lượng", current: 5, max: 15, icon: "bolt" },
        { id: 4, name: "Đại sứ môi trường", current: 1, max: 5, icon: "campaign" },
    ];

    const history = [
        { id: 1, time: "12/06/2026 11:21", title: "Đạp xe xanh", typeDesc: "Sự kiện", category: "Nhận UGC", amount: "+10", status: "Đã duyệt", icon: "directions_bike", iconClass: "bg-green-light", amountClass: "positive", statusClass: "approved" },
        { id: 2, time: "11/06/2026 08:45", title: "Thu gom chai nhựa", typeDesc: "Hoạt động", category: "Nhận UGC", amount: "+15", status: "Đã duyệt", icon: "delete_outline", iconClass: "bg-blue-light", amountClass: "positive", statusClass: "approved" },
        { id: 3, time: "10/06/2026 16:20", title: "Trồng cây gây rừng", typeDesc: "Sự kiện", category: "Nhận UGC", amount: "+20", status: "Đã duyệt", icon: "park", iconClass: "bg-green-light", amountClass: "positive", statusClass: "approved" },
        { id: 4, time: "09/06/2026 14:10", title: "Đổi áo thun ULSA Green", typeDesc: "Đổi quà", category: "Đổi quà", amount: "-80", status: "Thành công", icon: "checkroom", iconClass: "bg-blue-light", amountClass: "negative", statusClass: "success" },
        { id: 5, time: "08/06/2026 09:05", title: "Đổi voucher xe buýt", typeDesc: "Đổi quà", category: "Đổi quà", amount: "-30", status: "Thành công", icon: "confirmation_number", iconClass: "bg-red-light", amountClass: "negative", statusClass: "success" },
    ];

    return (
        <div className="profile-page animate-in fade-in">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">HỒ SƠ CÁ NHÂN</h2>

            {/* 1. HEADER */}
            <div className="profile-header-card">
                <div className="profile-info-section">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8080${user.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(studentInfo.name)
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                        />
                        <button className="profile-avatar-camera" onClick={handleAvatarClick} title="Thay đổi ảnh đại diện">
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                        </button>
                    </div>
                    <div className="profile-details">
                        <div className="profile-name-row">
                            <h1 className="profile-name">{studentInfo.name}</h1>
                            <div className="profile-badge-verified">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
                                Đã xác thực
                            </div>
                        </div>
                        <p className="profile-detail-text" style={{ color: '#333', fontWeight: 500 }}>
                            MSV: {studentInfo.code}
                        </p>
                        <p className="profile-detail-text">
                            {studentInfo.classStr} {studentInfo.majorStr && `• ${studentInfo.majorStr}`}
                        </p>
                        {studentInfo.email && (
                            <p className="profile-detail-text">
                                <span className="material-symbols-outlined">mail</span>
                                {studentInfo.email}
                            </p>
                        )}
                        <p className="profile-detail-text mt-2" style={{ color: '#888' }}>
                            Thành viên từ: {studentInfo.joinedDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. THẺ SINH VIÊN & VÍ */}
            <div className="profile-grid-2">
                <div className="profile-card">
                    <h3 className="profile-card-title">THẺ SINH VIÊN XANH</h3>
                    <div className="green-id-card">
                        <div className="green-id-content">
                            <div className="green-id-icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#fff' }}>eco</span>
                            </div>
                            <div className="green-id-info">
                                <p>Hạng thành viên</p>
                                <h3>{studentInfo.rankName} <span className="material-symbols-outlined" style={{ fontSize: 20 }}>eco</span></h3>
                            </div>
                        </div>
                        <div className="green-id-progress-container">
                            <div className="green-id-progress-bar">
                                <div className="green-id-progress-fill" style={{ width: `${(studentInfo.rankProgress / studentInfo.rankMax) * 100}%` }}></div>
                            </div>
                            <div className="green-id-progress-text">
                                <span>{studentInfo.rankProgress} / {studentInfo.rankMax.toLocaleString()} UGC</span>
                                <span style={{ opacity: 0.8 }}>Còn {studentInfo.rankMax - studentInfo.rankProgress} UGC để lên hạng Xanh Lá</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-card">
                    <h3 className="profile-card-title">VÍ BLOCKCHAIN</h3>
                    <div className="wallet-container">
                        <div className="wallet-left">
                            <p className="text-xs text-gray-500 mb-2 font-medium">Địa chỉ ví của bạn</p>
                            <div className="wallet-address-box">
                                <span className="wallet-address">{studentInfo.walletAddress}</span>
                                <button className="wallet-copy-btn">
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                            </div>
                            <div className="wallet-qr flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 mt-0 font-medium">Quét để nhận UGC hoặc điểm danh</p>
                                    <div style={{ background: '#f8f8f8', padding: '8px', borderRadius: '8px', display: 'inline-block', border: '1px solid #ddd' }}>
                                        {/* Sử dụng icon qr_code thay cho ảnh thật trong lúc mockup */}
                                        <span className="material-symbols-outlined" style={{ fontSize: 80, color: '#333' }}>qr_code_2</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="wallet-right">
                            <p className="wallet-balance-title">SỐ DƯ UGC HIỆN TẠI</p>
                            <div className="wallet-balance-amount">
                                <span className="material-symbols-outlined" style={{ color: '#29A646', fontSize: 32 }}>eco</span>
                                {studentInfo.balance}
                                <span className="ugc-label">UGC</span>
                            </div>
                            <button className="wallet-history-btn">
                                Lịch sử giao dịch <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. THỐNG KÊ */}
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 mt-6">THỐNG KÊ TỔNG QUAN</h2>
            <div className="profile-stats-grid">
                <div className="stat-box bg-green">
                    <div className="stat-header">
                        <div className="stat-icon"><span className="material-symbols-outlined">eco</span></div>
                        <h3 className="stat-title">Tổng UGC<br/>đã tích lũy</h3>
                    </div>
                    <div>
                        <div className="stat-value">{studentInfo.totalEarned.toLocaleString()}<span>UGC</span></div>
                        <div className="stat-trend up"><span className="material-symbols-outlined" style={{fontSize: 14}}>trending_up</span> 120 UGC so với tháng trước</div>
                    </div>
                </div>

                <div className="stat-box bg-blue">
                    <div className="stat-header">
                        <div className="stat-icon"><span className="material-symbols-outlined">groups</span></div>
                        <h3 className="stat-title">Tổng sự kiện<br/>đã tham gia</h3>
                    </div>
                    <div>
                        <div className="stat-value">{studentInfo.totalEvents}<span>sự kiện</span></div>
                        <div className="stat-trend up"><span className="material-symbols-outlined" style={{fontSize: 14}}>trending_up</span> 3 sự kiện so với tháng trước</div>
                    </div>
                </div>

                <div className="stat-box bg-orange">
                    <div className="stat-header">
                        <div className="stat-icon"><span className="material-symbols-outlined">local_fire_department</span></div>
                        <h3 className="stat-title">Chuỗi ngày<br/>xanh dài nhất</h3>
                    </div>
                    <div>
                        <div className="stat-value">{studentInfo.longestStreak}<span>ngày</span></div>
                        <div className="stat-trend neutral">Kỷ lục cá nhân</div>
                    </div>
                </div>

                <div className="stat-box bg-purple">
                    <div className="stat-header">
                        <div className="stat-icon"><span className="material-symbols-outlined">emoji_events</span></div>
                        <h3 className="stat-title">Xếp hạng<br/>toàn trường</h3>
                    </div>
                    <div>
                        <div className="stat-value">{studentInfo.schoolRank}<span>/ {studentInfo.schoolTotal}</span></div>
                        <div className="stat-trend neutral">Top 1% sinh viên tích cực</div>
                    </div>
                </div>
            </div>

            {/* 4. HUY HIỆU */}
            <div className="profile-card mb-6">
                <div className="badges-section-header">
                    <h3 className="badges-section-title">HUY HIỆU & THÀNH TỰU</h3>
                </div>

                <div className="badges-section-header">
                    <h4 className="text-[13px] font-bold text-gray-800 m-0">Huy hiệu đã đạt được</h4>
                    <a href="#" className="view-all-link">Xem tất cả <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                </div>
                <div className="badges-grid-5">
                    {badges.map(b => (
                        <div key={b.id} className="badge-item-profile">
                            <div className="badge-icon-hex" style={{ color: b.color, borderColor: `${b.color}40`, backgroundColor: `${b.color}15` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{b.icon}</span>
                            </div>
                            <h4>{b.name}</h4>
                            <p>{b.date}</p>
                        </div>
                    ))}
                </div>

                <div className="badges-section-header mt-8">
                    <h4 className="text-[13px] font-bold text-gray-800 m-0">Huy hiệu đang tiến hành</h4>
                    <a href="#" className="view-all-link">Xem tất cả <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                </div>
                <div className="badges-progress-grid">
                    {inProgressBadges.map(b => {
                        const percent = Math.round((b.current / b.max) * 100);
                        return (
                            <div key={b.id} className="badge-progress-card">
                                <div className="badge-progress-header">
                                    <div className="badge-progress-icon">
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{b.icon}</span>
                                    </div>
                                    <h4>{b.name}</h4>
                                </div>
                                <div className="badge-progress-bar-bg">
                                    <div className="badge-progress-bar-fill" style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="badge-progress-stats">
                                    <span>{b.current} / {b.max}</span>
                                    <span>{percent}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 5. LỊCH SỬ */}
            <div className="profile-card">
                <h3 className="badges-section-title mb-2">LỊCH SỬ HOẠT ĐỘNG & GIAO DỊCH</h3>
                
                <div className="history-tabs">
                    <button className={`history-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả</button>
                    <button className={`history-tab ${activeTab === 'receive' ? 'active' : ''}`} onClick={() => setActiveTab('receive')}>Nhận UGC</button>
                    <button className={`history-tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => setActiveTab('redeem')}>Đổi quà</button>
                    <button className={`history-tab ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => setActiveTab('transfer')}>Chuyển UGC</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Hoạt động</th>
                                <th>Loại</th>
                                <th>Số UGC</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(row => (
                                <tr key={row.id}>
                                    <td className="history-time">{row.time}</td>
                                    <td>
                                        <div className="history-activity">
                                            <div className={`history-activity-icon ${row.iconClass}`}>
                                                <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                                            </div>
                                            <div className="history-activity-info">
                                                <h4>{row.title}</h4>
                                                <p>{row.typeDesc}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="history-type">{row.category}</td>
                                    <td className={`history-amount ${row.amountClass}`}>{row.amount}</td>
                                    <td>
                                        <span className={`history-status ${row.statusClass}`}>{row.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="history-footer">
                    <a href="#" className="view-all-link">Xem thêm lịch sử <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                </div>
            </div>

        </div>
    );
}
