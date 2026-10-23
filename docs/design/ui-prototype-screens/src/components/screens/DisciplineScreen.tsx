import React, { useState, useMemo } from 'react';
import { INITIAL_VIOLATIONS, ViolationItemData } from '../../data/mockData.ts';

interface DisciplineScreenProps {
  onShowToast: (msg: string) => void;
}

export const DisciplineScreen: React.FC<DisciplineScreenProps> = ({ onShowToast }) => {
  const [violations, setViolations] = useState<ViolationItemData[]>(INITIAL_VIOLATIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [penaltyFilter, setPenaltyFilter] = useState('');
  const [violationTypeFilter, setViolationTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingViolation, setViewingViolation] = useState<ViolationItemData | null>(null);

  // Create violation state
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newBuilding, setNewBuilding] = useState('A01');
  const [newViolation, setNewViolation] = useState('Nấu ăn sai quy định phòng');
  const [newViolationType, setNewViolationType] = useState<ViolationItemData['violationType']>('cook');
  const [newPenalty, setNewPenalty] = useState('Khiển trách');
  const [newPenaltyType, setNewPenaltyType] = useState<ViolationItemData['penaltyType']>('reprimand');
  const [newNotes, setNewNotes] = useState('');

  const filteredViolations = useMemo(() => {
    return violations.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.room.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBld = !buildingFilter || item.building === buildingFilter;
      const matchPenalty = !penaltyFilter || item.penaltyType === penaltyFilter;
      const matchType = !violationTypeFilter || item.violationType === violationTypeFilter;

      return matchSearch && matchBld && matchPenalty && matchType;
    });
  }, [violations, searchTerm, buildingFilter, penaltyFilter, violationTypeFilter]);

  const handleCreateViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim() || !newRoom.trim()) {
      onShowToast('Vui lòng nhập đầy đủ thông tin sinh viên và phòng!');
      return;
    }

    const nextCodeNum = String(violations.length + 90).padStart(3, '0');
    const newRecord: ViolationItemData = {
      id: 'v_' + Date.now(),
      code: `BB-2026-${nextCodeNum}`,
      studentId: newStudentId.trim().toUpperCase(),
      studentName: newStudentName.trim(),
      room: `P.${newRoom.trim()}`,
      building: newBuilding,
      violation: newViolation,
      violationType: newViolationType,
      date: new Date().toLocaleDateString('vi-VN'),
      penalty: newPenalty,
      penaltyType: newPenaltyType,
      status: 'Chờ duyệt',
      notes: newNotes || 'Ghi nhận biên bản vi phạm kỷ luật nội trú tại chỗ.',
    };

    setViolations([newRecord, ...violations]);
    setIsCreateModalOpen(false);
    // Reset form
    setNewStudentId('');
    setNewStudentName('');
    setNewRoom('');
    setNewNotes('');
    onShowToast(`Đã lập thành công biên bản vi phạm ${newRecord.code}!`);
  };

  const handleCloseReport = (item: ViolationItemData) => {
    const updated = violations.map((v) => {
      if (v.id === item.id) {
        return {
          ...v,
          status: 'Đã thi hành' as const,
        };
      }
      return v;
    });
    setViolations(updated);
    onShowToast(`Đã hoàn tất thi hành và đóng hồ sơ biên bản ${item.code}!`);
  };

  const handleExportDecisions = () => {
    onShowToast('Đã xuất toàn bộ danh sách Quyết định kỷ luật nội trú sang file PDF/Excel!');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Section: Header & Quick Stats */}
      <div className="flex flex-col gap-space-lg mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-[#111c2d] font-bold tracking-tight">
              KỶ LUẬT &amp; NỘI QUY
            </h1>
            <p className="font-body-md text-body-md text-[#44474f] mt-0.5">Học kỳ 1 · Năm học 2026 - 2027</p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={handleExportDecisions}
              className="h-10 px-space-md rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium hover:bg-[#dfe8ff] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Xuất quyết định kỷ luật</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-space-md rounded-xl bg-[#00163a] text-white font-label-md text-label-md font-medium hover:bg-[#0b2a5b] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Lập biên bản vi phạm</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#44474f] font-bold">
              TỔNG VỤ VI PHẠM
            </span>
            <div className="mt-space-md flex items-baseline gap-2">
              <span className="font-display-metric text-display-metric font-bold text-[#111c2d] tabular-nums">34</span>
              <span className="font-label-md text-label-md text-[#44474f]">vụ</span>
            </div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full mt-space-md overflow-hidden">
              <div className="bg-[#00163a] h-full rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#44474f] font-bold">
              ĐANG XỬ LÝ / CHỜ XÉT
            </span>
            <div className="mt-space-md flex items-baseline gap-2">
              <span className="font-display-metric text-display-metric font-bold text-[#375ba9] tabular-nums">05</span>
              <span className="font-label-md text-label-md text-[#44474f]">hồ sơ</span>
            </div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full mt-space-md overflow-hidden">
              <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '15%' }} />
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#44474f] font-bold">
              CẢNH CÁO / TRỪ ĐIỂM
            </span>
            <div className="mt-space-md flex items-baseline gap-2">
              <span className="font-display-metric text-display-metric font-bold text-[#111c2d] tabular-nums">21</span>
              <span className="font-label-md text-label-md text-[#44474f]">trường hợp</span>
            </div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full mt-space-md overflow-hidden">
              <div className="bg-[#455e91] h-full rounded-full" style={{ width: '62%' }} />
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-white shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#ba1a1a] font-bold">
              ĐÌNH CHỈ / TRỤC XUẤT
            </span>
            <div className="mt-space-md flex items-baseline gap-2">
              <span className="font-display-metric text-display-metric font-bold text-[#ba1a1a] tabular-nums">08</span>
              <span className="font-label-md text-label-md text-[#44474f]">sinh viên</span>
            </div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full mt-space-md overflow-hidden">
              <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: '23%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="p-space-md bg-white rounded-xl shadow-xs mb-space-lg border border-[#dfe8ff]/60">
        <div className="flex flex-wrap items-center gap-space-sm justify-between">
          <div className="flex flex-wrap items-center gap-space-sm flex-1 min-w-[320px]">
            {/* Search Field */}
            <div className="relative w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#747780] text-lg pointer-events-none">
                search
              </span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-space-md bg-[#f0f3ff] rounded-lg text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00163a]/20 border border-transparent focus:border-[#c4c6d0] transition-colors"
                placeholder="Tìm MSSV, tên SV, số phòng..."
                type="text"
              />
            </div>

            {/* Filter: Building */}
            <div className="relative">
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium appearance-none cursor-pointer focus:outline-none border border-transparent hover:border-[#c4c6d0]"
              >
                <option value="">Tòa: Tất cả</option>
                <option value="A01">Tòa A01</option>
                <option value="A02">Tòa A02</option>
                <option value="B01">Tòa B01</option>
                <option value="B02">Tòa B02</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#747780] text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Filter: Cohort */}
            <div className="relative">
              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium appearance-none cursor-pointer focus:outline-none border border-transparent hover:border-[#c4c6d0]"
              >
                <option value="">Khóa học: Tất cả</option>
                <option value="K63">Khóa 63</option>
                <option value="K64">Khóa 64</option>
                <option value="K65">Khóa 65</option>
                <option value="K66">Khóa 66</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#747780] text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Filter: Severity */}
            <div className="relative">
              <select
                value={penaltyFilter}
                onChange={(e) => setPenaltyFilter(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium appearance-none cursor-pointer focus:outline-none border border-transparent hover:border-[#c4c6d0]"
              >
                <option value="">Mức kỷ luật: Tất cả</option>
                <option value="remind">Nhắc nhở</option>
                <option value="reprimand">Khiển trách</option>
                <option value="warning">Cảnh cáo</option>
                <option value="expel">Buộc rời KTX</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#747780] text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Filter: Violation Category */}
            <div className="relative">
              <select
                value={violationTypeFilter}
                onChange={(e) => setViolationTypeFilter(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-lg bg-[#f0f3ff] text-[#111c2d] font-label-md text-label-md font-medium appearance-none cursor-pointer focus:outline-none border border-transparent hover:border-[#c4c6d0]"
              >
                <option value="">Lỗi vi phạm: Tất cả</option>
                <option value="noise">Gây ồn ào quá giờ quy định</option>
                <option value="cook">Nấu ăn sai quy định phòng</option>
                <option value="guest">Dẫn người ngoài vào phòng</option>
                <option value="smoke">Sử dụng chất cấm / Thuốc lá</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#747780] text-sm pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-xs text-[#44474f] font-label-sm text-label-sm">
            <span className="tabular-nums font-semibold text-[#111c2d]">{filteredViolations.length}</span> kết quả
          </div>
        </div>
      </div>

      {/* Incident Reports & Disciplines Data Table */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden flex flex-col border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#44474f] font-label-sm text-label-sm tracking-wider uppercase">
                <th className="py-3 px-space-md font-semibold">Mã biên bản</th>
                <th className="py-3 px-space-md font-semibold">MSSV</th>
                <th className="py-3 px-space-md font-semibold">Họ và tên</th>
                <th className="py-3 px-space-md font-semibold">Phòng &amp; Tòa</th>
                <th className="py-3 px-space-md font-semibold">Lỗi vi phạm</th>
                <th className="py-3 px-space-md font-semibold">Ngày vi phạm</th>
                <th className="py-3 px-space-md font-semibold">Hình thức</th>
                <th className="py-3 px-space-md font-semibold">Trạng thái</th>
                <th className="py-3 px-space-md font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff] font-body-md text-body-md text-[#111c2d]">
              {filteredViolations.map((v) => (
                <tr key={v.id} className="hover:bg-[#f0f3ff]/60 transition-colors">
                  <td className="py-3 px-space-md font-code-metric text-code-metric font-semibold text-[#00163a]">
                    {v.code}
                  </td>
                  <td className="py-3 px-space-md font-code-metric text-code-metric text-[#44474f]">{v.studentId}</td>
                  <td className="py-3 px-space-md font-medium text-[#111c2d]">{v.studentName}</td>
                  <td className="py-3 px-space-md">
                    <span className="font-medium text-[#111c2d]">{v.room}</span>
                    <span className="text-[#44474f] text-label-sm"> · {v.building}</span>
                  </td>
                  <td className="py-3 px-space-md text-[#111c2d] truncate max-w-xs" title={v.notes}>
                    {v.violation}
                  </td>
                  <td className="py-3 px-space-md font-code-metric text-code-metric text-[#44474f] tabular-nums">
                    {v.date}
                  </td>
                  <td className="py-3 px-space-md">
                    <span
                      className={`font-semibold ${
                        v.penaltyType === 'expel' || v.penaltyType === 'warning' ? 'text-[#ba1a1a]' : 'text-[#111c2d]'
                      }`}
                    >
                      {v.penalty}
                    </span>
                  </td>
                  <td className="py-3 px-space-md">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${
                        v.status === 'Đã thi hành'
                          ? 'bg-[#dfe8ff] text-[#00163a]'
                          : 'bg-[#88a9fd]/20 text-[#375ba9]'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setViewingViolation(v)}
                        className="p-1 rounded-lg text-[#44474f] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors cursor-pointer"
                        title="Chi tiết biên bản"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      {v.status !== 'Đã thi hành' && (
                        <button
                          onClick={() => handleCloseReport(v)}
                          className="p-1 rounded-lg text-[#44474f] hover:text-emerald-700 hover:bg-[#e8eeff] transition-colors cursor-pointer"
                          title="Đóng hồ sơ / Thi hành xong"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Minimal Pagination */}
        <div className="px-space-md py-3 bg-[#f0f3ff]/40 flex items-center justify-between border-t border-[#dfe8ff]/60">
          <span className="font-label-sm text-label-sm text-[#44474f]">
            Hiển thị <span className="font-semibold text-[#111c2d] tabular-nums">1-{filteredViolations.length}</span>{' '}
            trên <span className="font-semibold text-[#111c2d] tabular-nums">34</span> bản ghi
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#44474f] hover:bg-[#e8eeff] transition-colors disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-8 h-8 rounded-lg font-label-md text-label-md font-medium flex items-center justify-center cursor-pointer ${
                currentPage === 1 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-8 h-8 rounded-lg font-label-md text-label-md font-medium flex items-center justify-center transition-colors cursor-pointer ${
                currentPage === 2 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-8 h-8 rounded-lg font-label-md text-label-md font-medium flex items-center justify-center transition-colors cursor-pointer ${
                currentPage === 3 ? 'bg-[#00163a] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              3
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#44474f] hover:bg-[#e8eeff] transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Lập biên bản vi phạm */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">gavel</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Lập Biên Bản Vi Phạm Nội Quy</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateViolation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Mã Số Sinh Viên (MSSV) *</label>
                  <input
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="VD: 72DCHT21045"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Họ và Tên SV *</label>
                  <input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Thành Đạt"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Tòa Nhà</label>
                  <select
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  >
                    <option value="A01">Tòa A01</option>
                    <option value="A02">Tòa A02</option>
                    <option value="B01">Tòa B01</option>
                    <option value="B02">Tòa B02</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Số Phòng</label>
                  <input
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="VD: 304"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Hành Vi Vi Phạm</label>
                <select
                  value={newViolation}
                  onChange={(e) => {
                    setNewViolation(e.target.value);
                    if (e.target.value.includes('Nấu')) setNewViolationType('cook');
                    else if (e.target.value.includes('ồn')) setNewViolationType('noise');
                    else if (e.target.value.includes('ngoài')) setNewViolationType('guest');
                    else if (e.target.value.includes('Thuốc')) setNewViolationType('smoke');
                    else setNewViolationType('electric');
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                >
                  <option value="Nấu ăn sai quy định (bếp điện)">Nấu ăn sai quy định (bếp điện công suất lớn)</option>
                  <option value="Gây ồn ào quá giờ quy định">Gây ồn ào sau 23:00</option>
                  <option value="Dẫn người ngoài qua đêm">Dẫn người ngoài vào phòng qua đêm không phép</option>
                  <option value="Tự ý câu nối đường điện">Tự ý câu nối đường điện nguy hiểm</option>
                  <option value="Hút thuốc trong khuôn viên">Hút thuốc trong khuôn viên KTX</option>
                  <option value="Tổ chức cờ bạc tại phòng">Tổ chức đánh bạc ăn tiền</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Hình Thức Xử Lý Đề Xuất</label>
                <select
                  value={newPenalty}
                  onChange={(e) => {
                    setNewPenalty(e.target.value);
                    if (e.target.value.includes('Nhắc')) setNewPenaltyType('remind');
                    else if (e.target.value.includes('Khiển')) setNewPenaltyType('reprimand');
                    else if (e.target.value.includes('Cảnh')) setNewPenaltyType('warning');
                    else setNewPenaltyType('expel');
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                >
                  <option value="Nhắc nhở">Nhắc nhở lần 1</option>
                  <option value="Khiển trách">Khiển trách toàn KTX</option>
                  <option value="Cảnh cáo cấp 1">Cảnh cáo cấp 1 - Trừ 3 điểm rèn luyện</option>
                  <option value="Cảnh cáo cấp 2">Cảnh cáo cấp 2 - Trừ 5 điểm rèn luyện</option>
                  <option value="Buộc rời KTX">Buộc chấm dứt hợp đồng rời KTX</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Ghi Chú Diễn Biến Vi Phạm</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ghi lại vật chứng thu giữ hoặc thời điểm bắt quả tang..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f3ff]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 h-9 rounded-xl bg-[#ba1a1a] text-white font-semibold shadow-xs"
                >
                  Lập biên bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết biên bản */}
      {viewingViolation && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div>
                <span className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wider">HỒ SƠ VI PHẠM</span>
                <h2 className="font-headline-sm text-base font-bold text-[#00163a]">{viewingViolation.code}</h2>
              </div>
              <button
                onClick={() => setViewingViolation(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Sinh viên:</span>
                <span className="font-bold text-[#111c2d]">
                  {viewingViolation.studentName} ({viewingViolation.studentId})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Vị trí phòng:</span>
                <span className="font-semibold">
                  {viewingViolation.room} · {viewingViolation.building}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Lỗi vi phạm:</span>
                <span className="font-medium text-[#ba1a1a]">{viewingViolation.violation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Hình thức xử lý:</span>
                <span className="font-bold">{viewingViolation.penalty}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Trạng thái thi hành:</span>
                <span className="font-medium text-[#375ba9]">{viewingViolation.status}</span>
              </div>
              <div className="py-1">
                <span className="text-[#747780] block mb-1">Nội dung ghi nhận:</span>
                <div className="p-2.5 rounded-lg bg-[#f0f3ff] text-[#111c2d]">{viewingViolation.notes}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingViolation(null)}
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
