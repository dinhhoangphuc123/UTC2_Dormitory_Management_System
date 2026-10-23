import React, { useState, useMemo } from 'react';
import { INITIAL_TICKETS, TicketItemData } from '../../data/mockData.ts';

interface MaintenanceScreenProps {
  onShowToast: (msg: string) => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onShowToast }) => {
  const [tickets, setTickets] = useState<TicketItemData[]>(INITIAL_TICKETS);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState<TicketItemData | null>(null);
  const [viewingTicket, setViewingTicket] = useState<TicketItemData | null>(null);

  // Create form state
  const [newBuilding, setNewBuilding] = useState('A2');
  const [newRoom, setNewRoom] = useState('');
  const [newCategory, setNewCategory] = useState<TicketItemData['category']>('Điện dân dụng');
  const [newPriority, setNewPriority] = useState<'Khẩn cấp' | 'Bình thường'>('Bình thường');
  const [newReporter, setNewReporter] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Assign form state
  const [selectedTech, setSelectedTech] = useState('Phạm Thành');
  const [estimatedDeadline, setEstimatedDeadline] = useState('Trong ngày hôm nay');

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBld = !buildingFilter || t.building === buildingFilter;
      const matchCat = !categoryFilter || t.category === categoryFilter;
      const matchPri = !priorityFilter || t.priority === priorityFilter;
      const matchStatus = statusTab === 'ALL' || t.status === statusTab;

      return matchSearch && matchBld && matchCat && matchPri && matchStatus;
    });
  }, [tickets, searchTerm, buildingFilter, categoryFilter, priorityFilter, statusTab]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim() || !newReporter.trim() || !newDesc.trim()) {
      onShowToast('Vui lòng điền đầy đủ số phòng, người báo và mô tả!');
      return;
    }

    const nextCodeNum = tickets.length + 2602;
    const newTicket: TicketItemData = {
      id: 't_' + Date.now(),
      code: `SC-${nextCodeNum}`,
      room: `${newBuilding}-${newRoom.trim()}`,
      building: newBuilding,
      category: newCategory,
      title: newDesc.slice(0, 48),
      description: newDesc,
      reporter: newReporter.trim(),
      phone: newPhone.trim() || '0900.000.000',
      technician: null,
      priority: newPriority,
      status: 'PENDING',
      createdAt: new Date().toLocaleDateString('vi-VN') + ' 09:00',
    };

    setTickets([newTicket, ...tickets]);
    setIsCreateModalOpen(false);
    // Reset form
    setNewRoom('');
    setNewReporter('');
    setNewPhone('');
    setNewDesc('');
    onShowToast(`Đã tạo thành công phiếu báo hỏng ${newTicket.code}!`);
  };

  const handleConfirmAssign = () => {
    if (!assigningTicket) return;

    const updated = tickets.map((t) => {
      if (t.id === assigningTicket.id) {
        return {
          ...t,
          technician: selectedTech,
          status: 'IN_PROGRESS' as const,
        };
      }
      return t;
    });

    setTickets(updated);
    setAssigningTicket(null);
    onShowToast(`Đã điều phối kỹ thuật viên ${selectedTech} xử lý phiếu ${assigningTicket.code} (${estimatedDeadline})!`);
  };

  const handleCloseTicket = (ticket: TicketItemData) => {
    if (window.confirm(`Xác nhận nghiệm thu & đóng phiếu bảo trì ${ticket.code} tại phòng ${ticket.room}?`)) {
      const updated = tickets.map((t) => {
        if (t.id === ticket.id) {
          return {
            ...t,
            status: 'COMPLETED' as const,
          };
        }
        return t;
      });
      setTickets(updated);
      onShowToast(`Đã đóng phiếu ${ticket.code} thành công.`);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setBuildingFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setStatusTab('ALL');
  };

  const pendingCount = tickets.filter((t) => t.status === 'PENDING').length + 10;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length + 24;
  const completedCount = tickets.filter((t) => t.status === 'COMPLETED').length + 28;
  const totalCount = pendingCount + inProgressCount + completedCount;

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Top Command & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-xs">
        <div>
          <div className="flex items-center gap-space-xs text-[#375ba9] font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            <span>Vận hành kỹ thuật</span>
            <span>/</span>
            <span className="text-[#44474f]">Phân hiệu TP.HCM</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#00163a] tracking-tight mt-0.5 font-bold">
            Sửa chữa &amp; Bảo trì Cơ sở vật chất
          </h1>
        </div>
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            onClick={() => {
              const unassigned = tickets.find((t) => !t.technician) || tickets[0];
              setAssigningTicket(unassigned);
            }}
            className="h-10 px-space-md rounded-xl bg-[#dfe8ff] hover:bg-[#d9e3fb] text-[#00163a] font-label-md text-label-md font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Phân công kỹ thuật</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-space-md rounded-xl bg-[#0b2a5b] text-white hover:bg-[#00163a] font-label-md text-label-md font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">add_task</span>
            <span>Tạo phiếu báo hỏng</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Total Card */}
        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between relative overflow-hidden group border border-[#dfe8ff]/60">
          <div className="absolute right-3 top-3 text-[#dfe8ff] pointer-events-none group-hover:text-[#d9e3fb] transition-colors">
            <span className="material-symbols-outlined text-5xl opacity-40">assignment</span>
          </div>
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
            TỔNG YÊU CẦU
          </div>
          <div className="mt-space-md flex items-baseline gap-2">
            <span className="font-display-metric text-display-metric font-bold text-[#00163a] tabular-nums">
              {totalCount}
            </span>
            <span className="font-label-md text-label-md text-[#44474f] font-medium">phiếu</span>
          </div>
          <div className="mt-space-md w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#00163a] h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Pending Card */}
        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between relative overflow-hidden group border border-[#dfe8ff]/60">
          <div className="absolute right-3 top-3 text-amber-100 pointer-events-none">
            <span className="material-symbols-outlined text-5xl opacity-50 text-amber-500">pending_actions</span>
          </div>
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
            CHỜ TIẾP NHẬN
          </div>
          <div className="mt-space-md flex items-baseline gap-2">
            <span className="font-display-metric text-display-metric font-bold text-amber-700 tabular-nums">
              {pendingCount}
            </span>
            <span className="font-label-md text-label-md text-[#44474f] font-medium">phiếu</span>
          </div>
          <div className="mt-space-md w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-600 h-full rounded-full" style={{ width: '17.6%' }} />
          </div>
        </div>

        {/* In Progress Card */}
        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between relative overflow-hidden group border border-[#dfe8ff]/60">
          <div className="absolute right-3 top-3 text-[#88a9fd]/20 pointer-events-none">
            <span className="material-symbols-outlined text-5xl opacity-40 text-[#375ba9]">handyman</span>
          </div>
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
            ĐANG XỬ LÝ / SỬA
          </div>
          <div className="mt-space-md flex items-baseline gap-2">
            <span className="font-display-metric text-display-metric font-bold text-[#375ba9] tabular-nums">
              {inProgressCount}
            </span>
            <span className="font-label-md text-label-md text-[#44474f] font-medium">phiếu</span>
          </div>
          <div className="mt-space-md w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '38.2%' }} />
          </div>
        </div>

        {/* Completed Card */}
        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between relative overflow-hidden group border border-[#dfe8ff]/60">
          <div className="absolute right-3 top-3 text-emerald-100 pointer-events-none">
            <span className="material-symbols-outlined text-5xl opacity-40 text-emerald-600">task_alt</span>
          </div>
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
            ĐÃ HOÀN THÀNH
          </div>
          <div className="mt-space-md flex items-baseline gap-2">
            <span className="font-display-metric text-display-metric font-bold text-emerald-700 tabular-nums">
              {completedCount}
            </span>
            <span className="font-label-md text-label-md text-[#44474f] font-medium">phiếu</span>
          </div>
          <div className="mt-space-md w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '44.1%' }} />
          </div>
        </div>
      </div>

      {/* Operational Filter & Search Strip */}
      <div className="p-space-md rounded-xl bg-white shadow-xs flex flex-col gap-space-md border border-[#dfe8ff]/60">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[#747780] text-lg pointer-events-none">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-space-sm rounded-lg bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00163a]/20 border border-transparent focus:border-[#c4c6d0] transition-all"
              placeholder="Mã phiếu, số phòng, người gửi..."
              type="text"
            />
          </div>

          {/* Building Filter */}
          <div className="md:col-span-2">
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
            >
              <option value="">Tất cả Tòa</option>
              <option value="A1">Tòa KTX A1</option>
              <option value="A2">Tòa KTX A2</option>
              <option value="B1">Tòa KTX B1</option>
              <option value="B2">Tòa KTX B2</option>
              <option value="C1">Tòa KTX C1</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
            >
              <option value="">Tất cả Hạng mục</option>
              <option value="Điện dân dụng">Điện dân dụng</option>
              <option value="Nước / Vệ sinh">Nước / Vệ sinh</option>
              <option value="Khóa cửa / Cửa sổ">Khóa cửa / Cửa sổ</option>
              <option value="Đồ gỗ / Giường tủ">Đồ gỗ / Giường tủ</option>
              <option value="Thiết bị mạng">Thiết bị mạng (LAN/Wi-Fi)</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
            >
              <option value="">Độ ưu tiên</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Bình thường">Bình thường</option>
            </select>
          </div>

          {/* Reset Filter Button */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={resetFilters}
              className="h-10 w-full flex items-center justify-center rounded-lg bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#44474f] hover:text-[#111c2d] transition-colors cursor-pointer"
              title="Làm mới lọc"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">filter_alt_off</span>
            </button>
          </div>
        </div>

        {/* Quick Status Segmented Pills */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 text-label-sm font-label-sm">
          <span className="text-[#747780] uppercase text-[11px] font-semibold tracking-wider mr-2 shrink-0">
            Trạng thái:
          </span>
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
              statusTab === 'ALL' ? 'bg-[#00163a] text-white' : 'bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d]'
            }`}
            type="button"
          >
            Tất cả ({tickets.length})
          </button>
          <button
            onClick={() => setStatusTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
              statusTab === 'PENDING' ? 'bg-[#00163a] text-white' : 'bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d]'
            }`}
            type="button"
          >
            Chờ duyệt ({tickets.filter((t) => t.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusTab('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
              statusTab === 'IN_PROGRESS'
                ? 'bg-[#00163a] text-white'
                : 'bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d]'
            }`}
            type="button"
          >
            Đang sửa ({tickets.filter((t) => t.status === 'IN_PROGRESS').length})
          </button>
          <button
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
              statusTab === 'COMPLETED'
                ? 'bg-[#00163a] text-white'
                : 'bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d]'
            }`}
            type="button"
          >
            Hoàn tất ({tickets.filter((t) => t.status === 'COMPLETED').length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-white shadow-xs overflow-hidden flex flex-col border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#44474f] font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-space-md font-semibold">Mã phiếu</th>
                <th className="py-3 px-space-md font-semibold">Phòng &amp; Tòa</th>
                <th className="py-3 px-space-md font-semibold">Hạng mục</th>
                <th className="py-3 px-space-md font-semibold">Nội dung vắn tắt</th>
                <th className="py-3 px-space-md font-semibold">Người báo &amp; SĐT</th>
                <th className="py-3 px-space-md font-semibold">Kỹ thuật viên</th>
                <th className="py-3 px-space-md font-semibold">Ưu tiên</th>
                <th className="py-3 px-space-md font-semibold">Trạng thái</th>
                <th className="py-3 px-space-md font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe8ff]/60 font-body-md text-body-md text-[#111c2d]">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-[#f0f3ff]/50 transition-colors">
                  <td className="py-3 px-space-md font-code-metric text-code-metric font-semibold text-[#00163a]">
                    {ticket.code}
                  </td>
                  <td className="py-3 px-space-md">
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold bg-[#e8eeff] text-[#00163a]">
                      {ticket.room}
                    </span>
                  </td>
                  <td className="py-3 px-space-md font-medium text-[#111c2d]">{ticket.category}</td>
                  <td className="py-3 px-space-md max-w-xs">
                    <p className="truncate font-normal text-[#44474f]" title={ticket.description}>
                      {ticket.title}
                    </p>
                  </td>
                  <td className="py-3 px-space-md">
                    <div className="leading-tight">
                      <span className="font-medium text-[#111c2d] block">{ticket.reporter}</span>
                      <span className="font-code-metric text-code-metric text-[#747780]">{ticket.phone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-space-md">
                    {ticket.technician ? (
                      <span className="font-medium text-[#00163a] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-[#375ba9]">engineering</span>
                        {ticket.technician}
                      </span>
                    ) : (
                      <span className="text-[#747780] italic font-body-sm text-body-sm">Chưa phân công</span>
                    )}
                  </td>
                  <td className="py-3 px-space-md">
                    {ticket.priority === 'Khẩn cấp' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-[#ffdad6] text-[#93000a]">
                        Khẩn cấp
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-[#e8eeff] text-[#44474f]">
                        Bình thường
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-space-md">
                    {ticket.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Chờ duyệt
                      </span>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Đang sửa
                      </span>
                    )}
                    {ticket.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Hoàn tất
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <div className="inline-flex items-center gap-1">
                      {ticket.status === 'PENDING' && (
                        <button
                          onClick={() => setAssigningTicket(ticket)}
                          className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#375ba9] cursor-pointer"
                          title="Phân công ngay"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-lg">person_add</span>
                        </button>
                      )}
                      {ticket.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => setAssigningTicket(ticket)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#00163a] cursor-pointer"
                            title="Đổi phân công"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">edit_note</span>
                          </button>
                          <button
                            onClick={() => handleCloseTicket(ticket)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-emerald-600 cursor-pointer"
                            title="Nghiệm thu & Đóng phiếu"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setViewingTicket(ticket)}
                        className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#44474f] cursor-pointer"
                        title="Xem chi tiết"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-space-md bg-[#f0f3ff]/40 flex flex-col sm:flex-row items-center justify-between gap-space-sm text-label-sm font-label-sm text-[#44474f] border-t border-[#dfe8ff]/60">
          <div>
            Hiển thị <span className="font-semibold text-[#111c2d]">{filteredTickets.length}</span> / 68 phiếu (Trang 1 /
            12)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#f0f3ff] text-[#747780] cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                currentPage === 1 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                currentPage === 2 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                currentPage === 3 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              3
            </button>
            <span className="px-1 text-[#747780]">...</span>
            <button
              onClick={() => setCurrentPage(12)}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                currentPage === 12 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              12
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(12, p + 1))}
              className="px-2.5 py-1 rounded bg-[#f0f3ff] hover:bg-[#e8eeff] text-[#111c2d] cursor-pointer"
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tạo phiếu báo hỏng */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">add_task</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Tạo Phiếu Báo Hỏng Mới</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-space-md">
              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">Tòa nhà</label>
                  <select
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                    required
                  >
                    <option value="A1">Tòa KTX A1</option>
                    <option value="A2">Tòa KTX A2</option>
                    <option value="B1">Tòa KTX B1</option>
                    <option value="B2">Tòa KTX B2</option>
                    <option value="C1">Tòa KTX C1</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">Số phòng</label>
                  <input
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                    placeholder="VD: 308"
                    required
                    type="text"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">
                  Hạng mục hư hỏng
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                  required
                >
                  <option value="Điện dân dụng">Điện dân dụng</option>
                  <option value="Nước / Vệ sinh">Nước / Vệ sinh</option>
                  <option value="Khóa cửa / Cửa sổ">Khóa cửa / Cửa sổ</option>
                  <option value="Đồ gỗ / Giường tủ">Đồ gỗ / Giường tủ</option>
                  <option value="Thiết bị mạng">Thiết bị mạng</option>
                </select>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">
                  Mức độ ưu tiên
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#f0f3ff] cursor-pointer">
                    <input
                      checked={newPriority === 'Bình thường'}
                      onChange={() => setNewPriority('Bình thường')}
                      className="accent-[#00163a]"
                      name="priority"
                      type="radio"
                    />
                    <span className="font-label-md text-label-md text-[#111c2d]">Bình thường</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#ffdad6]/40 cursor-pointer">
                    <input
                      checked={newPriority === 'Khẩn cấp'}
                      onChange={() => setNewPriority('Khẩn cấp')}
                      className="accent-[#ba1a1a]"
                      name="priority"
                      type="radio"
                    />
                    <span className="font-label-md text-label-md text-[#ba1a1a] font-medium">Khẩn cấp</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">Người báo</label>
                  <input
                    value={newReporter}
                    onChange={(e) => setNewReporter(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                    placeholder="Họ và tên SV"
                    required
                    type="text"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                    placeholder="09xx..."
                    required
                    type="tel"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm font-medium text-[#44474f] mb-1">
                  Mô tả sự cố vắn tắt
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                  placeholder="Ghi nhận hiện trạng sự cố..."
                  required
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-[#f0f3ff]">
                <button
                  className="px-space-md h-10 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d] font-label-md text-label-md font-medium cursor-pointer"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="px-space-md h-10 rounded-xl bg-[#0b2a5b] text-white hover:bg-[#00163a] font-label-md text-label-md font-medium shadow-xs cursor-pointer"
                  type="submit"
                >
                  Lưu &amp; Tạo phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Phân công kỹ thuật */}
      {assigningTicket && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">person_add</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Phân Công Kỹ Thuật Viên</h2>
              </div>
              <button
                onClick={() => setAssigningTicket(null)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-space-sm text-xs">
              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Mã phiếu sửa chữa</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] font-code-metric text-code-metric font-semibold text-[#00163a] focus:outline-none"
                  readOnly
                  type="text"
                  value={`${assigningTicket.code} (${assigningTicket.room} - ${assigningTicket.category})`}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Chọn Kỹ thuật viên phụ trách</label>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none"
                >
                  <option value="Phạm Thành">Phạm Thành (Điện - Nước · 4 việc đang chờ)</option>
                  <option value="Vũ Tuấn">Vũ Tuấn (Cửa sổ - Khóa · 2 việc đang chờ)</option>
                  <option value="Đặng Long">Đặng Long (Mộc - Nội thất · 1 việc đang chờ)</option>
                  <option value="Trần Viết Cường">Trần Viết Cường (Mạng Viễn thông · Trống việc)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Thời hạn hoàn tất dự kiến</label>
                <select
                  value={estimatedDeadline}
                  onChange={(e) => setEstimatedDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md focus:outline-none"
                >
                  <option value="Trong vòng 2 giờ (Khẩn cấp)">Trong vòng 2 giờ (Sự cố khẩn cấp)</option>
                  <option value="Trong ngày hôm nay">Trong ngày hôm nay</option>
                  <option value="Trong vòng 24 - 48 giờ">Trong vòng 24 - 48 giờ</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-[#f0f3ff]">
              <button
                className="px-space-md h-10 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d] font-label-md text-label-md font-medium cursor-pointer"
                onClick={() => setAssigningTicket(null)}
                type="button"
              >
                Đóng
              </button>
              <button
                className="px-space-md h-10 rounded-xl bg-[#0b2a5b] text-white hover:bg-[#00163a] font-label-md text-label-md font-medium shadow-xs cursor-pointer"
                onClick={handleConfirmAssign}
                type="button"
              >
                Xác nhận điều phối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết phiếu */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <h2 className="font-headline-sm text-base font-bold text-[#00163a]">
                Chi Tiết Phiếu {viewingTicket.code}
              </h2>
              <button
                onClick={() => setViewingTicket(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Vị trí:</span>
                <span className="font-bold text-[#00163a]">Phòng {viewingTicket.room}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Hạng mục:</span>
                <span className="font-semibold">{viewingTicket.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Người báo hỏng:</span>
                <span>
                  {viewingTicket.reporter} ({viewingTicket.phone})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Kỹ thuật phụ trách:</span>
                <span className="font-medium text-[#375ba9]">{viewingTicket.technician || 'Chưa phân công'}</span>
              </div>
              <div className="py-1">
                <span className="text-[#747780] block mb-1">Mô tả sự cố:</span>
                <div className="p-2.5 rounded-lg bg-[#f0f3ff] text-[#111c2d]">{viewingTicket.description}</div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingTicket(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
