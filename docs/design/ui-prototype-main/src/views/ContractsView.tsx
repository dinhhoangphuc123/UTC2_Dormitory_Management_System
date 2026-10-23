import React, { useState } from 'react';
import { Contract } from '../types';
import { INITIAL_CONTRACTS } from '../data/mockData';

interface ContractsViewProps {
  onOpenNewContract: () => void;
  onOpenRenewContract: (contract: Contract) => void;
  onOpenPrintContract: (contract: Contract) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  onOpenNewContract,
  onOpenRenewContract,
  onOpenPrintContract,
  showToast,
}) => {
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'expiring' | 'pending' | 'ended'>('valid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [liquidatingContract, setLiquidatingContract] = useState<Contract | null>(null);

  const handleLiquidate = (c: Contract) => {
    setLiquidatingContract(c);
  };

  const confirmLiquidation = () => {
    if (!liquidatingContract) return;
    setContracts((prev) =>
      prev.map((c) =>
        c.id === liquidatingContract.id
          ? {
              ...c,
              status: 'Đã thanh lý',
              depositStatus: 'Đã hoàn',
              statusNote: 'Đã tất toán',
              remainingDays: 0,
            }
          : c
      )
    );
    showToast(`Đã thanh lý và hoàn trả cọc hợp đồng ${liquidatingContract.contractNumber}`, 'success');
    setLiquidatingContract(null);
  };

  const filteredContracts = contracts.filter((c) => {
    if (activeTab === 'valid' && c.status !== 'Hiệu lực') return false;
    if (activeTab === 'expiring' && c.status !== 'Sắp hết hạn') return false;
    if (activeTab === 'pending' && c.status !== 'Chờ thanh lý') return false;
    if (activeTab === 'ended' && c.status !== 'Đã thanh lý') return false;

    if (selectedBuilding !== 'all') {
      if (!c.buildingId.includes(selectedBuilding) && !c.roomNumber.startsWith(selectedBuilding)) {
        return false;
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNum = c.contractNumber.toLowerCase().includes(q);
      const matchName = c.studentName.toLowerCase().includes(q);
      const matchMssv = c.mssv.includes(q);
      const matchRoom = c.roomNumber.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchMssv && !matchRoom) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Action & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">
            Quản lý Hợp đồng
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi thời hạn lưu trú, tiền cọc bảo lãnh và gia hạn tự động
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => showToast('Đang quét và gửi thông báo gia hạn hàng loạt cho 45 hợp đồng sắp hết hạn!', 'info')}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">
              update
            </span>
            <span>Gia hạn hàng loạt</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewContract}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Lập hợp đồng mới</span>
          </button>
        </div>
      </div>

      {/* 4 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Đang hiệu lực */}
        <div className="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                ĐANG HIỆU LỰC
              </span>
              <span className="material-symbols-outlined text-blue-500 text-[20px]">
                verified_user
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2A5B] dark:text-blue-400 tracking-tight">
                3.240
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">hồ sơ</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#375ba9] dark:bg-blue-500 h-full rounded-full" style={{ width: '94%' }} />
            </div>
            <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400 truncate">
              Tỷ lệ lấp đầy phòng theo hợp đồng an toàn
            </span>
          </div>
        </div>

        {/* Metric 2: Sắp hết hạn */}
        <div className="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                SẮP HẾT HẠN (≤ 15 NGÀY)
              </span>
              <span className="material-symbols-outlined text-amber-500 text-[20px]">
                warning
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                45
              </span>
              <span className="text-xs text-amber-600/80">hợp đồng</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '28%' }} />
            </div>
            <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400 truncate">
              Ưu tiên liên hệ thông báo sinh viên
            </span>
          </div>
        </div>

        {/* Metric 3: Đã thanh lý */}
        <div className="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                ĐÃ THANH LÝ
              </span>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                assignment_turned_in
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                180
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">kỳ này</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400 truncate">
              Đã bàn giao phòng & hoàn cọc đầy đủ
            </span>
          </div>
        </div>

        {/* Metric 4: Tiền cọc giữ */}
        <div className="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                TỔNG TIỀN CỌC GIỮ
              </span>
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">
                savings
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#0B2A5B] dark:text-blue-300 tracking-tight">
                1.620.000.000
              </span>
              <span className="text-xs font-semibold text-[#0B2A5B] dark:text-blue-400">đ</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
            </div>
            <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400 truncate">
              TK kho bạc bảo lãnh nội trú sinh viên
            </span>
          </div>
        </div>
      </div>

      {/* Filter Control Strip & Status Categorization Tabs */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Interactive Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('valid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                activeTab === 'valid'
                  ? 'bg-[#0B2A5B] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Đang hiệu lực</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
                3.240
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expiring')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                activeTab === 'expiring'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Sắp hết hạn</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                45
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-[#0B2A5B] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Chờ thanh lý</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                12
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ended')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                activeTab === 'ended'
                  ? 'bg-[#0B2A5B] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Đã kết thúc</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                180
              </span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Số HĐ hoặc tên/MSSV..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả Tòa</option>
                <option value="A">Khu Tòa A</option>
                <option value="B">Khu Tòa B</option>
                <option value="C">Khu Tòa C</option>
              </select>
              <button
                type="button"
                onClick={() => showToast('Đang xuất danh sách hợp đồng ra file Excel (xlsx)...', 'success')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Xuất Excel/CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Số HĐ</th>
                <th className="py-3.5 px-4">Sinh viên</th>
                <th className="py-3.5 px-4">Phòng / Giường</th>
                <th className="py-3.5 px-4">Thời hạn</th>
                <th className="py-3.5 px-4 text-right">Tiền phòng/tháng</th>
                <th className="py-3.5 px-4 text-right">Tiền cọc</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredContracts.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    c.status === 'Sắp hết hạn' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">
                    {c.contractNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.avatarInitials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {c.studentName}
                        </span>
                        <span className="text-[11px] text-slate-400">MSSV: {c.mssv}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                      <span className="material-symbols-outlined text-[16px] text-[#375ba9] dark:text-blue-400">
                        meeting_room
                      </span>
                      <span className="font-bold text-[#0B2A5B] dark:text-white">{c.roomNumber}</span>
                      <span className="text-slate-400">·</span>
                      <span>{c.bedNumber}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {c.startDate} → {c.endDate}
                      </span>
                      {c.remainingDays > 0 ? (
                        <span
                          className={`text-[11px] font-medium ${
                            c.remainingDays <= 15
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          Còn {c.remainingDays} ngày
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">{c.statusNote || 'Đã tất toán'}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('vi-VN').format(c.monthlyFee)} đ
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('vi-VN').format(c.depositAmount)} đ
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          c.depositStatus === 'Đã nộp' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                        }`}
                      >
                        {c.depositStatus}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {c.status === 'Hiệu lực' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Hiệu lực
                      </span>
                    )}
                    {c.status === 'Sắp hết hạn' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        {c.statusNote || 'Sắp hết hạn'}
                      </span>
                    )}
                    {c.status === 'Đã thanh lý' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Đã thanh lý
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c.status !== 'Đã thanh lý' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenRenewContract(c)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0B2A5B] dark:text-blue-300 hover:bg-[#0B2A5B] hover:text-white text-xs font-semibold transition-all"
                            title="Gia hạn hợp đồng"
                          >
                            Gia hạn
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLiquidate(c)}
                            className="px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium transition-colors"
                            title="Thanh lý hợp đồng"
                          >
                            Thanh lý
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => showToast(`Xem hồ sơ lưu trữ: ${c.contractNumber}`, 'info')}
                          className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                          title="Xem lưu trữ"
                        >
                          Lưu trữ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenPrintContract(c)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2A5B] dark:hover:text-blue-400 transition-colors"
                        title="In hợp đồng PDF"
                      >
                        <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-[#0B0F1A]/80 border-t border-slate-200/80 dark:border-[#232B3B] gap-3 text-slate-500 dark:text-slate-400 text-xs">
          <div>
            Hiển thị <span className="font-semibold text-slate-900 dark:text-white font-mono">1 - {filteredContracts.length}</span> trên{' '}
            <span className="font-semibold text-slate-900 dark:text-white font-mono">3.465</span> hợp đồng
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0B2A5B] text-white font-bold text-xs shadow-2xs"
            >
              1
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              2
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              578
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liquidation Confirmation Modal */}
      {liquidatingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <span className="material-symbols-outlined text-[28px]">assignment_late</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận thanh lý hợp đồng
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn tiến hành thanh lý hợp đồng{' '}
              <strong>{liquidatingContract.contractNumber}</strong> của sinh viên{' '}
              <strong>{liquidatingContract.studentName}</strong> (Phòng {liquidatingContract.roomNumber} - {liquidatingContract.bedNumber})?
            </p>
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Tiền cọc giữ:</span>
                <span className="font-bold text-[#0B2A5B] dark:text-blue-300">
                  {new Intl.NumberFormat('vi-VN').format(liquidatingContract.depositAmount)} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tình trạng bàn giao:</span>
                <span className="font-semibold text-emerald-600">Đầy đủ trang thiết bị</span>
              </div>
              <div className="flex justify-between">
                <span>Hoàn cọc thực nhận:</span>
                <span className="font-bold text-emerald-600">
                  {new Intl.NumberFormat('vi-VN').format(liquidatingContract.depositAmount)} đ
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setLiquidatingContract(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmLiquidation}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                Xác nhận thanh lý & Hoàn cọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
