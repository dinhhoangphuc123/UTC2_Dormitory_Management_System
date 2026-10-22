import React, { useState } from 'react';
import { Room, Student } from '../types';
import { INITIAL_STUDENTS, generateRooms } from '../data/mockData';

interface RoomsViewProps {
  onOpenNewRoom: () => void;
  onSelectStudent: (student: Student) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  onOpenNewRoom,
  onSelectStudent,
  showToast,
}) => {
  const [viewMode, setViewMode] = useState<'roster' | 'grid'>('roster');
  const [rooms, setRooms] = useState<Room[]>(() => generateRooms());
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  // Filters state
  const [selectedBuilding, setSelectedBuilding] = useState('Tòa A01');
  const [selectedFloor, setSelectedFloor] = useState('Tầng 1');
  const [selectedRoomNum, setSelectedRoomNum] = useState('Phòng: Tất cả');
  const [selectedCohort, setSelectedCohort] = useState('Khóa K64');
  const [selectedMajor, setSelectedMajor] = useState('CNTT');
  const [selectedStatus, setSelectedStatus] = useState('Đang ở');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected room for detailed bed layout inspector
  const [inspectingRoom, setInspectingRoom] = useState<Room | null>(null);

  const handleResetFilters = () => {
    setSelectedBuilding('Tòa: Tất cả');
    setSelectedFloor('Tầng: Tất cả');
    setSelectedRoomNum('Phòng: Tất cả');
    setSelectedCohort('Khóa: Tất cả');
    setSelectedMajor('Ngành: Tất cả');
    setSelectedStatus('Trạng thái: Tất cả');
    setSearchTerm('');
    showToast('Đã đặt lại bộ lọc buồng phòng', 'info');
  };

  const handleApplyFilters = () => {
    showToast('Đã áp dụng các điều kiện lọc buồng phòng', 'info');
  };

  const handleToggleBedMaintenance = (bedIndex: number) => {
    if (!inspectingRoom) return;
    const updatedBeds = inspectingRoom.beds.map((b, i) => {
      if (i === bedIndex) {
        return {
          ...b,
          status: (b.status === 'Bảo trì' ? 'Giường trống' : 'Bảo trì') as 'Bảo trì' | 'Giường trống',
        };
      }
      return b;
    });

    const updatedRoom = { ...inspectingRoom, beds: updatedBeds };
    setInspectingRoom(updatedRoom);
    setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    showToast(`Đã cập nhật trạng thái giường G${bedIndex + 1}`, 'success');
  };

  // Filtered students for roster table
  const filteredStudents = students.filter((s) => {
    if (selectedBuilding !== 'Tòa: Tất cả') {
      const bKey = selectedBuilding.replace('Tòa ', '');
      if (!s.buildingId.includes(bKey) && !s.roomNumber.startsWith(bKey.substring(0, 1))) return false;
    }
    if (selectedFloor !== 'Tầng: Tất cả') {
      const fNum = parseInt(selectedFloor.replace('Tầng ', ''), 10);
      if (s.floor !== fNum) return false;
    }
    if (selectedCohort !== 'Khóa: Tất cả') {
      const c = selectedCohort.replace('Khóa ', '');
      if (!s.cohort.includes(c)) return false;
    }
    if (selectedMajor !== 'Ngành: Tất cả') {
      if (!s.major.toLowerCase().includes(selectedMajor.toLowerCase()) && !s.className.toLowerCase().includes(selectedMajor.toLowerCase())) return false;
    }
    if (selectedStatus !== 'Trạng thái: Tất cả') {
      if (selectedStatus === 'Đang ở' && s.residenceStatus !== 'Đang ở') return false;
      if (selectedStatus === 'Tạm vắng' && s.residenceStatus !== 'Tạm vắng') return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchMssv = s.mssv.includes(q);
      const matchRoom = s.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchMssv && !matchRoom) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0B2A5B] dark:bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[22px]">domain</span>
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-headline">
              Sơ đồ Phòng &amp; Giường
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phân hiệu TP.HCM · Quản lý buồng phòng &amp; hồ sơ cư xá
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => showToast('Đang trích xuất dữ liệu buồng phòng ra file Excel (.xlsx)...', 'success')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs font-semibold border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">
              table_view
            </span>
            <span>Xuất file Excel</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white shadow-sm transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Thêm phòng mới</span>
          </button>
        </div>
      </div>

      {/* Compact Metric Stats (5 items) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
        {/* Total Rooms */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0B2A5B] dark:text-blue-400 shrink-0">
            <span className="material-symbols-outlined text-[20px]">meeting_room</span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#0B2A5B] dark:text-white leading-none">48</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">Tổng phòng</div>
          </div>
        </div>

        {/* Total Beds */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0B2A5B] dark:text-blue-400 shrink-0">
            <span className="material-symbols-outlined text-[20px]">bed</span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#0B2A5B] dark:text-white leading-none">384</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">Tổng giường</div>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[#375ba9] dark:text-blue-300 shrink-0">
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-[#375ba9] dark:text-blue-300 leading-none">342</span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">89%</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">Đang ở</div>
          </div>
        </div>

        {/* Available Beds */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
            <span className="material-symbols-outlined text-[20px]">airline_seat_individual_suite</span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-300 leading-none">38</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">Còn trống</div>
          </div>
        </div>

        {/* Maintenance Beds */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
            <span className="material-symbols-outlined text-[20px]">build</span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-none">4</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">Bảo trì</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar (Matching screenshot) */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
          {/* Tòa */}
          <div className="relative w-full">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Tòa: Tất cả</option>
              <option>Tòa A01</option>
              <option>Tòa A02</option>
              <option>Tòa A03</option>
              <option>Tòa B01</option>
              <option>Tòa B02</option>
              <option>Tòa C01</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* Tầng */}
          <div className="relative w-full">
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Tầng: Tất cả</option>
              <option>Tầng 1</option>
              <option>Tầng 2</option>
              <option>Tầng 3</option>
              <option>Tầng 4</option>
              <option>Tầng 5</option>
              <option>Tầng 6</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* Phòng */}
          <div className="relative w-full">
            <select
              value={selectedRoomNum}
              onChange={(e) => setSelectedRoomNum(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Phòng: Tất cả</option>
              <option>Phòng 101</option>
              <option>Phòng 102</option>
              <option>Phòng 103</option>
              <option>Phòng 104</option>
              <option>Phòng 105</option>
              <option>Phòng 106</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* Khóa */}
          <div className="relative w-full">
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Khóa: Tất cả</option>
              <option>Khóa K64</option>
              <option>Khóa K63</option>
              <option>Khóa K62</option>
              <option>Khóa K61</option>
              <option>Khóa K65</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* Ngành */}
          <div className="relative w-full">
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Ngành: Tất cả</option>
              <option>CNTT</option>
              <option>Kỹ thuật Cơ khí</option>
              <option>Kinh tế Vận tải</option>
              <option>Kỹ thuật Xây dựng</option>
              <option>Logistics</option>
              <option>Điện - Điện tử</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* Trạng thái */}
          <div className="relative w-full">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232B3B] appearance-none focus:outline-none cursor-pointer"
            >
              <option>Trạng thái: Tất cả</option>
              <option>Đang ở</option>
              <option>Giường trống</option>
              <option>Tạm vắng</option>
              <option>Bảo trì</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>
        </div>

        {/* Search input + Apply + Reset */}
        <div className="flex items-center gap-2.5 w-full">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên SV, MSSV, CCCD, số phòng..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 border border-slate-200 dark:border-[#232B3B] focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="h-10 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Áp dụng</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium border border-slate-200 dark:border-slate-700"
              title="Đặt lại bộ lọc"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Switch Tabs & Quick View Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('roster')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'roster'
                ? 'bg-[#0B2A5B] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">badge</span>
            <span>Toàn bộ danh sách sinh viên KTX</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">3.420</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-[#0B2A5B] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">grid_view</span>
            <span>Sơ đồ buồng phòng (Grid)</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#375ba9]" /> Đang ở (342)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Giường trống (38)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bảo trì (4)
          </span>
        </div>
      </div>

      {/* View 1: Roster Table */}
      {viewMode === 'roster' && (
        <div className="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">MSSV</th>
                  <th className="py-3.5 px-4 font-semibold">Họ và tên sinh viên</th>
                  <th className="py-3.5 px-3 font-semibold">Giới tính / Khóa</th>
                  <th className="py-3.5 px-3 font-semibold">Tòa / Tầng</th>
                  <th className="py-3.5 px-3 font-semibold">Phòng</th>
                  <th className="py-3.5 px-3 font-semibold">Vị trí giường</th>
                  <th className="py-3.5 px-3 font-semibold">Ngày vào</th>
                  <th className="py-3.5 px-3 font-semibold">Học phí / KTX</th>
                  <th className="py-3.5 px-3 font-semibold">Tình trạng</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">
                      {s.mssv}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-[190px]">
                        <img
                          src={s.avatarUrl}
                          alt={s.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white leading-tight truncate">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{s.className}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            s.gender === 'Nam'
                              ? 'bg-blue-100 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                          }`}
                        >
                          {s.gender}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{s.cohort}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      Tòa {s.buildingId} · Tầng {s.floor}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-slate-100 dark:bg-slate-800 text-[#0B2A5B] dark:text-white">
                        {s.roomNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#375ba9] dark:text-blue-300 font-mono font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#375ba9]" />
                        {s.bedNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {s.admissionDate}
                    </td>
                    <td className="py-3.5 px-3">
                      {s.paymentStatus === 'Đủ' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Đã đóng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          Nợ phí
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          s.residenceStatus === 'Đang ở'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {s.residenceStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => showToast(`Mở hoán đổi giường cho ${s.name}`, 'info')}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] transition-colors"
                          title="Đổi giường"
                        >
                          <span className="material-symbols-outlined text-[17px]">swap_horiz</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectStudent(s)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] transition-colors"
                          title="Xem hồ sơ"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast(`Đã lập biên bản trả phòng cho ${s.name}`, 'info')}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 transition-colors"
                          title="Trả phòng"
                        >
                          <span className="material-symbols-outlined text-[17px]">logout</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-[#0B0F1A]/80 border-t border-slate-200/80 dark:border-[#232B3B] gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Hiển thị</span>
              <select className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-xs focus:outline-none">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <span>
                trên tổng số <strong className="text-slate-900 dark:text-white font-semibold">3.420</strong> sinh viên
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0B2A5B] text-white font-bold text-xs shadow-2xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs"
              >
                2
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs"
              >
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs"
              >
                342
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Interactive Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {['A01', 'A02', 'B01', 'B02', 'C01'].map((bId) => {
            const buildingRooms = rooms.filter((r) => r.buildingId === bId);
            if (buildingRooms.length === 0) return null;
            return (
              <div
                key={bId}
                className="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0B2A5B] dark:text-blue-400 text-[20px]">
                      apartment
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {buildingRooms[0].buildingName} ({buildingRooms[0].gender === 'Nam' ? 'Khu Nam' : 'Khu Nữ'})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {buildingRooms.length} phòng · 8 giường/phòng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {buildingRooms.map((r) => {
                    const isFull = r.occupied === r.capacity;
                    const hasMaintenance = r.beds.some((b) => b.status === 'Bảo trì');
                    return (
                      <div
                        key={r.id}
                        onClick={() => setInspectingRoom(r)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                          hasMaintenance
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                            : isFull
                            ? 'bg-slate-50/80 dark:bg-[#0B0F1A] border-slate-200 dark:border-[#232B3B]'
                            : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            P.{r.roomNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              hasMaintenance
                                ? 'bg-amber-100 text-amber-800'
                                : isFull
                                ? 'bg-blue-100 text-[#0B2A5B]'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {hasMaintenance ? 'Bảo trì' : `${r.occupied}/${r.capacity} chỗ`}
                          </span>
                        </div>

                        {/* 8 mini bed indicators */}
                        <div className="grid grid-cols-4 gap-1.5 my-2">
                          {r.beds.map((b) => (
                            <div
                              key={b.id}
                              className={`h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                                b.status === 'Đang ở'
                                  ? 'bg-[#0B2A5B] text-white'
                                  : b.status === 'Bảo trì'
                                  ? 'bg-amber-400 text-amber-950'
                                  : 'bg-emerald-200 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                              }`}
                              title={`${b.bedNumber}: ${b.status}`}
                            >
                              {b.bedNumber}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                          <span>Tầng {r.floor}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Intl.NumberFormat('vi-VN').format(r.pricePerMonth)} đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Room Modal (Showing 8 Beds & Occupant Details) */}
      {inspectingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-300 flex items-center justify-center font-bold">
                  {inspectingRoom.roomNumber}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chi tiết buồng phòng: {inspectingRoom.roomNumber} ({inspectingRoom.buildingName})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tầng {inspectingRoom.floor} · {inspectingRoom.roomType} · Dành cho {inspectingRoom.gender}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingRoom(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <span>
                  Đang ở: <strong>{inspectingRoom.occupied}</strong> / {inspectingRoom.capacity} giường
                </span>
                <span>
                  Giá phòng:{' '}
                  <strong className="text-[#0B2A5B] dark:text-blue-400">
                    {new Intl.NumberFormat('vi-VN').format(inspectingRoom.pricePerMonth)} đ/tháng/SV
                  </strong>
                </span>
                <span className="text-emerald-600 font-semibold">Trang bị: 2 Quạt trần, 1 Máy lạnh, 8 Bàn học</span>
              </div>

              {/* 8 Bed Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {inspectingRoom.beds.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      b.status === 'Đang ở'
                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20'
                        : b.status === 'Bảo trì'
                        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow-2xs flex items-center justify-center font-mono font-bold text-[#0B2A5B] dark:text-blue-300">
                        {b.bedNumber}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {b.status === 'Đang ở' ? b.studentName || 'Sinh viên nội trú' : b.status}
                        </div>
                        {b.mssv && <div className="text-[10px] text-slate-400 font-mono">MSSV: {b.mssv}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {b.status === 'Giường trống' ? (
                        <button
                          type="button"
                          onClick={() => showToast(`Chọn xếp sinh viên vào giường ${b.bedNumber}`, 'info')}
                          className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold"
                        >
                          Xếp SV
                        </button>
                      ) : b.status === 'Bảo trì' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBedMaintenance(idx)}
                          className="px-2 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold"
                        >
                          Mở lại
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleBedMaintenance(idx)}
                          className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] hover:text-amber-600"
                          title="Báo hỏng/bảo trì giường này"
                        >
                          Bảo trì
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Đã in sơ đồ buồng phòng ${inspectingRoom.roomNumber} ra file PDF`, 'success');
                  setInspectingRoom(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                In sơ đồ phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
