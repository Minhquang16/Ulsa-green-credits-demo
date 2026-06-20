import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import img1 from '../assets/img_sidebar/1.png'
import img2 from '../assets/img_sidebar/2.png'
import img3 from '../assets/img_sidebar/3.png'
import img5 from '../assets/img_sidebar/5.png'

const bannerImages = [img1, img2, img3, img5]
import { cn } from '../lib/utils'
import logoWeb from '../logo_web.png'
import { PanelLeft } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { TooltipPortal } from './ui/tooltip-portal'
import '../styles/student-sidebar.css'

export default function StudentSidebar({ isCollapsed, setIsCollapsed }) {
  const loc = useLocation()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (isCollapsed) return
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isCollapsed])

  const navItems = [
    { path: '/student/dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { path: '/student/events', label: 'Hoạt động', icon: 'event_note' },
    { path: '/student/claims', label: 'Ghi nhận', icon: 'verified' },
    { path: '/training-points', label: 'Điểm rèn luyện', icon: 'school' },
    { path: '/student/rewards', label: 'Ưu đãi', icon: 'redeem' }
  ]

  const bottomItems = [
    { path: '#', label: 'Ví Blockchain', icon: 'account_balance_wallet', action: () => alert('Tính năng Ví Blockchain đang phát triển!') },
    { path: '/profile', label: 'Hồ sơ', icon: 'person' },
    { path: '#', label: 'Cài đặt', icon: 'settings', action: () => window.dispatchEvent(new Event('open-settings')) },
    { path: '#', label: 'Trợ giúp', icon: 'help', action: () => alert('Liên hệ Ban công nghệ thông tin ULSA để được hỗ trợ.') }
  ]

  return (
    <aside className={cn("student-sidebar", isCollapsed ? "student-sidebar--collapsed" : "student-sidebar--expanded")}>

      {/* Sidebar Header / Logo */}
      <div className="sidebar-header">
        <Link
          to="/student/dashboard"
          className={cn("sidebar-logo-link", isCollapsed ? "sidebar-logo-link--collapsed" : "sidebar-logo-link--expanded")}
        >
          <div className="sidebar-logo-container">
            <img src={logoWeb} alt="UGC Logo" className="sidebar-logo-img--expanded" />
          </div>
        </Link>

        {isCollapsed && (
          <Link to="/student/dashboard" className="sidebar-logo-collapsed-link">
            <img src={logoWeb} alt="UGC Logo" className="sidebar-logo-img--collapsed" />
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("sidebar-toggle-btn", isCollapsed && "sidebar-toggle-btn--collapsed")}
        >
          <PanelLeft className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1 w-full">
        <div className="sidebar-nav-container flex flex-col min-h-full">
          {navItems.map(item => {
            const isActive = loc.pathname === item.path
            return (
              <div key={item.path} className="sidebar-nav-item">
                <TooltipPortal content={item.label} disabled={!isCollapsed}>
                  <Link
                    to={item.path}
                    className={cn("sidebar-nav-link", isActive ? "sidebar-nav-link--active" : "sidebar-nav-link--inactive")}
                  >
                    <span className={cn("material-symbols-outlined sidebar-nav-icon", isActive ? "sidebar-nav-icon--active" : "sidebar-nav-icon--inactive")}>
                      {item.icon}
                    </span>
                    <span className={cn("sidebar-nav-label", isCollapsed ? "sidebar-nav-label--collapsed" : "sidebar-nav-label--expanded")}>
                      {item.label}
                    </span>
                  </Link>
                </TooltipPortal>
              </div>
            )
          })}

          <Separator className="my-4" />

          {/* Secondary Navigation */}
          {bottomItems.map((item, idx) => {
            const isActive = loc.pathname === item.path
            return (
              <div key={idx} className="sidebar-nav-item">
                <TooltipPortal content={item.label} disabled={!isCollapsed}>
                  <Link
                    to={item.path}
                    onClick={item.action ? (e) => { e.preventDefault(); item.action(); } : undefined}
                    className={cn("sidebar-nav-link", isActive ? "sidebar-nav-link--active" : "sidebar-nav-link--inactive")}
                  >
                    <span className={cn("material-symbols-outlined sidebar-nav-icon", isActive ? "sidebar-nav-icon--active" : "sidebar-nav-icon--inactive")}>
                      {item.icon}
                    </span>
                    <span className={cn("sidebar-nav-label", isCollapsed ? "sidebar-nav-label--collapsed" : "sidebar-nav-label--expanded")}>
                      {item.label}
                    </span>
                  </Link>
                </TooltipPortal>
              </div>
            )
          })}

          <div className="mt-auto"></div>

          {/* Bottom Banner */}
          <div className={cn("sidebar-banner-container", isCollapsed ? "sidebar-banner-container--collapsed" : "sidebar-banner-container--expanded px-[12px] pb-6 w-full")}>
            <div
              className="relative rounded-[20px] overflow-hidden shadow-sm flex flex-col w-full"
              style={{ height: '295px' }}
            >
              {bannerImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="banner background"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out z-0",
                    currentImageIndex === idx ? "opacity-100" : "opacity-0"
                  )}
                />
              ))}

              {/* Overlay Content */}
              <div className="sidebar-banner__overlay">
                <div className="sidebar-banner__header">
                  <h4 className="sidebar-banner__title">
                    Dấu ấn xanh ULSA
                  </h4>
                  <p className="sidebar-banner__subtitle">
                    Tích lũy tín chỉ UGC <br /> Lan tỏa giá trị bền vững.
                  </p>
                </div>
                <div className="sidebar-banner__footer">
                  <button className="sidebar-banner__button" style={{ whiteSpace: 'nowrap' }}>
                    Tìm hiểu thêm <span className="material-symbols-outlined sidebar-banner__button-icon">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside >
  )
}
