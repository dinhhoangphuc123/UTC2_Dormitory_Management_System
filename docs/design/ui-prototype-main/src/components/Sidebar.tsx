import React from 'react';
import { TabType, UserProfile } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: UserProfile;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'grid_view' },
      ],
    },
    {
      title: 'ĐĂNG KÝ & NỘI TRÚ',
      items: [
        { id: 'don-dang-ky' as TabType, label: 'Đợt & Đơn đăng ký', icon: 'how_to_reg' },
        { id: 'hop-dong' as TabType, label: 'Quản lý Hợp đồng', icon: 'edit_document' },
      ],
    },
    {
      title: 'SINH VIÊN',
      items: [
        { id: 'sinh-vien' as TabType, label: 'Hồ sơ Sinh viên', icon: 'badge' },
        { id: 'lop-khoa' as TabType, label: 'Lớp & Khoa viện', icon: 'school' },
      ],
    },
    {
      title: 'CƠ SỞ VẬT CHẤT',
      items: [
        { id: 'phong-va-giuong' as TabType, label: 'Sơ đồ Phòng & Giường', icon: 'domain' },
      ],
    },
    {
      title: 'TÀI CHÍNH & VẬN HÀNH',
      items: [
        { id: 'dien-nuoc-dich-vu' as TabType, label: 'Điện nước & Dịch vụ', icon: 'water_drop' },
        { id: 'hoa-don' as TabType, label: 'Hóa đơn & Thu phí', icon: 'receipt_long' },
        { id: 'sua-chua' as TabType, label: 'Yêu cầu sửa chữa', icon: 'build' },
        { id: 'vi-pham' as TabType, label: 'Vi phạm & Kỷ luật', icon: 'gavel' },
      ],
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'nhan-vien-tai-khoan' as TabType, label: 'Nhân viên & Tài khoản', icon: 'manage_accounts' },
        { id: 'bao-cao' as TabType, label: 'Báo cáo thống kê', icon: 'bar_chart' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-[#081B33] border-r border-[#152a4a] z-50 flex flex-col justify-between overflow-hidden transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full bg-[#0a1628]">
          {/* Header Logo & Branding */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-[#13325c] flex items-center justify-center shrink-0 border border-blue-400/20 shadow-xs">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">apartment</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-white tracking-wide truncate leading-tight">
                  KTX UTC2
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate mt-0.5">
                  PHÂN HIỆU TP.HCM
                </span>
              </div>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              title="Đóng menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Navigation Menu List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-[#0e3b78] text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[19px] ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[13px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom User Profile Card */}
          <div className="p-3 bg-[#0a1628] shrink-0 border-t border-white/5">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0f213b] border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#001946] flex items-center justify-center shrink-0 border border-blue-500/30 overflow-hidden text-blue-300">
                  {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[12px] font-semibold text-white truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors shrink-0"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
