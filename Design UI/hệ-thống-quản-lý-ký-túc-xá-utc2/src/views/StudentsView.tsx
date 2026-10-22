import React, { useState } from 'react';
import { Student } from '../types';
import { INITIAL_STUDENTS } from '../data/mockData';

interface StudentsViewProps {
  onOpenNewStudent: () => void;
  onSelectStudent: (student: Student) => void;
  onOpenTransferRoom: (student: Student) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenNewStudent,
  onSelectStudent,
  onOpenTransferRoom,
  showToast,
}) => {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [cohortFilter, setCohortFilter] = useState('k64');
  const [majorFilter, setMajorFilter] = useState('cntt');
  const [statusFilter, setStatusFilter] = useState('o');

  const handleResetFilters = () => {
    setSearchTerm('');
    setCohortFilter('');
    setMajorFilter('');
    setStatusFilter('');
    showToast('Đã đặt lại bộ lọc danh sách sinh viên', 'info');
  };

  const filteredStudents = students.filter((s) => {
    if (cohortFilter && cohortFilter !== 'all') {
      if (!s.cohort.toLowerCase().includes(cohortFilter.toLowerCase())) return false;
    }
    if (majorFilter && majorFilter !== 'all') {
      const m = majorFilter.toLowerCase();
      if (!s.major.toLowerCase().includes(m) && !s.className.toLowerCase().includes(m)) return false;
    }
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'o' && s.residenceStatus !== 'Đang ở') return false;
      if (statusFilter === 'tam-vang' && s.residenceStatus !== 'Tạm vắng') return false;
      if (statusFilter === 'da-tra' && s.residenceStatus !== 'Đã trả phòng') return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchMssv = s.mssv.includes(q);
      const matchCccd = s.cccd.includes(q);
      const matchRoom = s.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchMssv && !matchCccd && !matchRoom) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Action & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Quản lý Nội trú</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#0B2A5B] dark:text-blue-400 font-semibold">
              Hồ sơ Sinh viên
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">
            Hồ sơ Sinh viên
          </h1>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => showToast('Mở trình import file danh sách sinh viên Excel (.xlsx / .csv)', 'info')}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">
              upload_file
            </span>
            <span>Nhập Excel</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewStudent}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tiếp nhận SV mới</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tổng sinh viên nội trú
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0B2A5B] dark:text-blue-400">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              3.420
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Đạt 97.4% công suất giường</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full" style={{ width: '97.4%' }} />
          </div>
        </div>

        {/* Metric 2: Khu A (Male) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Nam sinh (Khu A)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
              <span className="material-symbols-outlined text-[20px]">male</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              1.950
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#375ba9]" />
              <span>57% tổng nội trú · Tòa A1, A2, A3</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '57%' }} />
          </div>
        </div>

        {/* Metric 3: Khu B (Female) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Nữ sinh (Khu B)
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <span className="material-symbols-outlined text-[20px]">female</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              1.470
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span>43% tổng nội trú · Tòa B1, B2</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full" style={{ width: '43%' }} />
          </div>
        </div>

        {/* Metric 4: Leave / Temporary */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tạm vắng / Nghỉ phép
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-[20px]">event_busy</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              18
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>0.5% · Cập nhật 15 phút trước</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '8%' }} />
          </div>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, MSSV, CCCD, số phòng..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Khóa */}
          <div className="relative">
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white cursor-pointer focus:outline-none"
            >
              <option value="">Tất cả Khóa</option>
              <option value="k62">Khóa K62</option>
              <option value="k63">Khóa K63</option>
              <option value="k64">Khóa K64</option>
              <option value="k65">Khóa K65</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[16px]">
              expand_more
            </span>
          </div>

          {/* Khoa viện */}
          <div className="relative">
            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white cursor-pointer focus:outline-none"
            >
              <option value="">Tất cả Khoa viện</option>
              <option value="cntt">CNTT</option>
              <option value="cơ khí">Cơ khí</option>
              <option value="kinh tế">Kinh tế vận tải</option>
              <option value="công trình">Công trình</option>
              <option value="điện">Điện - Điện tử</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[16px]">
              expand_more
            </span>
          </div>

          {/* Trạng thái */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white cursor-pointer focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="o">Đang ở</option>
              <option value="tam-vang">Tạm vắng</option>
              <option value="da-tra">Đã trả phòng</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[16px]">
              expand_more
            </span>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-2 rounded-xl border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Đặt lại bộ lọc"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          </button>
        </div>
      </div>

      {/* Student Table Card */}
      <div className="rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">MSSV</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4">Khoa / Lớp</th>
                <th className="py-3.5 px-4">Phòng &amp; Giường</th>
                <th className="py-3.5 px-4">Điện thoại</th>
                <th className="py-3.5 px-4">Quê quán</th>
                <th className="py-3.5 px-4">Thanh toán</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">
                    {s.mssv}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={s.avatarUrl}
                        alt={s.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{s.cccd}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                    {s.className}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-300 font-semibold">
                      <span>{s.roomNumber}</span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span>{s.bedNumber}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {s.phone}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {s.hometown}
                  </td>
                  <td className="py-3.5 px-4">
                    {s.paymentStatus === 'Đủ' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        Đủ
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[11px] font-semibold">
                        Nợ {s.debtAmount ? `${s.debtAmount / 1000}k` : 'phí'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {s.residenceStatus === 'Đang ở' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Đang ở
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        Tạm vắng
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(s)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] dark:hover:text-blue-400 transition-colors"
                        title="Xem hồ sơ"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTransferRoom(s)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] dark:hover:text-blue-400 transition-colors"
                        title="Chuyển phòng"
                      >
                        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast(`Đã ghi nhận yêu cầu đổi giường cho ${s.name}`, 'info')}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] dark:hover:text-blue-400 transition-colors"
                        title="Đổi giường"
                      >
                        <span className="material-symbols-outlined text-[18px]">bed</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-3 bg-slate-50/70 dark:bg-[#0B0F1A]/80 border-t border-slate-200/80 dark:border-[#232B3B] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-slate-400 text-xs">
          <span>
            Hiển thị <strong>1 - {filteredStudents.length}</strong> trong số <strong>3.420</strong> sinh viên nội trú
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0B2A5B] text-white font-semibold text-xs shadow-2xs"
            >
              1
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              2
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              570
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
