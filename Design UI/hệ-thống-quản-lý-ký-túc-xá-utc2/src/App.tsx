import React, { useState, useEffect } from 'react';
import { TabType, UserProfile, Student, Contract } from './types';
import { DEMO_USERS, INITIAL_STUDENTS, INITIAL_CONTRACTS, generateRooms } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ContractsView } from './views/ContractsView';
import { StudentsView } from './views/StudentsView';
import { AdmissionsView } from './views/AdmissionsView';
import { RoomsView } from './views/RoomsView';
import {
  NewContractModal,
  StudentDetailModal,
  PrintContractModal,
} from './components/Modals';

interface ToastState {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('utc2_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.username && DEMO_USERS[parsed.username]) {
          return DEMO_USERS[parsed.username];
        }
      } catch {
        // fallback
      }
    }
    // Default to Quản lý KTX as in the prompt mockups
    return DEMO_USERS.ql_an;
  });

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('utc2_dorm_theme') === 'dark';
  });

  const [selectedSemester, setSelectedSemester] = useState('Năm học 2026-2027 · HK1');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Modals state
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<Contract | null>(null);

  // Sync dark mode with <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('utc2_dorm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('utc2_dorm_theme', 'light');
    }
  }, [darkMode]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('utc2_current_user', JSON.stringify(user));
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('utc2_current_user');
    showToast('Đã đăng xuất khỏi phiên làm việc', 'info');
  };

  const handleSwitchUser = (username: string) => {
    const user = DEMO_USERS[username];
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('utc2_current_user', JSON.stringify(user));
      showToast(`Đã chuyển sang tài khoản: ${user.name} (${user.role})`, 'success');
    }
  };

  // If user is not logged in, render the login screen
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Fixed Top Header */}
        <TopNav
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileMenu={() => setIsOpenMobile(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          selectedSemester={selectedSemester}
          onSelectSemester={setSelectedSemester}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onOpenNewContract={() => setIsNewContractOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'don-dang-ky' && (
            <AdmissionsView
              onOpenNewRound={() => showToast('Mở form tạo đợt đăng ký mới cho kỳ tiếp theo', 'info')}
              showToast={showToast}
            />
          )}

          {currentTab === 'hop-dong' && (
            <ContractsView
              onOpenNewContract={() => setIsNewContractOpen(true)}
              onOpenRenewContract={(c) => {
                showToast(`Gia hạn hợp đồng ${c.contractNumber} thêm 1 học kỳ thành công!`, 'success');
              }}
              onOpenPrintContract={(c) => setSelectedContractForPrint(c)}
              showToast={showToast}
            />
          )}

          {currentTab === 'sinh-vien' && (
            <StudentsView
              onOpenNewStudent={() => showToast('Mở biểu mẫu tiếp nhận sinh viên mới vào KTX', 'info')}
              onSelectStudent={(s) => setSelectedStudentForDetail(s)}
              onOpenTransferRoom={(s) => {
                showToast(`Điều chuyển phòng cho sinh viên ${s.name}`, 'info');
              }}
              showToast={showToast}
            />
          )}

          {currentTab === 'phong-va-giuong' && (
            <RoomsView
              onOpenNewRoom={() => showToast('Mở cửa sổ cấu hình thêm phòng buồng mới', 'info')}
              onSelectStudent={(s) => setSelectedStudentForDetail(s)}
              showToast={showToast}
            />
          )}

          {/* Secondary tabs fallback / placeholder views with rich enterprise message */}
          {['lop-khoa', 'dien-nuoc-dich-vu', 'hoa-don', 'sua-chua', 'vi-pham', 'nhan-vien-tai-khoan', 'bao-cao'].includes(
            currentTab
          ) && (
            <div className="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-slate-200 dark:border-[#232B3B] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-400 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">
                  {currentTab === 'lop-khoa'
                    ? 'school'
                    : currentTab === 'dien-nuoc-dich-vu'
                    ? 'water_drop'
                    : currentTab === 'hoa-don'
                    ? 'receipt_long'
                    : currentTab === 'sua-chua'
                    ? 'build'
                    : currentTab === 'vi-pham'
                    ? 'gavel'
                    : currentTab === 'nhan-vien-tai-khoan'
                    ? 'manage_accounts'
                    : 'bar_chart'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                {currentTab.replace(/-/g, ' ')}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Mô-đun đang đồng bộ dữ liệu thời gian thực từ máy chủ Phân hiệu UTC2. Bạn có thể
                quay lại Dashboard hoặc truy cập 4 phân hệ chính: <strong>Hồ sơ sinh viên</strong>,{' '}
                <strong>Quản lý hợp đồng</strong>, <strong>Đợt &amp; đơn đăng ký</strong>, và{' '}
                <strong>Sơ đồ buồng phòng</strong>.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all"
                >
                  Quay lại Dashboard Tổng quan
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        students={INITIAL_STUDENTS}
        contracts={INITIAL_CONTRACTS}
        rooms={generateRooms()}
        onNavigate={(tab) => setCurrentTab(tab)}
        onSelectStudent={(s) => setSelectedStudentForDetail(s)}
        onSelectContract={(c) => setSelectedContractForPrint(c)}
      />

      {/* Modals */}
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        onSave={() => {
          showToast('Đã ban hành hợp đồng nội trú mới thành công!', 'success');
        }}
      />

      <StudentDetailModal
        student={selectedStudentForDetail}
        onClose={() => setSelectedStudentForDetail(null)}
        onTransfer={(s) => {
          showToast(`Đã ghi nhận yêu cầu điều chuyển phòng cho ${s.name}`, 'info');
        }}
      />

      <PrintContractModal
        contract={selectedContractForPrint}
        onClose={() => setSelectedContractForPrint(null)}
      />

      {/* Global Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all animate-bounce-in ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : t.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-[#0B2A5B] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
