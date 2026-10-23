import React, { useState } from 'react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  semester: string;
  onSemesterChange: (s: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickNavigate?: (destination: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  semester,
  onSemesterChange,
  searchQuery,
  onSearchChange,
  onQuickNavigate,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([
    {
      id: 1,
      title: 'Phòng A01-202 vượt định mức điện nước',
      time: '15 phút trước',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Phiếu SC-2601 cần duyệt khẩn cấp (A2-308)',
      time: '45 phút trước',
      type: 'error',
    },
    {
      id: 3,
      title: 'Đã hoàn tất thanh toán hóa đơn HD-202603-0891',
      time: '2 giờ trước',
      type: 'success',
    },
  ]);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#f9f9ff]/90 backdrop-blur-xl z-40 px-4 sm:px-gutter flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#dfe8ff]/60">
      <div className="flex items-center gap-space-md flex-1 max-w-xl">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#44474f] hover:bg-[#f0f3ff] transition-colors"
          aria-label="Mở menu điều hướng"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[#747780] text-lg pointer-events-none">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-space-md rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20 transition-all border border-transparent focus:border-[#c4c6d0]"
            placeholder="Tìm kiếm phòng, mã SV, CCCD, đơn..."
            type="text"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 p-1 text-[#747780] hover:text-[#111c2d]"
              title="Xóa tìm kiếm"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Academic Semester Selector */}
        <div className="hidden sm:flex relative items-center bg-[#f0f3ff] rounded-xl px-space-sm py-1 border border-transparent hover:border-[#c4c6d0] transition-colors shrink-0">
          <span className="material-symbols-outlined text-[#375ba9] text-base mr-1.5 pointer-events-none">
            calendar_month
          </span>
          <select
            value={semester}
            onChange={(e) => onSemesterChange(e.target.value)}
            className="bg-transparent text-[#111c2d] font-label-md text-xs font-semibold pr-4 py-1 focus:outline-none cursor-pointer appearance-none"
            aria-label="Chọn học kỳ"
          >
            <option value="Năm học 2026-2027 · HK1">Năm học 2026-2027 · HK1</option>
            <option value="Năm học 2025-2026 · HK2">Năm học 2025-2026 · HK2</option>
            <option value="Năm học 2025-2026 · HK1">Năm học 2025-2026 · HK1</option>
          </select>
          <span className="material-symbols-outlined text-[#747780] text-xs pointer-events-none -ml-3">
            expand_more
          </span>
        </div>
      </div>

      {/* Header Actions: Notifications & Avatar */}
      <div className="flex items-center gap-space-sm sm:gap-space-md relative">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-[#44474f] hover:bg-[#f0f3ff] hover:text-[#111c2d] transition-colors"
            title="Thông báo"
            type="button"
            aria-label="Thông báo"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadNotifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-[#dfe8ff] p-space-md z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
                <div className="font-headline-sm text-sm font-bold text-[#00163a]">
                  Thông báo hệ thống ({unreadNotifications.length})
                </div>
                <button
                  onClick={() => setUnreadNotifications([])}
                  className="text-xs text-[#375ba9] hover:underline font-medium"
                >
                  Đánh dấu đã đọc
                </button>
              </div>
              <div className="divide-y divide-[#f0f3ff] max-h-72 overflow-y-auto mt-1">
                {unreadNotifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#747780]">
                    Không có thông báo mới
                  </div>
                ) : (
                  unreadNotifications.map((n) => (
                    <div key={n.id} className="py-2.5 flex items-start gap-2.5 hover:bg-[#f9f9ff] px-1 rounded-lg">
                      <span
                        className={`material-symbols-outlined text-lg mt-0.5 ${
                          n.type === 'error'
                            ? 'text-[#ba1a1a]'
                            : n.type === 'warning'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'check_circle'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#111c2d] leading-snug">{n.title}</p>
                        <span className="text-[10px] text-[#747780]">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Hotlink */}
        <div className="flex items-center gap-space-sm pl-space-sm border-l border-[#dfe8ff]">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#375ba9]/20 shrink-0">
            <img
              alt="Ảnh đại diện quản lý KTX"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VEg_e1KgZL29_UWGSHe9LkzfHL711XB560TIZqL2TwwsGUBBut-lF6cxcEoWyjlxbNQUeKZqNz4jPERNeEl7tWfPjEtMxJf226DAUWSDXJgEJ-sGieFawrPt7uD671U48KZ1uZDHe51aXOhRjnHf1PigfQIbDmVGVkxSTtxjkoEMXvkEjZfFmox3lvMhXiEGDOJ3UhUXJvYHEoEmFoJREvVl7UKvK0kjkVaJzhE37UquQkN1i40Kr-xx4f3irijoWB1s6GtYv9qQ"
            />
          </div>
          <div className="hidden md:block leading-tight text-left">
            <div className="text-xs font-bold text-[#00163a]">Nguyễn Văn An</div>
            <div className="text-[10px] text-[#747780]">BQL Phân hiệu UTC2</div>
          </div>
        </div>
      </div>
    </header>
  );
};
