import React, { useState } from 'react';
import { TabType, UrgentTask } from '../types';
import { INITIAL_URGENT_TASKS } from '../data/mockData';

interface DashboardViewProps {
  onNavigate: (tab: TabType) => void;
  onOpenNewContract: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewContract,
  showToast,
}) => {
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>(INITIAL_URGENT_TASKS);
  const [selectedTask, setSelectedTask] = useState<UrgentTask | null>(null);

  const handleActionTask = (task: UrgentTask) => {
    if (task.type === 'application') {
      setUrgentTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
      );
      showToast(`Đã duyệt đơn đăng ký của ${task.title}! Đang tạo hồ sơ hợp đồng.`, 'success');
    } else if (task.type === 'repair') {
      setUrgentTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
      );
      showToast(`Đã điều phối đội kỹ thuật điện nước đến ${task.subtitle}!`, 'info');
    } else if (task.type === 'debt') {
      showToast(`Đã gửi thông báo nhắc nợ tự động đến đại diện ${task.tag}`, 'info');
    } else if (task.type === 'checkout') {
      onNavigate('phong-va-giuong');
      showToast(`Chuyển đến sơ đồ phòng kiểm tra thủ tục trả phòng của ${task.title}`, 'info');
    } else {
      setSelectedTask(task);
    }
  };

  const activeTaskCount = urgentTasks.filter((t) => !t.completed).length;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* 1. KHỐI CHÀO MỪNG CÔ ĐỌNG */}
      <section className="bg-[#0b2a5b] dark:bg-[#071A38] text-white rounded-2xl p-6 lg:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-headline">
              Tổng quan KTX
            </h1>
            <p className="text-blue-200/80 text-xs">
              Hệ thống quản lý thời gian thực Ký túc xá Phân hiệu UTC2 TP.HCM
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenNewContract}
              className="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">post_add</span>
              <span>Lập hợp đồng mới</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Đã trích xuất báo cáo nhanh KTX dạng file PDF/Excel!', 'success')}
              className="h-10 px-4 rounded-xl bg-[#00163a] text-white font-semibold text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/20"
            >
              <span className="material-symbols-outlined text-[18px]">ios_share</span>
              <span>Báo cáo nhanh</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. HÀNG 4 CHỈ SỐ KPI CỐT LÕI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sinh viên nội trú */}
        <div
          onClick={() => onNavigate('sinh-vien')}
          className="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">
              SINH VIÊN NỘI TRÚ
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              3.420{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">sinh viên</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[#375ba9] dark:text-blue-400 font-semibold">
              3.800 giường · 90%
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* KPI 2: Thu phí tháng */}
        <div
          onClick={() => onNavigate('hoa-don')}
          className="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">
              THU PHÍ THÁNG
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-blue-300 tracking-tight">
              1,28 <span className="text-xl font-semibold">Tỷ đ</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[#375ba9] dark:text-blue-400 font-semibold">Đã thu 86%</span>
            <span className="text-red-600 dark:text-red-400 font-semibold">Nợ 210 Tr đ</span>
          </div>
        </div>

        {/* KPI 3: Đơn chờ duyệt */}
        <div
          onClick={() => onNavigate('don-dang-ky')}
          className="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">
              ĐƠN CHỜ DUYỆT
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              48{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">hồ sơ</span>
            </div>
          </div>
          <div className="text-xs text-[#375ba9] dark:text-blue-400 flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
            <span>Ưu tiên xét duyệt →</span>
          </div>
        </div>

        {/* KPI 4: Yêu cầu sửa chữa */}
        <div
          onClick={() => showToast('Mở trung tâm điều phối kỹ thuật & bảo trì sự cố', 'info')}
          className="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">
              YÊU CẦU SỬA CHỮA
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined text-[18px]">build</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400 tracking-tight">
              12{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">yêu cầu</span>
            </div>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
            <span>Điều phối kỹ thuật →</span>
          </div>
        </div>
      </section>

      {/* 3. KHỐI TRỌNG TÂM: CÔNG SUẤT, THU TÀI CHÍNH & HÀNH ĐỘNG CẦN XỬ LÝ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Phân khu & Tài chính */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Công suất lấp đầy phân khu */}
          <div className="bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] dark:text-blue-400 text-[20px]">
                  analytics
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Công suất lấp đầy phân khu
                </h2>
              </div>
              <span className="text-xs text-[#0B2A5B] dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/40 dark:border-blue-800/40">
                Tổng: 90%
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Khu A */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Khu A (Nam sinh)
                  </span>
                  <span className="font-bold text-[#0B2A5B] dark:text-blue-400">
                    96% <span className="font-normal text-slate-400 text-[11px]">(960/1.000)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: '96%' }}
                  />
                </div>
              </div>

              {/* Khu B */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Khu B (Nữ sinh)
                  </span>
                  <span className="font-bold text-[#0B2A5B] dark:text-blue-400">
                    94% <span className="font-normal text-slate-400 text-[11px]">(940/1.000)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: '94%' }}
                  />
                </div>
              </div>

              {/* Khu C */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Khu C (Chất lượng cao)
                  </span>
                  <span className="font-bold text-[#375ba9] dark:text-blue-400">
                    82% <span className="font-normal text-slate-400 text-[11px]">(820/1.000)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#375ba9] dark:bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: '82%' }}
                  />
                </div>
              </div>

              {/* Khu D */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Khu D (Nội trú quốc tế & Kỹ sư)
                  </span>
                  <span className="font-bold text-[#375ba9] dark:text-blue-400">
                    88% <span className="font-normal text-slate-400 text-[11px]">(700/800)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#375ba9] dark:bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: '88%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Tiến độ thu tài chính & Dịch vụ */}
          <div className="bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] dark:text-blue-400 text-[20px]">
                  account_balance_wallet
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Tiến độ thu tài chính & Dịch vụ
                </h2>
              </div>
              <span className="text-xs text-[#375ba9] dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                Tỷ lệ thu 86%
              </span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                    Kế hoạch
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    1,49 Tỷ
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[11px] text-[#0B2A5B] dark:text-blue-400 block uppercase tracking-wider font-semibold">
                    Đã thu
                  </span>
                  <span className="text-xl font-bold text-[#0B2A5B] dark:text-blue-300 mt-1 block">
                    1,28 Tỷ
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                  <span className="text-[11px] text-red-600 dark:text-red-400 block uppercase tracking-wider font-semibold">
                    Còn nợ
                  </span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400 mt-1 block">
                    210 Tr
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full" style={{ width: '86%' }} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Đã hoàn thành 86% chỉ tiêu tháng</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('hoa-don')}
                    className="text-[#375ba9] dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    Xem hóa đơn
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Cần xử lý ngay */}
        <div className="lg:col-span-5 bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cần xử lý ngay
                </h2>
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 flex items-center justify-center text-xs font-bold">
                  {activeTaskCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('don-dang-ky')}
                className="text-xs text-[#375ba9] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                Xem tất cả
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`py-3 flex items-center justify-between gap-3 transition-opacity ${
                    task.completed ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        task.tagType === 'error'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                          : task.tagType === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[19px]">{task.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            task.tagType === 'error'
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              : task.tagType === 'warning'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {task.tag}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                        {task.subtitle}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={task.completed}
                    onClick={() => handleActionTask(task)}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      task.tagType === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : task.tagType === 'warning'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-[#0B2A5B] text-white hover:bg-[#143F8C]'
                    } disabled:opacity-50`}
                  >
                    {task.completed ? 'Đã xong' : task.actionText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Task detail modal if selected */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Chi tiết: {selectedTask.title}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <strong>Vị trí/Đối tượng:</strong> {selectedTask.tag}
              </p>
              <p>
                <strong>Nội dung ghi nhận:</strong> {selectedTask.subtitle}
              </p>
              <p className="text-slate-500">
                Biên bản ghi nhận vi phạm đã được chuyển sang tổ an ninh KTX và ban quản lý tầng.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setUrgentTasks((prev) =>
                    prev.map((t) => (t.id === selectedTask.id ? { ...t, completed: true } : t))
                  );
                  setSelectedTask(null);
                  showToast('Đã xử lý biên bản vi phạm!', 'success');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0B2A5B] text-white text-xs font-semibold"
              >
                Đã xử lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
