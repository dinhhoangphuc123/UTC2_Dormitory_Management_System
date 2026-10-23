import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEMO_USERS } from '../data/mockData';

interface TopNavProps {
  currentUser: UserProfile;
  onSwitchUser: (username: string) => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  selectedSemester: string;
  onSelectSemester: (sem: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  onOpenSearch,
  onToggleMobileMenu,
  darkMode,
  onToggleDarkMode,
  selectedSemester,
  onSelectSemester,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showSemesterMenu, setShowSemesterMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const semRef = useRef<HTMLDivElement>(null);

  const semesters = [
    'Năm học 2026-2027 · HK1',
    'Năm học 2026-2027 · HK2',
    'Năm học 2025-2026 · HK2',
    'Năm học 2025-2026 · HK1',
  ];

  const notifications = [
    {
      id: 1,
      title: 'Báo cáo sự cố khẩn cấp',
      desc: 'Phòng A302 báo rò rỉ vòi nước tầng 3',
      time: '10 phút trước',
      icon: 'water_damage',
      unread: true,
    },
    {
      id: 2,
      title: 'Đơn đăng ký mới đợt K65',
      desc: 'Có 86 hồ sơ mới đang chờ xét duyệt nội trú',
      time: '25 phút trước',
      icon: 'how_to_reg',
      unread: true,
    },
    {
      id: 3,
      title: 'Nhắc nợ tiền phòng tháng 10',
      desc: 'Tòa B có 12 phòng quá hạn đóng tiền dịch vụ',
      time: '1 giờ trước',
      icon: 'receipt_long',
      unread: false,
    },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationMenu(false);
      }
      if (semRef.current && !semRef.current.contains(e.target as Node)) {
        setShowSemesterMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-xl border-b border-[#E4E7EC] dark:border-[#232B3B] z-40 flex items-center justify-between px-4 lg:px-8 shadow-xs transition-colors">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Mở menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Global Search Bar */}
        <div
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 w-full max-w-md h-10 px-3.5 rounded-xl bg-slate-100/80 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 cursor-pointer hover:border-[#0B2A5B] dark:hover:border-blue-500/50 transition-all shadow-2xs group"
        >
          <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors">
            search
          </span>
          <span className="text-[13px] text-slate-400 dark:text-slate-400 truncate flex-1 select-none">
            Tìm kiếm (phòng, SV, hóa đơn...)
          </span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Semester, Dark mode, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
        {/* Semester Selector */}
        <div className="relative" ref={semRef}>
          <button
            type="button"
            onClick={() => setShowSemesterMenu(!showSemesterMenu)}
            className="hidden md:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[17px] text-[#0B2A5B] dark:text-blue-400">
              calendar_today
            </span>
            <span className="truncate max-w-[160px]">{selectedSemester}</span>
            <span className="material-symbols-outlined text-[16px] text-slate-400">
              expand_more
            </span>
          </button>

          {showSemesterMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1 z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Chọn năm học / học kỳ
              </div>
              {semesters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onSelectSemester(s);
                    setShowSemesterMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                    selectedSemester === s
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>{s}</span>
                  {selectedSemester === s && (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B0F1A] border border-transparent dark:border-[#232B3B] transition-colors"
          title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B0F1A] border border-transparent dark:border-[#232B3B] transition-colors"
            title="Thông báo"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#121826]" />
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-2xl py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  Thông báo KTX
                </span>
                <span className="text-[11px] font-semibold text-[#0B2A5B] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  2 mới
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      n.unread ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {n.desc}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-[#232B3B] hidden sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B0F1A] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#00163a] text-white flex items-center justify-center font-bold text-xs overflow-hidden ring-2 ring-blue-500/20">
              {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">person</span>
              )}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-semibold text-xs text-slate-800 dark:text-white leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentUser.role}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-400">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.email}
                </p>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-300 font-semibold">
                  {currentUser.role}
                </span>
              </div>

              <div className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Chuyển nhanh tài khoản demo
                </div>
                {Object.entries(DEMO_USERS).map(([key, u]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSwitchUser(key);
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      currentUser.username === key
                        ? 'font-bold text-[#0B2A5B] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.role}</div>
                    </div>
                    {currentUser.username === key && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Đăng xuất khỏi hệ thống
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
