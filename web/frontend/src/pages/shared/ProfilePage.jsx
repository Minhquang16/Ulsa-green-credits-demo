import React, { useState, useEffect, useRef } from 'react';
import '../../styles/student/student-profile.css';
import '../../styles/admin/admin-profile.css';
import { useAuth } from '../../auth.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import HistoryDataTable from '../../components/HistoryDataTable.jsx';

function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>;
}

export default function ProfilePage() {
    const { user, setUser, api } = useAuth();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('all');
    
    // States for API data
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [badgesData, setBadgesData] = useState({ achieved: [], inProgress: [] });
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const [profRes, statsRes, walletRes, badgesRes, histRes] = await Promise.all([
                    api('/profile'),
                    api('/profile/stats'),
                    api('/profile/wallet'),
                    api('/profile/badges'),
                    api('/profile/history')
                ]);
                
                if (profRes?.success) setProfile(profRes.data);
                if (statsRes?.success) setStats(statsRes.data);
                if (walletRes?.success) setWallet(walletRes.data);
                if (badgesRes?.success) setBadgesData(badgesRes.data);
                if (histRes?.success) setHistoryData(histRes.data);
            } catch (err) {
                console.error(err);
                showToast("❌ Lỗi khi tải dữ liệu hồ sơ!");
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [api, showToast]);

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
            const res = await api('/profile/avatar', {
                method: 'POST',
                body: formData
            });
            if (res && res.success) {
                setUser(res.user);
                showToast("✅ Đã cập nhật ảnh đại diện");
            }
        } catch (error) {
            console.error("Lỗi upload ảnh:", error);
            showToast("❌ Lỗi khi tải ảnh lên!");
        }
    };

    const copyWalletAddress = () => {
        if (wallet?.walletAddress) {
            navigator.clipboard.writeText(wallet.walletAddress);
            showToast("✅ Đã copy địa chỉ ví");
        }
    };

    // Filter History
    const filteredHistory = (historyData || []).filter(row => {
        if (activeTab === 'all') return true;
        if (activeTab === 'receive') return row.category === 'Nhận UGC';
        if (activeTab === 'redeem') return row.category === 'Đổi quà';
        if (activeTab === 'transfer') return row.category === 'Chuyển UGC';
        return true;
    });

    const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : "---";
    const qrUrl = wallet?.walletAddress ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${wallet.walletAddress}` : null;

    if (loading) {
        return (
            <div className="profile-page animate-in fade-in">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">HỒ SƠ CÁ NHÂN</h2>
                <div className="profile-page__header-card mb-6">
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="profile-page__grid-2">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (user?.role === 'admin') {
        return (
            <div className="profile-page animate-in fade-in">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">HỒ SƠ QUẢN TRỊ VIÊN</h2>

                {/* 1. HEADER */}
                <div className="profile-page__header-card" style={{ backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
                    <div className="profile-page__info-section">
                        <div className="profile-page__avatar-wrapper">
                            <div className="profile-page__avatar overflow-hidden" style={{ backgroundColor: '#10b981' }}>
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(profile?.full_name || user?.username || 'AD')
                                )}
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                            />
                            <button className="profile-page__avatar-camera" onClick={handleAvatarClick} title="Thay đổi ảnh đại diện">
                                <span className="material-symbols-outlined text-sm">photo_camera</span>
                            </button>
                        </div>
                        <div className="profile-page__details">
                            <div className="profile-page__name-row">
                                <h1 className="profile-page__name" style={{ color: '#fff' }}>{profile?.full_name || user?.username || "Admin ULSA"}</h1>
                                <div className="profile-page__badge-verified" style={{ backgroundColor: '#10b981', color: '#fff' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield_person</span>
                                    Ban Quản Trị
                                </div>
                            </div>
                            <p className="profile-page__detail-text" style={{ color: '#cbd5e1' }}>
                                Vai trò: Quản trị viên hệ thống (Admin)
                            </p>
                            {(profile?.email || user?.email) && (
                                <p className="profile-page__detail-text" style={{ color: '#cbd5e1' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>mail</span>
                                    {profile?.email || user?.email}
                                </p>
                            )}
                            <p className="profile-page__detail-text mt-2" style={{ color: '#94a3b8' }}>
                                Thành viên từ: {joinedDate}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. THÔNG TIN QUẢN TRỊ & VÍ */}
                <div className="profile-page__grid-2">
                    <div className="profile-page__card" style={{ borderLeft: '4px solid #10b981' }}>
                        <h3 className="profile-page__card-title">QUYỀN HẠN QUẢN TRỊ</h3>
                        <div className="green-id-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                            <div className="green-id-card__content" style={{ marginBottom: 0 }}>
                                <div className="green-id-card__icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#10b981' }}>admin_panel_settings</span>
                                </div>
                                <div className="green-id-card__info">
                                    <p style={{ color: '#94a3b8', fontSize: '11px' }}>HỆ THỐNG PHÂN QUYỀN</p>
                                    <h3 style={{ fontSize: '18px' }}>Super Admin</h3>
                                    <p style={{ marginTop: '6px', fontSize: '12px', opacity: 0.9 }}>Đầy đủ quyền phê duyệt đề xuất, quản lý nguồn cung UGC và kiểm duyệt sinh viên.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-page__card">
                        <h3 className="profile-page__card-title">VÍ BLOCKCHAIN</h3>
                        <div className="profile-wallet">
                            <div className="profile-wallet__left">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Địa chỉ ví cá nhân</p>
                                <div className="profile-wallet__address-box">
                                    <span className="profile-wallet__address" style={{ fontSize: '13px' }}>{wallet?.walletAddress || "Chưa cấp ví blockchain"}</span>
                                    <button className="profile-wallet__copy-btn" onClick={copyWalletAddress}>
                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                    </button>
                                </div>
                                <div className="profile-wallet__qr flex items-center gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2 mt-0 font-medium">QR ví để nhận chuyển khoản hoặc đối soát</p>
                                        <div style={{ background: '#f8f8f8', padding: '8px', borderRadius: '8px', display: 'inline-block', border: '1px solid #ddd' }}>
                                            {qrUrl ? (
                                                <img src={qrUrl} alt="QR Code" style={{ width: 80, height: 80 }} />
                                            ) : (
                                                <span className="material-symbols-outlined" style={{ fontSize: 80, color: '#333' }}>qr_code_2</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="profile-wallet__right" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                <p className="profile-wallet__balance-title">SỐ DƯ CÁ NHÂN</p>
                                <div className="profile-wallet__balance-amount">
                                    <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: 32 }}>eco</span>
                                    {wallet?.balance || 0}
                                    <span className="ugc-label">UGC</span>
                                </div>
                                <button className="profile-wallet__history-btn" style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => window.scrollTo(0, document.body.scrollHeight)}>
                                    Lịch sử hoạt động <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. THỐNG KÊ QUẢN TRỊ */}
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 mt-6">THỐNG KÊ HOẠT ĐỘNG</h2>
                <div className="profile-page__stats-grid">
                    <div className="stat-box stat-box--green" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
                        <div className="stat-box__header">
                            <div className="stat-box__icon" style={{ backgroundColor: '#bbf7d0', color: '#16a34a' }}><span className="material-symbols-outlined">how_to_reg</span></div>
                            <h3 className="stat-box__title">Duyệt sinh viên<br/>(Yêu cầu cấp ví)</h3>
                        </div>
                        <div>
                            <div className="stat-box__value">{stats?.approvedClaims || 0}<span>yêu cầu</span></div>
                            <div className="stat-box__trend stat-box__trend--neutral">Đã phê duyệt thành công</div>
                        </div>
                    </div>

                    <div className="stat-box stat-box--blue" style={{ backgroundColor: '#f0f9ff', borderColor: '#e0f2fe' }}>
                        <div className="stat-box__header">
                            <div className="stat-box__icon" style={{ backgroundColor: '#bae6fd', color: '#0284c7' }}><span className="material-symbols-outlined">assignment</span></div>
                            <h3 className="stat-box__title">Sự kiện hoạt động<br/>đã khởi tạo</h3>
                        </div>
                        <div>
                            <div className="stat-box__value">{stats?.totalEvents || 0}<span>sự kiện</span></div>
                            <div className="stat-box__trend stat-box__trend--neutral">Trên toàn hệ thống</div>
                        </div>
                    </div>

                    <div className="stat-box stat-box--orange" style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5' }}>
                        <div className="stat-box__header">
                            <div className="stat-box__icon" style={{ backgroundColor: '#fed7aa', color: '#ea580c' }}><span className="material-symbols-outlined">pending_actions</span></div>
                            <h3 className="stat-box__title">Minh chứng duyệt<br/>chờ xử lý</h3>
                        </div>
                        <div>
                            <div className="stat-box__value">{stats?.totalEarned || 0}<span>minh chứng</span></div>
                            <div className="stat-box__trend stat-box__trend--neutral">Cần xem xét</div>
                        </div>
                    </div>

                    <div className="stat-box stat-box--purple" style={{ backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }}>
                        <div className="stat-box__header">
                            <div className="stat-box__icon" style={{ backgroundColor: '#e9d5ff', color: '#9333ea' }}><span className="material-symbols-outlined">manage_accounts</span></div>
                            <h3 className="stat-box__title">Tài khoản quản lý<br/>(Thành viên hội đồng)</h3>
                        </div>
                        <div>
                            <div className="stat-box__value">3<span>thành viên</span></div>
                            <div className="stat-box__trend stat-box__trend--neutral">Đa chữ ký (Multi-Sig)</div>
                        </div>
                    </div>
                </div>

                {/* 4. LỊCH SỬ HOẠT ĐỘNG */}
                <div className="profile-page__card">
                    <h3 className="profile-badges__title mb-2">NHẬT KÝ HOẠT ĐỘNG QUẢN TRỊ</h3>
                    
                    <div className="profile-history__tabs">
                        <button className={`profile-history__tab ${activeTab === 'all' ? 'profile-history__tab--active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả nhật ký</button>
                    </div>

                    <div className="mt-4">
                        <HistoryDataTable data={filteredHistory} />
                    </div>
                </div>

            </div>
        )
    }

    return (
        <div className="profile-page animate-in fade-in">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">HỒ SƠ CÁ NHÂN</h2>

            {/* 1. HEADER */}
            <div className="profile-page__header-card">
                <div className="profile-page__info-section">
                    <div className="profile-page__avatar-wrapper">
                        <div className="profile-page__avatar overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url.startsWith('http') ? user.avatar_url : user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(profile?.full_name || user?.username)
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                        />
                        <button className="profile-page__avatar-camera" onClick={handleAvatarClick} title="Thay đổi ảnh đại diện">
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                        </button>
                    </div>
                    <div className="profile-page__details">
                        <div className="profile-page__name-row">
                            <h1 className="profile-page__name">{profile?.full_name || user?.username || "Sinh viên"}</h1>
                            <div className="profile-page__badge-verified">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
                                Đã xác thực
                            </div>
                        </div>
                        <p className="profile-page__detail-text" style={{ color: '#333', fontWeight: 500 }}>
                            MSV: {profile?.student_id || "Chưa cập nhật"}
                        </p>
                        <p className="profile-page__detail-text">
                            {profile?.class_name || "Chưa phân lớp"} {profile?.cohort ? `• Khóa ${profile.cohort}` : ""}
                        </p>
                        {(profile?.email || user?.username) && (
                            <p className="profile-page__detail-text">
                                <span className="material-symbols-outlined">mail</span>
                                {profile?.email || `${user?.username}@ulsa.edu.vn`}
                            </p>
                        )}
                        <p className="profile-page__detail-text mt-2" style={{ color: '#888' }}>
                            Thành viên từ: {joinedDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. THẺ SINH VIÊN & VÍ */}
            <div className="profile-page__grid-2">
                <div className="profile-page__card">
                    <h3 className="profile-page__card-title">THẺ SINH VIÊN XANH</h3>
                    <div className="green-id-card">
                        <div className="green-id-card__content">
                            <div className="green-id-card__icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#fff' }}>eco</span>
                            </div>
                            <div className="green-id-card__info">
                                <p>Hạng thành viên</p>
                                <h3>{profile?.rankName || 'Xanh Mầm'} <span className="material-symbols-outlined" style={{ fontSize: 20 }}>eco</span></h3>
                            </div>
                        </div>
                        <div className="green-id-card__progress-container">
                            <div className="green-id-card__progress-bar">
                                <div 
                                    className="green-id-card__progress-fill" 
                                    style={{ width: `${Math.min(((profile?.rankProgress || 0) / (profile?.rankMax || 100)) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="green-id-card__progress-text">
                                <span>{profile?.rankProgress || 0} / {(profile?.rankMax || 100).toLocaleString()} UGC</span>
                                {(profile?.rankMax || 100) > (profile?.rankProgress || 0) && (
                                    <span style={{ opacity: 0.8 }}>
                                        Còn {((profile?.rankMax || 100) - (profile?.rankProgress || 0))} UGC để thăng hạng
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-page__card">
                    <h3 className="profile-page__card-title">VÍ BLOCKCHAIN</h3>
                    <div className="profile-wallet">
                        <div className="profile-wallet__left">
                            <p className="text-xs text-gray-500 mb-2 font-medium">Địa chỉ ví của bạn</p>
                            <div className="profile-wallet__address-box">
                                <span className="profile-wallet__address">{wallet?.walletAddress || "Chưa kết nối ví"}</span>
                                <button className="profile-wallet__copy-btn" onClick={copyWalletAddress}>
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                            </div>
                            <div className="profile-wallet__qr flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 mt-0 font-medium">Quét để nhận UGC hoặc điểm danh</p>
                                    <div style={{ background: '#f8f8f8', padding: '8px', borderRadius: '8px', display: 'inline-block', border: '1px solid #ddd' }}>
                                        {qrUrl ? (
                                            <img src={qrUrl} alt="QR Code" style={{ width: 80, height: 80 }} />
                                        ) : (
                                            <span className="material-symbols-outlined" style={{ fontSize: 80, color: '#333' }}>qr_code_2</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="profile-wallet__right">
                            <p className="profile-wallet__balance-title">SỐ DƯ UGC HIỆN TẠI</p>
                            <div className="profile-wallet__balance-amount">
                                <span className="material-symbols-outlined" style={{ color: '#29A646', fontSize: 32 }}>eco</span>
                                {wallet?.balance || 0}
                                <span className="ugc-label">UGC</span>
                            </div>
                            <button className="profile-wallet__history-btn" onClick={() => window.scrollTo(0, document.body.scrollHeight)}>
                                Lịch sử giao dịch <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. THỐNG KÊ */}
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 mt-6">THỐNG KÊ TỔNG QUAN</h2>
            <div className="profile-page__stats-grid">
                <div className="stat-box stat-box--green">
                    <div className="stat-box__header">
                        <div className="stat-box__icon"><span className="material-symbols-outlined">eco</span></div>
                        <h3 className="stat-box__title">Tổng UGC<br/>đã tích lũy</h3>
                    </div>
                    <div>
                        <div className="stat-box__value">{(stats?.totalEarned || 0).toLocaleString()}<span>UGC</span></div>
                        <div className="stat-box__trend stat-box__trend--neutral">Toàn thời gian</div>
                    </div>
                </div>

                <div className="stat-box stat-box--blue">
                    <div className="stat-box__header">
                        <div className="stat-box__icon"><span className="material-symbols-outlined">groups</span></div>
                        <h3 className="stat-box__title">Tổng sự kiện<br/>đã tham gia</h3>
                    </div>
                    <div>
                        <div className="stat-box__value">{stats?.totalEvents || 0}<span>sự kiện</span></div>
                        <div className="stat-box__trend stat-box__trend--neutral">Sự kiện & Hoạt động</div>
                    </div>
                </div>

                <div className="stat-box stat-box--orange">
                    <div className="stat-box__header">
                        <div className="stat-box__icon"><span className="material-symbols-outlined">local_fire_department</span></div>
                        <h3 className="stat-box__title">Chuỗi ngày<br/>xanh dài nhất</h3>
                    </div>
                    <div>
                        <div className="stat-box__value">{stats?.longestStreak || 0}<span>ngày</span></div>
                        <div className="stat-box__trend stat-box__trend--neutral">Kỷ lục cá nhân</div>
                    </div>
                </div>

                <div className="stat-box stat-box--purple">
                    <div className="stat-box__header">
                        <div className="stat-box__icon"><span className="material-symbols-outlined">emoji_events</span></div>
                        <h3 className="stat-box__title">Xếp hạng<br/>toàn trường</h3>
                    </div>
                    <div>
                        <div className="stat-box__value">{stats?.schoolRank || '-'}<span>/ {stats?.schoolTotal || '-'}</span></div>
                        <div className="stat-box__trend stat-box__trend--neutral">Top sinh viên tích cực</div>
                    </div>
                </div>
            </div>

            {/* 4. HUY HIỆU */}
            <div className="profile-page__card mb-6">
                <div className="profile-badges__header">
                    <h3 className="profile-badges__title">HUY HIỆU & THÀNH TỰU</h3>
                </div>

                <div className="profile-badges__header">
                    <h4 className="text-[13px] font-bold text-gray-800 m-0">Huy hiệu đã đạt được</h4>
                    {(badgesData?.achieved?.length || 0) > 0 && (
                        <a href="#" className="profile-badges__view-all">Xem tất cả <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                    )}
                </div>
                <div className="profile-badges__grid">
                    {(badgesData?.achieved?.length || 0) === 0 && (
                        <p className="text-sm text-gray-400 py-4 italic">Chưa đạt huy hiệu nào.</p>
                    )}
                    {(badgesData?.achieved || []).map(b => {
                        const dateObj = new Date(b.date);
                        return (
                            <div key={b.id} className="profile-badges__item" title={b.description}>
                                <div className="profile-badges__icon-hex" style={{ color: b.color, borderColor: `${b.color}40`, backgroundColor: `${b.color}15` }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{b.icon}</span>
                                </div>
                                <h4>{b.name}</h4>
                                <p>{dateObj.toLocaleDateString('vi-VN')}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="profile-badges__header mt-8">
                    <h4 className="text-[13px] font-bold text-gray-800 m-0">Huy hiệu đang tiến hành</h4>
                    {(badgesData?.inProgress?.length || 0) > 0 && (
                        <a href="#" className="profile-badges__view-all">Xem tất cả <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                    )}
                </div>
                <div className="profile-badges__progress-grid">
                    {(badgesData?.inProgress?.length || 0) === 0 && (
                        <p className="text-sm text-gray-400 py-4 italic">Không có huy hiệu nào đang tiến hành.</p>
                    )}
                    {(badgesData?.inProgress || []).map(b => {
                        const percent = Math.min(Math.round((b.current / b.max) * 100), 100);
                        return (
                            <div key={b.id} className="profile-badges__progress-card" title={b.description}>
                                <div className="profile-badges__progress-header">
                                    <div className="profile-badges__progress-icon">
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{b.icon}</span>
                                    </div>
                                    <h4>{b.name}</h4>
                                </div>
                                <div className="profile-badges__progress-bar-bg">
                                    <div className="profile-badges__progress-bar-fill" style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="profile-badges__progress-stats">
                                    <span>{b.current} / {b.max}</span>
                                    <span>{percent}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 5. LỊCH SỬ */}
            <div className="profile-page__card">
                <h3 className="profile-badges__title mb-2">LỊCH SỬ HOẠT ĐỘNG & GIAO DỊCH</h3>
                
                <div className="profile-history__tabs">
                    <button className={`profile-history__tab ${activeTab === 'all' ? 'profile-history__tab--active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả</button>
                    <button className={`profile-history__tab ${activeTab === 'receive' ? 'profile-history__tab--active' : ''}`} onClick={() => setActiveTab('receive')}>Nhận UGC</button>
                    <button className={`profile-history__tab ${activeTab === 'redeem' ? 'profile-history__tab--active' : ''}`} onClick={() => setActiveTab('redeem')}>Đổi quà</button>
                    <button className={`profile-history__tab ${activeTab === 'transfer' ? 'profile-history__tab--active' : ''}`} onClick={() => setActiveTab('transfer')}>Chuyển UGC</button>
                </div>

                <div className="mt-4">
                    <HistoryDataTable data={filteredHistory} />
                </div>

                <div className="profile-history__footer">
                    <a href="#" className="profile-badges__view-all">Xem thêm lịch sử <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                </div>
            </div>

        </div>
    );
}
