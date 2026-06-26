import React, { useState } from 'react';
import { useAuth } from '../../auth.jsx';

function FAQItem({ icon, title, content }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-left">{title}</span>
                </div>
                <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            <div 
                className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="pl-14 text-sm text-gray-600 leading-relaxed">
                    {content}
                </div>
            </div>
        </div>
    );
}

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('faq');

    const faqs = [
        {
            icon: 'eco',
            title: 'UGC là gì?',
            content: 'UGC (Ulsa Green Credits) là hệ thống điểm tín chỉ xanh dành cho sinh viên, được ghi nhận thông qua các hoạt động bảo vệ môi trường, học tập và rèn luyện.'
        },
        {
            icon: 'card_giftcard',
            title: 'Làm sao để nhận UGC?',
            content: 'Bạn có thể nhận UGC bằng cách tham gia các sự kiện, hoàn thành bài tập, hoặc đóng góp vào các hoạt động cộng đồng được nhà trường phê duyệt.'
        },
        {
            icon: 'bar_chart',
            title: 'Điểm rèn luyện và UGC có liên quan không?',
            content: 'Có, UGC có thể được quy đổi sang điểm rèn luyện hoặc sử dụng như một tiêu chí để đánh giá kết quả rèn luyện cuối kỳ của sinh viên.'
        },
        {
            icon: 'shopping_cart',
            title: 'Tôi có thể dùng UGC để làm gì?',
            content: 'UGC có thể được dùng để đổi các phần quà hấp dẫn, voucher giảm giá, vé tham gia sự kiện hoặc các ưu đãi khác từ đối tác của trường.'
        },
        {
            icon: 'account_balance_wallet',
            title: 'Ví Blockchain là gì?',
            content: 'Ví Blockchain là nơi lưu trữ an toàn các tín chỉ UGC của bạn. Mọi giao dịch đều được ghi lại minh bạch và không thể giả mạo trên hệ thống Blockchain.'
        },
        {
            icon: 'lock',
            title: 'Tôi quên mật khẩu, phải làm gì?',
            content: 'Vui lòng nhấn vào "Quên mật khẩu" ở trang đăng nhập và làm theo hướng dẫn gửi qua email sinh viên của bạn để đặt lại mật khẩu mới.'
        }
    ];

    const getHeaderContent = () => {
        switch(activeTab) {
            case 'guide':
                return {
                    title: 'Hướng dẫn sử dụng',
                    desc: 'Khám phá cách sử dụng UGC để ghi nhận hoạt động, tích lũy tín chỉ và đổi ưu đãi một cách dễ dàng.',
                    bannerTitle: 'Không tìm thấy điều bạn cần?'
                }
            case 'contact':
                return {
                    title: 'Liên hệ hỗ trợ',
                    desc: 'Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn giải đáp mọi thắc mắc và vấn đề kỹ thuật.',
                    bannerTitle: 'Cần hỗ trợ trực tiếp?'
                }
            case 'faq':
            default:
                return {
                    title: 'Trung tâm Trợ giúp',
                    desc: 'Chúng tôi ở đây để giúp bạn hiểu rõ hơn về UGC và sử dụng hệ thống một cách dễ dàng.',
                    bannerTitle: 'Không tìm thấy câu trả lời?'
                }
        }
    }
    const headerInfo = getHeaderContent();

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row gap-8 mb-10 items-center lg:items-start justify-between">
                <div className="flex-1 max-w-2xl">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{headerInfo.title}</h1>
                    <p className="text-gray-600 text-base leading-relaxed">
                        {headerInfo.desc}
                    </p>
                </div>

                <div className="bg-emerald-50/80 rounded-3xl p-6 flex gap-5 items-start min-w-[340px] border border-emerald-100/50">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 26 }}>forum</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-1.5 text-[15px]">{headerInfo.bannerTitle}</h3>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Gửi câu hỏi cho chúng tôi, đội ngũ hỗ trợ sẽ phản hồi sớm nhất.
                        </p>
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2">
                            Gửi yêu cầu hỗ trợ 
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-3 mb-10">
                <button 
                    onClick={() => setActiveTab('faq')}
                    className={`px-6 py-2.5 rounded-full font-semibold flex items-center gap-2.5 transition-all duration-200 ${
                        activeTab === 'faq' 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu_book</span>
                    Câu hỏi thường gặp
                </button>
                <button 
                    onClick={() => setActiveTab('guide')}
                    className={`px-6 py-2.5 rounded-full font-semibold flex items-center gap-2.5 transition-all duration-200 ${
                        activeTab === 'guide' 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>auto_stories</span>
                    Hướng dẫn sử dụng
                </button>
                <button 
                    onClick={() => setActiveTab('contact')}
                    className={`px-6 py-2.5 rounded-full font-semibold flex items-center gap-2.5 transition-all duration-200 ${
                        activeTab === 'contact' 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>support_agent</span>
                    Liên hệ hỗ trợ
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'faq' && (
                <div className="space-y-3.5">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} icon={faq.icon} title={faq.title} content={faq.content} />
                    ))}
                </div>
            )}

            {activeTab === 'guide' && (
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Quy trình tích lũy và sử dụng UGC</h2>
                    <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 lg:gap-2">
                        {[
                            { icon: 'person', title: 'Đăng ký tài khoản', desc: 'Dùng email sinh viên @ulsa.edu.vn để đăng ký và xác thực tài khoản.' },
                            { icon: 'event_note', title: 'Tham gia sự kiện', desc: 'Vào mục Hoạt động → Đăng ký sự kiện phù hợp với sở thích của bạn.' },
                            { icon: 'qr_code_scanner', title: 'Điểm danh QR', desc: 'Quét mã QR tại sự kiện để xác nhận tham gia và ghi nhận hoạt động.' },
                            { icon: 'verified', title: 'Nộp Ghi nhận', desc: 'Vào Ghi nhận → Nộp yêu cầu → Chờ duyệt từ ban tổ chức hoặc giảng viên.' },
                            { icon: 'eco', title: 'Nhận UGC', desc: 'Sau khi được duyệt, UGC sẽ được cấp vào ví Blockchain của bạn.' },
                            { icon: 'redeem', title: 'Đổi ưu đãi', desc: 'Dùng UGC để đổi quà tặng hoặc ưu đãi hấp dẫn trong mục Ưu đãi.' },
                        ].map((step, i) => (
                            <React.Fragment key={i}>
                                <div className="relative flex-1 bg-white border border-gray-100 rounded-2xl p-5 pt-8 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center mt-3 lg:mt-0">
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm z-10 border-[3px] border-white">
                                        {i + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{step.icon}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                                        Bước {i + 1}
                                    </span>
                                    <h3 className="font-bold text-gray-800 text-sm mb-2">{step.title}</h3>
                                    <p className="text-gray-500 text-[13px] leading-relaxed">{step.desc}</p>
                                </div>
                                {i < 5 && (
                                    <div className="hidden lg:flex items-center justify-center text-emerald-300 px-1 pt-6">
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Hướng dẫn chi tiết</h3>
                            <div className="space-y-3.5">
                                {faqs.map((faq, index) => (
                                    <FAQItem key={index} icon={faq.icon} title={faq.title} content={faq.content} />
                                ))}
                            </div>
                        </div>
                        
                        <div className="lg:col-span-1">
                            <div className="bg-emerald-50/70 rounded-2xl p-6 border border-emerald-100 h-full">
                                <h3 className="text-base font-bold text-gray-900 mb-5">Mẹo sử dụng UGC hiệu quả</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                                        <span className="text-[13px] font-medium text-gray-700 leading-relaxed">Tham gia nhiều hoạt động để tích lũy nhiều UGC hơn.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                                        <span className="text-[13px] font-medium text-gray-700 leading-relaxed">Hoàn thành ghi nhận đúng hạn để được duyệt nhanh chóng.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                                        <span className="text-[13px] font-medium text-gray-700 leading-relaxed">Theo dõi điểm rèn luyện thường xuyên để không bỏ lỡ ưu đãi.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                                        <span className="text-[13px] font-medium text-gray-700 leading-relaxed">Bảo mật tài khoản và ví Blockchain của bạn.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'contact' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm h-full">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Gửi yêu cầu hỗ trợ</h2>
                            
                            <form className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-semibold text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="Nhập họ và tên" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-[13px]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
                                        <input type="email" placeholder="Nhập email của bạn" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-[13px]" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700">Chủ đề <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all appearance-none bg-white text-[13px] text-gray-600">
                                            <option value="" disabled selected>Chọn chủ đề hỗ trợ</option>
                                            <option value="account">Vấn đề tài khoản</option>
                                            <option value="system">Lỗi hệ thống</option>
                                            <option value="ugc">Thắc mắc về UGC</option>
                                            <option value="other">Khác</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <span className="material-symbols-outlined" style={{fontSize: 18}}>expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700">Nội dung yêu cầu <span className="text-red-500">*</span></label>
                                    <textarea rows="4" placeholder="Mô tả chi tiết vấn đề hoặc câu hỏi của bạn..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none text-[13px] text-gray-600"></textarea>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700">Tệp đính kèm (nếu có)</label>
                                    <div className="w-full border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-emerald-50/30 transition-colors cursor-pointer group">
                                        <span className="material-symbols-outlined text-emerald-500 mb-2 group-hover:scale-110 transition-transform" style={{fontSize: 24}}>cloud_upload</span>
                                        <p className="text-[13px] font-medium text-emerald-700 mb-1">Kéo thả tệp hoặc click để chọn tệp</p>
                                        <p className="text-[11px] text-gray-500">Định dạng: .jpg, .png, .pdf (Tối đa 5MB)</p>
                                    </div>
                                </div>

                                <button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 mt-2 text-sm shadow-sm hover:shadow-md">
                                    Gửi yêu cầu hỗ trợ
                                    <span className="material-symbols-outlined" style={{fontSize: 16}}>send</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1 space-y-6 flex flex-col">
                        {/* Contact Info Card */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-5">Thông tin liên hệ</h3>
                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                        <span className="material-symbols-outlined" style={{fontSize: 20}}>mail</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">Email hỗ trợ</h4>
                                        <p className="text-emerald-600 text-[13px] font-medium">cntt@ulsa.edu.vn</p>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600" title="Copy">
                                        <span className="material-symbols-outlined" style={{fontSize: 16}}>content_copy</span>
                                    </button>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                        <span className="material-symbols-outlined" style={{fontSize: 20}}>call</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">Đường dây nóng</h4>
                                        <p className="text-emerald-600 text-[13px] font-medium">024 3833 6773</p>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600" title="Copy">
                                        <span className="material-symbols-outlined" style={{fontSize: 16}}>content_copy</span>
                                    </button>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                        <span className="material-symbols-outlined" style={{fontSize: 20}}>location_on</span>
                                    </div>
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">Địa chỉ</h4>
                                        <p className="text-gray-500 text-[12px] leading-relaxed">Phòng Công nghệ Thông tin, Đại học Lao động - Xã hội<br/>43 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Small FAQ Card */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex-1">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-gray-900">Câu hỏi thường gặp</h3>
                                <button 
                                    onClick={() => setActiveTab('faq')}
                                    className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                    Xem tất cả
                                    <span className="material-symbols-outlined" style={{fontSize: 14}}>arrow_forward</span>
                                </button>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 px-2 -mx-2 rounded-lg transition-colors">
                                    <span className="text-[13px] font-semibold text-gray-700">Thời gian phản hồi là bao lâu?</span>
                                    <span className="material-symbols-outlined text-emerald-500/50" style={{fontSize: 18}}>expand_more</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 px-2 -mx-2 rounded-lg transition-colors">
                                    <span className="text-[13px] font-semibold text-gray-700">Làm sao để báo cáo lỗi hệ thống?</span>
                                    <span className="material-symbols-outlined text-emerald-500/50" style={{fontSize: 18}}>expand_more</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 px-2 -mx-2 rounded-lg transition-colors">
                                    <span className="text-[13px] font-semibold text-gray-700">Tôi có thể gửi yêu cầu hỗ trợ vào cuối tuần không?</span>
                                    <span className="material-symbols-outlined text-emerald-500/50" style={{fontSize: 18}}>expand_more</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50/80 px-2 -mx-2 rounded-lg transition-colors">
                                    <span className="text-[13px] font-semibold text-gray-700">Làm sao để theo dõi trạng thái yêu cầu của tôi?</span>
                                    <span className="material-symbols-outlined text-emerald-500/50" style={{fontSize: 18}}>expand_more</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
