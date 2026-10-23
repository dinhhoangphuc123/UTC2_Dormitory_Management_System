import React, { useState } from 'react';
import { Sidebar, ScreenId } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ClassesScreen } from './components/screens/ClassesScreen.tsx';
import { UtilitiesScreen } from './components/screens/UtilitiesScreen.tsx';
import { InvoicesScreen } from './components/screens/InvoicesScreen.tsx';
import { MaintenanceScreen } from './components/screens/MaintenanceScreen.tsx';
import { DisciplineScreen } from './components/screens/DisciplineScreen.tsx';
import { StaffScreen } from './components/screens/StaffScreen.tsx';
import { ReportsScreen } from './components/screens/ReportsScreen.tsx';
import { DashboardScreen } from './components/screens/DashboardScreen.tsx';
import { GenericSubScreen } from './components/screens/GenericSubScreen.tsx';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('lop-va-khoa-vien');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [semester, setSemester] = useState('Năm học 2026-2027 · HK1');
  const [globalSearch, setGlobalSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  const handleLogout = () => {
    showToast('Đã đăng xuất khỏi tài khoản Quản lý KTX Nguyễn Văn An.');
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'lop-va-khoa-vien':
        return <ClassesScreen onShowToast={showToast} />;
      case 'dien-nuoc-va-dich-vu':
        return <UtilitiesScreen onShowToast={showToast} />;
      case 'hoa-don-va-thu-phi':
        return <InvoicesScreen onShowToast={showToast} />;
      case 'yeu-cau-sua-chua':
        return <MaintenanceScreen onShowToast={showToast} />;
      case 'vi-pham-va-ky-luat':
        return <DisciplineScreen onShowToast={showToast} />;
      case 'nhan-vien-va-tai-khoan':
        return <StaffScreen onShowToast={showToast} />;
      case 'bao-cao-thong-ke':
        return <ReportsScreen onShowToast={showToast} />;
      case 'dashboard':
        return <DashboardScreen onNavigate={setCurrentScreen} onShowToast={showToast} />;
      case 'dot-va-don-dang-ky':
      case 'quan-ly-hop-dong':
      case 'ho-so-sinh-vien':
      case 'so-do-phong-va-giuong':
      default:
        return (
          <GenericSubScreen
            screenId={currentScreen}
            onNavigate={setCurrentScreen}
            onShowToast={showToast}
          />
        );
    }
  };

  return (
    <div className="bg-[#f9f9ff] font-body-md text-[#111c2d] min-h-screen antialiased selection:bg-[#375ba9]/20 selection:text-[#00163a]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          semester={semester}
          onSemesterChange={setSemester}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onQuickNavigate={(screen) => setCurrentScreen(screen as ScreenId)}
        />

        {/* Dynamic Route Content */}
        <main className="relative pt-20 px-4 sm:px-gutter pb-space-2xl flex-1 max-w-7xl w-full mx-auto">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 bg-[#00163a] text-white px-space-md py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-label-md text-xs border border-white/10 max-w-md">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span className="flex-1">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:text-white/80 text-white/50 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
