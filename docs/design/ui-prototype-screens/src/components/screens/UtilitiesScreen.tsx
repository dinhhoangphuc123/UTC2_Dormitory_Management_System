import React, { useState, useMemo } from 'react';
import { INITIAL_UTILITIES, UtilityItem } from '../../data/mockData.ts';
import { calculateUtilityUsage, formatMetricNumber } from '../../utils/calculations.ts';

interface UtilitiesScreenProps {
  onShowToast: (msg: string) => void;
}

export const UtilitiesScreen: React.FC<UtilitiesScreenProps> = ({ onShowToast }) => {
  const [utilities, setUtilities] = useState<UtilityItem[]>(INITIAL_UTILITIES);
  const [roomSearch, setRoomSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('2026-03');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Quick entry drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<UtilityItem | null>(null);
  const [inputElectric, setInputElectric] = useState<string>('');
  const [inputWater, setInputWater] = useState<string>('');
  const [hasInternet, setHasInternet] = useState(true);
  const [hasTrash, setHasTrash] = useState(true);

  // History modal state
  const [historyRoom, setHistoryRoom] = useState<UtilityItem | null>(null);

  const filteredUtilities = useMemo(() => {
    return utilities.filter((item) => {
      const matchSearch = !roomSearch || item.room.toLowerCase().includes(roomSearch.toLowerCase());
      const matchBuilding = buildingFilter === 'ALL' || item.building === buildingFilter;
      const matchFloor = floorFilter === 'ALL' || item.floor === Number(floorFilter);
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchBuilding && matchFloor && matchStatus;
    });
  }, [utilities, roomSearch, buildingFilter, floorFilter, statusFilter]);

  // Derived KPI metrics
  const totalRecorded = utilities.filter((u) => u.status === 'RECORDED' || u.status === 'EXCEEDED').length;
  const totalExceeded = utilities.filter((u) => u.status === 'EXCEEDED').length;

  const openDrawerForRoom = (room: UtilityItem) => {
    setActiveRoom(room);
    setInputElectric(room.newElectric ? String(room.newElectric) : '');
    setInputWater(room.newWater ? String(room.newWater) : '');
    setHasInternet(room.services.includes('Net'));
    setHasTrash(room.services.includes('Rác'));
    setIsDrawerOpen(true);
  };

  const handleSaveDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom) return;

    const newElecNum = Number(inputElectric);
    const newWaterNum = Number(inputWater);

    if (isNaN(newElecNum) || isNaN(newWaterNum)) {
      onShowToast('Vui lòng nhập chỉ số điện và nước hợp lệ!');
      return;
    }

    if (newElecNum < activeRoom.oldElectric) {
      onShowToast(`Chỉ số điện mới (${newElecNum}) không được nhỏ hơn số cũ (${activeRoom.oldElectric})!`);
      return;
    }

    if (newWaterNum < activeRoom.oldWater) {
      onShowToast(`Chỉ số nước mới (${newWaterNum}) không được nhỏ hơn số cũ (${activeRoom.oldWater})!`);
      return;
    }

    const { electricUsage, waterUsage, isOverLimit } = calculateUtilityUsage({
      oldElectric: activeRoom.oldElectric,
      newElectric: newElecNum,
      oldWater: activeRoom.oldWater,
      newWater: newWaterNum,
    });

    const activeServices: string[] = [];
    if (hasInternet) activeServices.push('Net');
    if (hasTrash) activeServices.push('Rác');

    const updated = utilities.map((item) => {
      if (item.id === activeRoom.id) {
        return {
          ...item,
          newElectric: newElecNum,
          usageElectric: electricUsage,
          newWater: newWaterNum,
          usageWater: waterUsage,
          services: activeServices,
          status: isOverLimit ? ('EXCEEDED' as const) : ('RECORDED' as const),
          updatedAt: new Date().toLocaleTimeString('vi-VN'),
        };
      }
      return item;
    });

    setUtilities(updated);
    setIsDrawerOpen(false);
    onShowToast(`Đã lưu chỉ số thành công cho phòng ${activeRoom.room}!`);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Phòng,Tòa,Điện Cũ,Điện Mới,Tiêu Thụ Điện (kWh),Nước Cũ,Nước Mới,Tiêu Thụ Nước (m3),Dịch Vụ,Trạng Thái']
        .concat(
          filteredUtilities.map(
            (u) =>
              `"${u.room}","${u.building}",${u.oldElectric},${u.newElectric ?? ''},${u.usageElectric ?? ''},${u.oldWater},${u.newWater ?? ''},${u.usageWater ?? ''},"${u.services.join(' + ')}","${u.status}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bang_ke_dien_nuoc_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Đã xuất bảng kê điện nước thành file CSV!');
  };

  const handleLockBillingPeriod = () => {
    if (window.confirm('Xác nhận chốt kỳ số tháng 03/2026 và chuyển số liệu sang phát hành hóa đơn thu phí?')) {
      onShowToast('Đã chốt kỳ số thành công! Dữ liệu đã được đồng bộ sang module Hóa đơn & Thu phí.');
    }
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Top Header & Command Buttons */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-xs">
        <div>
          <div className="flex items-center gap-space-xs text-[#44474f] font-label-sm text-label-sm uppercase tracking-wider mb-1">
            <span>VẬN HÀNH</span>
            <span>/</span>
            <span>CHỈ SỐ TIÊU THỤ</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#111c2d] font-bold tracking-tight">
            ĐIỆN NƯỚC &amp; DỊCH VỤ
          </h1>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={handleExportCSV}
            className="h-10 px-space-md rounded-xl bg-[#e8eeff] text-[#111c2d] font-label-md text-label-md font-medium hover:bg-[#d9e3fb] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            <span>XUẤT BẢNG KÊ</span>
          </button>
          <button
            onClick={() => {
              // Open first unrecorded room or room 204
              const unrecorded = utilities.find((u) => u.status === 'PENDING') || utilities[0];
              openDrawerForRoom(unrecorded);
            }}
            className="h-10 px-space-md rounded-xl bg-[#dfe8ff] text-[#00163a] font-label-md text-label-md font-semibold hover:bg-[#d9e3fb] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">edit_document</span>
            <span>NHẬP NHANH</span>
          </button>
          <button
            onClick={handleLockBillingPeriod}
            className="h-10 px-space-md rounded-xl bg-[#0b2a5b] text-white font-label-md text-label-md font-semibold hover:bg-[#00163a] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">lock_clock</span>
            <span>CHỐT KỲ SỐ</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỔNG ĐIỆN TIÊU THỤ
            </span>
            <span className="material-symbols-outlined text-[#375ba9] text-xl">bolt</span>
          </div>
          <div className="my-space-sm">
            <span className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              48.250
            </span>
            <span className="font-label-md text-label-md text-[#747780] font-medium ml-1">kWh</span>
          </div>
          <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '78%' }} />
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỔNG NƯỚC TIÊU THỤ
            </span>
            <span className="material-symbols-outlined text-[#375ba9] text-xl">water_drop</span>
          </div>
          <div className="my-space-sm">
            <span className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              3.140
            </span>
            <span className="font-label-md text-label-md text-[#747780] font-medium ml-1">m³</span>
          </div>
          <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '64%' }} />
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              ĐÃ CHỐT CHỈ SỐ
            </span>
            <span className="font-code-metric text-code-metric text-[#375ba9] font-bold">97.5%</span>
          </div>
          <div className="my-space-sm">
            <span className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              {totalRecorded}
            </span>
            <span className="font-label-md text-label-md text-[#747780] font-medium"> / 320 PHÒNG</span>
          </div>
          <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#0b2a5b] h-full rounded-full" style={{ width: '97.5%' }} />
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#ba1a1a] font-semibold">
              VƯỢT ĐỊNH MỨC
            </span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-xl">warning</span>
          </div>
          <div className="my-space-sm">
            <span className="font-display-metric text-display-metric font-bold text-[#ba1a1a] tracking-tight">
              {totalExceeded || 18}
            </span>
            <span className="font-label-md text-label-md text-[#747780] font-medium"> PHÒNG CẦN XỬ LÝ</span>
          </div>
          <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: '24%' }} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-space-md rounded-xl bg-white shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm border border-[#dfe8ff]/60">
        <div className="flex items-center gap-space-sm flex-wrap flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#747780] text-lg pointer-events-none">
              search
            </span>
            <input
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-space-sm rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20 transition-all border border-transparent focus:border-[#c4c6d0]"
              placeholder="Số phòng (VD: A1-204)..."
              type="text"
            />
          </div>

          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-10 px-space-sm rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
          >
            <option value="ALL">Tất cả Tòa</option>
            <option value="A01">Tòa A01</option>
            <option value="A02">Tòa A02</option>
            <option value="B01">Tòa B01</option>
            <option value="B02">Tòa B02</option>
          </select>

          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="h-10 px-space-sm rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
          >
            <option value="ALL">Tất cả Tầng</option>
            <option value="1">Tầng 1</option>
            <option value="2">Tầng 2</option>
            <option value="3">Tầng 3</option>
            <option value="4">Tầng 4</option>
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="h-10 px-space-sm rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
          >
            <option value="2026-03">Kỳ: Tháng 03/2026</option>
            <option value="2026-02">Kỳ: Tháng 02/2026</option>
            <option value="2026-01">Kỳ: Tháng 01/2026</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-space-sm rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium focus:outline-none cursor-pointer border border-transparent hover:border-[#c4c6d0]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="RECORDED">Đã ghi (312)</option>
            <option value="PENDING">Chưa ghi (8)</option>
            <option value="EXCEEDED">Vượt định mức (18)</option>
          </select>
        </div>

        <div className="flex items-center gap-space-sm self-end lg:self-auto text-[#44474f] font-label-sm text-label-sm">
          <span>Hiển thị {filteredUtilities.length}/320 phòng</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-white shadow-xs overflow-hidden border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#44474f] uppercase font-label-sm text-label-sm select-none">
                <th className="py-3 px-space-md font-semibold tracking-wider">PHÒNG &amp; TÒA</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">ĐIỆN CŨ</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">ĐIỆN MỚI</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">TIÊU THỤ (kWh)</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">NƯỚC CŨ</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">NƯỚC MỚI</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">TIÊU THỤ (m³)</th>
                <th className="py-3 px-space-md font-semibold tracking-wider">DỊCH VỤ KÈM</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-center">TRẠNG THÁI</th>
                <th className="py-3 px-space-md font-semibold tracking-wider text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 text-[#111c2d]">
              {filteredUtilities.map((item) => {
                const isOver = item.status === 'EXCEEDED';
                const isPending = item.status === 'PENDING';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#f0f3ff]/60 transition-colors h-12 ${
                      isOver ? 'bg-[#ffdad6]/20' : isPending ? 'bg-[#f0f3ff]/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-space-md">
                      <div className="font-headline-sm text-body-md font-bold text-[#00163a]">{item.room}</div>
                      <div className="font-label-sm text-label-sm text-[#747780]">{item.capacity}</div>
                    </td>
                    <td className="py-2.5 px-space-md text-right font-code-metric text-code-metric text-[#747780]">
                      {formatMetricNumber(item.oldElectric)}
                    </td>
                    <td className="py-2.5 px-space-md text-right font-code-metric text-code-metric text-[#111c2d] font-semibold">
                      {item.newElectric !== null ? formatMetricNumber(item.newElectric) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-space-md text-right font-code-metric text-code-metric font-bold ${
                        isOver ? 'text-[#ba1a1a]' : isPending ? 'text-[#747780]' : 'text-[#111c2d]'
                      }`}
                    >
                      {item.usageElectric !== null ? formatMetricNumber(item.usageElectric) : '—'}
                    </td>
                    <td className="py-2.5 px-space-md text-right font-code-metric text-code-metric text-[#747780]">
                      {formatMetricNumber(item.oldWater)}
                    </td>
                    <td className="py-2.5 px-space-md text-right font-code-metric text-code-metric text-[#111c2d] font-semibold">
                      {item.newWater !== null ? formatMetricNumber(item.newWater) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-space-md text-right font-code-metric text-code-metric font-bold ${
                        isOver ? 'text-[#ba1a1a]' : isPending ? 'text-[#747780]' : 'text-[#111c2d]'
                      }`}
                    >
                      {item.usageWater !== null ? formatMetricNumber(item.usageWater) : '—'}
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-label-sm text-label-sm bg-[#e8eeff] px-2 py-0.5 rounded-md text-[#00163a] font-medium">
                        {item.services.join(' + ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-space-md text-center">
                      {item.status === 'RECORDED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-[#dfe8ff] text-[#375ba9]">
                          ĐÃ GHI
                        </span>
                      )}
                      {item.status === 'EXCEEDED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-[#ffdad6] text-[#93000a]">
                          VƯỢT ĐM
                        </span>
                      )}
                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-[#d9e3fb] text-[#44474f]">
                          CHƯA GHI
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-space-md text-right">
                      {isPending ? (
                        <button
                          onClick={() => openDrawerForRoom(item)}
                          className="h-8 px-space-sm rounded-lg bg-[#0b2a5b] text-white font-label-sm text-label-sm font-medium hover:bg-[#00163a] transition-colors cursor-pointer"
                          type="button"
                        >
                          Ghi ngay
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDrawerForRoom(item)}
                            className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => setHistoryRoom(item)}
                            className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors cursor-pointer"
                            title="Xem lịch sử"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">history</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-space-md bg-white flex items-center justify-between text-[#44474f] font-label-sm text-label-sm border-t border-[#f0f3ff]">
          <div>Trang 1 / 40</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-[#e8eeff] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-8 h-8 rounded-lg font-semibold cursor-pointer ${
                currentPage === 1 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-8 h-8 rounded-lg cursor-pointer ${
                currentPage === 2 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-8 h-8 rounded-lg cursor-pointer ${
                currentPage === 3 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              3
            </button>
            <span className="px-1 text-[#747780]">...</span>
            <button
              onClick={() => setCurrentPage(40)}
              className={`w-8 h-8 rounded-lg cursor-pointer ${
                currentPage === 40 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              40
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(40, p + 1))}
              className="p-2 rounded-lg hover:bg-[#e8eeff] text-[#111c2d] cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Quick Entry Drawer */}
      {isDrawerOpen && activeRoom && (
        <>
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-[#00163a]/30 backdrop-blur-xs z-50 animate-in fade-in"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-space-lg flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-space-md border-b border-[#f0f3ff]">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
                    NHẬP NHANH CHỈ SỐ
                  </span>
                  <h2 className="font-headline-md text-headline-md font-bold text-[#00163a]">
                    PHÒNG {activeRoom.room}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#e8eeff] text-[#747780] hover:text-[#111c2d] cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveDrawer} className="space-y-space-md pt-space-sm">
                <div className="p-space-md rounded-xl bg-[#f0f3ff] space-y-1.5 border border-[#dfe8ff]">
                  <div className="flex justify-between font-label-sm text-label-sm text-[#747780]">
                    <span>Chỉ số điện cũ:</span>
                    <span className="font-code-metric text-code-metric font-semibold text-[#111c2d]">
                      {formatMetricNumber(activeRoom.oldElectric)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between font-label-sm text-label-sm text-[#747780]">
                    <span>Chỉ số nước cũ:</span>
                    <span className="font-code-metric text-code-metric font-semibold text-[#111c2d]">
                      {formatMetricNumber(activeRoom.oldWater)} m³
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#111c2d]"
                    htmlFor="new-electric"
                  >
                    CHỈ SỐ ĐIỆN MỚI (kWh) *
                  </label>
                  <input
                    id="new-electric"
                    value={inputElectric}
                    onChange={(e) => setInputElectric(e.target.value)}
                    className="w-full h-11 px-space-md rounded-xl bg-[#f0f3ff] font-code-metric text-code-metric text-[#111c2d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/30 border border-transparent focus:border-[#c4c6d0]"
                    placeholder="Nhập số điện mới..."
                    type="number"
                    min={activeRoom.oldElectric}
                    required
                  />
                  {inputElectric && Number(inputElectric) >= activeRoom.oldElectric && (
                    <div className="text-xs text-[#375ba9] font-medium">
                      Tiêu thụ: {Number(inputElectric) - activeRoom.oldElectric} kWh
                      {Number(inputElectric) - activeRoom.oldElectric > 250 && (
                        <span className="text-[#ba1a1a] font-bold ml-1.5">⚠️ Vượt định mức (250 kWh)!</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#111c2d]"
                    htmlFor="new-water"
                  >
                    CHỈ SỐ NƯỚC MỚI (m³) *
                  </label>
                  <input
                    id="new-water"
                    value={inputWater}
                    onChange={(e) => setInputWater(e.target.value)}
                    className="w-full h-11 px-space-md rounded-xl bg-[#f0f3ff] font-code-metric text-code-metric text-[#111c2d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/30 border border-transparent focus:border-[#c4c6d0]"
                    placeholder="Nhập số nước mới..."
                    type="number"
                    min={activeRoom.oldWater}
                    required
                  />
                  {inputWater && Number(inputWater) >= activeRoom.oldWater && (
                    <div className="text-xs text-[#375ba9] font-medium">
                      Tiêu thụ: {Number(inputWater) - activeRoom.oldWater} m³
                      {Number(inputWater) - activeRoom.oldWater > 20 && (
                        <span className="text-[#ba1a1a] font-bold ml-1.5">⚠️ Vượt định mức (20 m³)!</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-space-xs">
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#111c2d]">
                    DỊCH VỤ SỬ DỤNG
                  </span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
                    <label className="flex items-center gap-2 cursor-pointer font-body-md text-body-md">
                      <input
                        checked={hasInternet}
                        onChange={(e) => setHasInternet(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0b2a5b] focus:ring-0 accent-[#0b2a5b]"
                        type="checkbox"
                      />
                      <span>Internet (100k/tháng)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-body-md text-body-md">
                      <input
                        checked={hasTrash}
                        onChange={(e) => setHasTrash(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0b2a5b] focus:ring-0 accent-[#0b2a5b]"
                        type="checkbox"
                      />
                      <span>Vệ sinh &amp; Rác (20k/SV)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-space-sm pt-space-md">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 h-11 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium hover:bg-[#dfe8ff] transition-colors cursor-pointer"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-[#0b2a5b] text-white font-label-md text-label-md font-semibold hover:bg-[#00163a] transition-colors shadow-xs cursor-pointer"
                  >
                    LƯU CHỈ SỐ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal: Lịch sử chỉ số các tháng */}
      {historyRoom && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div>
                <span className="text-[11px] font-bold text-[#375ba9] uppercase tracking-wider">
                  LỊCH SỬ TIÊU THỤ 3 THÁNG GẦN NHẤT
                </span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">
                  Phòng {historyRoom.room} ({historyRoom.capacity})
                </h2>
              </div>
              <button
                onClick={() => setHistoryRoom(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { period: 'Tháng 03/2026', electric: '175 kWh', water: '12 m³', total: '710.000 đ', status: 'Đã thanh toán' },
                { period: 'Tháng 02/2026', electric: '160 kWh', water: '10 m³', total: '635.000 đ', status: 'Đã thanh toán' },
                { period: 'Tháng 01/2026', electric: '188 kWh', water: '14 m³', total: '768.000 đ', status: 'Đã thanh toán' },
              ].map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#f0f3ff] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#00163a]">{h.period}</div>
                    <div className="text-[#747780] mt-0.5">
                      Điện: <strong className="text-[#111c2d]">{h.electric}</strong> · Nước:{' '}
                      <strong className="text-[#111c2d]">{h.water}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-code-metric font-bold text-[#00163a]">{h.total}</div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryRoom(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d] text-xs font-semibold"
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
