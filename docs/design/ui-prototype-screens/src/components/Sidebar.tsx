import React from 'react';

export type ScreenId =
  | 'dashboard'
  | 'dot-va-don-dang-ky'
  | 'quan-ly-hop-dong'
  | 'ho-so-sinh-vien'
  | 'lop-va-khoa-vien'
  | 'so-do-phong-va-giuong'
  | 'dien-nuoc-va-dich-vu'
  | 'hoa-don-va-thu-phi'
  | 'yeu-cau-sua-chua'
  | 'vi-pham-va-ky-luat'
  | 'nhan-vien-va-tai-khoan'
  | 'bao-cao-thong-ke';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: string;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'TỔNG QUAN',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    title: 'ĐĂNG KÝ & NỘI TRÚ',
    items: [
      { id: 'dot-va-don-dang-ky', label: 'Đợt & Đơn đăng ký', icon: 'how_to_reg' },
      { id: 'quan-ly-hop-dong', label: 'Quản lý Hợp đồng', icon: 'description' },
    ],
  },
  {
    title: 'SINH VIÊN',
    items: [
      { id: 'ho-so-sinh-vien', label: 'Hồ sơ Sinh viên', icon: 'badge' },
      { id: 'lop-va-khoa-vien', label: 'Lớp & Khoa viện', icon: 'domain' },
    ],
  },
  {
    title: 'CƠ SỞ VẬT CHẤT',
    items: [{ id: 'so-do-phong-va-giuong', label: 'Sơ đồ Phòng & Giường', icon: 'meeting_room' }],
  },
  {
    title: 'TÀI CHÍNH & VẬN HÀNH',
    items: [
      { id: 'dien-nuoc-va-dich-vu', label: 'Điện nước & Dịch vụ', icon: 'bolt' },
      { id: 'hoa-don-va-thu-phi', label: 'Hóa đơn & Thu phí', icon: 'receipt_long' },
      { id: 'yeu-cau-sua-chua', label: 'Yêu cầu sửa chữa', icon: 'build' },
      { id: 'vi-pham-va-ky-luat', label: 'Vi phạm & Kỷ luật', icon: 'gavel' },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { id: 'nhan-vien-va-tai-khoan', label: 'Nhân viên & Tài khoản', icon: 'manage_accounts' },
      { id: 'bao-cao-thong-ke', label: 'Báo cáo thống kê', icon: 'bar_chart' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#00163a]/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[#00163a] z-50 flex flex-col justify-between overflow-y-auto select-none shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-space-lg">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between pb-space-lg">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-space-sm text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#dfe8ff] flex items-center justify-center text-[#00163a] font-headline-sm text-headline-sm font-bold tracking-tight shrink-0 shadow-sm transition-transform group-hover:scale-105">
                U2
              </div>
              <div>
                <div className="font-headline-sm text-headline-sm text-white font-bold tracking-tight leading-none">
                  KTX UTC2
                </div>
                <div className="font-label-sm text-[10px] text-[#7a93ca] tracking-wider uppercase mt-0.5 font-semibold">
                  PHÂN HIỆU TP.HCM
                </div>
              </div>
            </button>
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-[#7a93ca] hover:text-white p-1 rounded-lg"
              aria-label="Đóng thanh điều hướng"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-space-md" aria-label="Menu quản lý KTX">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-space-xs">
                <span className="block font-label-sm text-[11px] uppercase tracking-wider text-[#7a93ca] px-space-sm font-semibold select-none">
                  {section.title}
                </span>
                {section.items.map((item) => {
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-space-sm py-2 rounded-lg transition-all text-left font-body-md text-sm ${
                        isActive
                          ? 'bg-[#0b2a5b] text-white font-semibold shadow-xs ring-1 ring-white/10'
                          : 'text-[#7a93ca] hover:bg-[#0b2a5b]/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-space-sm min-w-0">
                        <span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#88a9fd]' : ''}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ba1a1a] text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User Profile Card */}
        <div className="p-space-md mx-space-sm mb-space-sm rounded-xl bg-[#0b2a5b]/40 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#375ba9] text-white flex items-center justify-center font-label-sm text-xs font-semibold shrink-0 shadow-xs">
              NA
            </div>
            <div className="min-w-0">
              <div className="font-label-md text-xs text-white font-medium truncate">
                Nguyễn Văn An
              </div>
              <div className="font-label-sm text-[11px] text-[#7a93ca] truncate">
                Quản lý KTX
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-[#7a93ca] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#0b2a5b]"
            title="Đăng xuất"
            type="button"
            aria-label="Đăng xuất"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
