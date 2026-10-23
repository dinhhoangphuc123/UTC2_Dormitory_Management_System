import React, { useState } from 'react';
import { Application } from '../types';
import { INITIAL_APPLICATIONS } from '../data/mockData';

interface AdmissionsViewProps {
  onOpenNewRound: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const AdmissionsView: React.FC<AdmissionsViewProps> = ({
  onOpenNewRound,
  showToast,
}) => {
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('k65');
  const [selectedGender, setSelectedGender] = useState('all');
  const [inspectingApp, setInspectingApp] = useState<Application | null>(null);

  const handleDecision = (
    e: React.MouseEvent,
    appId: string,
    action: 'approved' | 'rejected',
    studentName: string
  ) => {
    e.stopPropagation();
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: action === 'approved' ? 'Đã duyệt' : 'Bị từ chối' } : a))
    );
    if (action === 'approved') {
      showToast(`Đã duyệt 1-chạm: ${studentName} (Tạo hợp đồng & xếp chỗ thành công)`, 'success');
    } else {
      showToast(`Đã từ chối đơn của ${studentName}`, 'error');
    }
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === 'pending' && app.status !== 'Chờ duyệt') return false;
    if (activeTab === 'approved' && app.status !== 'Đã duyệt') return false;
    if (activeTab === 'rejected' && app.status !== 'Bị từ chối') return false;

    if (selectedPriority) {
      if (!app.priorityCategory.toLowerCase().includes(selectedPriority.toLowerCase())) return false;
    }
    if (selectedCohort && selectedCohort !== 'all') {
      if (!app.cohort.toLowerCase().includes(selectedCohort.toLowerCase())) return false;
    }
    if (selectedGender && selectedGender !== 'all') {
      if (selectedGender === 'nam' && app.gender !== 'Nam') return false;
      if (selectedGender === 'nu' && app.gender !== 'Nữ') return false;
    }
    return true;
  });

  const pendingCount = applications.filter((a) => a.status === 'Chờ duyệt').length;
  const approvedCount = applications.filter((a) => a.status === 'Đã duyệt').length + 312;
  const rejectedCount = applications.filter((a) => a.status === 'Bị từ chối').length + 22;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Action & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">
            Đợt &amp; Đơn đăng ký
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Xét duyệt hồ sơ nhập túc xá tân sinh viên K65 và sinh viên tái đăng ký nội trú
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => showToast('Đang tải về danh sách hồ sơ tuyển sinh KTX dạng file Excel...', 'success')}
            className="h-10 px-4 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">
              file_download
            </span>
            <span>Xuất danh sách</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewRound}
            className="h-10 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Tạo đợt mới</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Tổng hồ sơ
          </span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              420
            </span>
            <span className="text-xs text-slate-500">chỉ tiêu 450</span>
          </div>
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full" style={{ width: '93%' }} />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
              <span>Tiến độ lấp đầy</span>
              <span className="font-semibold text-[#0B2A5B] dark:text-blue-400">93.3%</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Đã duyệt
          </span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {approvedCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">74.3%</span>
          </div>
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: '74%' }} />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
              <span>Xác nhận đóng phí</span>
              <span className="font-semibold text-emerald-600">289/312 SV</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Chờ xét duyệt
          </span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2A5B] dark:text-blue-400 tracking-tight">
              {pendingCount + 79}
            </span>
            <span className="text-xs text-blue-600/80">đơn tồn đọng</span>
          </div>
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#0B2A5B] dark:bg-blue-400 h-full rounded-full" style={{ width: '20%' }} />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
              <span>Thời gian xử lý TB</span>
              <span className="font-bold text-[#0B2A5B] dark:text-blue-400">&lt; 2.5 giờ</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Từ chối / Hủy
          </span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {rejectedCount}
            </span>
            <span className="text-xs text-slate-500">5.2%</span>
          </div>
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full rounded-full" style={{ width: '5%' }} />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
              <span>Phúc khảo</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">3 đơn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-[#0B2A5B] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Chờ duyệt</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
              {pendingCount + 79}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-[#0B2A5B] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Đã duyệt</span>
            <span className="text-[11px] text-slate-400">{approvedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-[#0B2A5B] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Bị từ chối</span>
            <span className="text-[11px] text-slate-400">{rejectedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              activeTab === 'all'
                ? 'bg-[#0B2A5B] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả (420)
          </button>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs">
            <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="">Diện: Tất cả</option>
              <option value="chính sách">Chính sách</option>
              <option value="hộ nghèo">Hộ nghèo</option>
              <option value="vùng sâu">Vùng sâu</option>
              <option value="điểm">Điểm cao (&gt;26đ)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs">
            <span className="text-slate-400">Khóa:</span>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="k65">K65 (2026)</option>
              <option value="k64">K64</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs">
            <span className="text-slate-400">Giới tính:</span>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="nam">Nam</option>
              <option value="nu">Nữ</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => showToast('Đã đồng bộ danh sách đơn đăng ký mới nhất!', 'info')}
            className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Làm mới dữ liệu"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-4">Sinh viên</th>
                <th className="py-3.5 px-4">Diện ưu tiên</th>
                <th className="py-3.5 px-4">Nguyện vọng</th>
                <th className="py-3.5 px-4 text-center">Điểm ĐX</th>
                <th className="py-3.5 px-4">Nộp lúc</th>
                <th className="py-3.5 px-4 text-right">Duyệt 1-chạm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredApps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => setInspectingApp(app)}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                    {app.applicationCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <img
                        src={app.avatarUrl}
                        alt={app.studentName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors truncate">
                          {app.studentName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          <span className="font-mono">{app.mssv}</span> • {app.major}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-300">
                      {app.priorityCategory}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[16px] text-[#375ba9] dark:text-blue-400">
                        apartment
                      </span>
                      <span>{app.roomPreference}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-base text-[#0B2A5B] dark:text-blue-400 font-headline">
                    {app.scoreDX}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                    {app.submittedAt}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {app.status === 'Chờ duyệt' ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleDecision(e, app.id, 'approved', app.studentName)}
                            className="h-8 px-3 rounded-lg bg-[#0B2A5B] text-white hover:bg-[#143F8C] text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                            title="Duyệt hồ sơ nhanh"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDecision(e, app.id, 'rejected', app.studentName)}
                            className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center"
                            title="Từ chối"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            app.status === 'Đã duyệt'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          }`}
                        >
                          {app.status}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingApp(app);
                        }}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
                        title="Xem chi tiết"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-[#0B0F1A]/80 border-t border-slate-200/80 dark:border-[#232B3B] text-xs text-slate-500 dark:text-slate-400">
          <span>
            Hiển thị <strong className="text-slate-800 dark:text-white">{filteredApps.length}</strong> trong{' '}
            <strong className="text-slate-800 dark:text-white">{pendingCount + 79}</strong> đơn chờ duyệt
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="px-2 py-1 font-semibold text-[#0B2A5B] dark:text-blue-400">1 / 13</span>
            <button
              type="button"
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Candidate Dossier Modal */}
      {inspectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={inspectingApp.avatarUrl}
                  alt={inspectingApp.studentName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0B2A5B]/30"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectingApp.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    MSSV: {inspectingApp.mssv} • {inspectingApp.major} ({inspectingApp.cohort})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Diện ưu tiên
                  </span>
                  <span className="font-semibold text-[#0B2A5B] dark:text-blue-300 mt-0.5 block">
                    {inspectingApp.priorityCategory}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Điểm đề xuất
                  </span>
                  <span className="font-bold text-lg text-emerald-600 mt-0.5 block">
                    {inspectingApp.scoreDX} / 10
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Điểm thi tuyển sinh:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {inspectingApp.entranceScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quê quán / Khu vực:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {inspectingApp.hometown}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nguyện vọng phòng:</span>
                  <span className="font-semibold text-[#0B2A5B] dark:text-blue-400">
                    {inspectingApp.roomPreference}
                  </span>
                </div>
              </div>

              <div className="p-3 border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-blue-600">
                    description
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {inspectingApp.proofDocument}
                    </div>
                    <div className="text-[10px] text-slate-400">Đã kiểm tra đối chiếu bản scan</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast(`Xem chứng thực bản scan hồ sơ: ${inspectingApp.proofDocument}`, 'info')}
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-[#0B2A5B] dark:text-blue-300 font-semibold text-[11px] shadow-2xs border border-slate-200 dark:border-slate-700"
                >
                  Xem scan
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={(e) => {
                  handleDecision(e, inspectingApp.id, 'rejected', inspectingApp.studentName);
                  setInspectingApp(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Từ chối đơn
              </button>
              <button
                type="button"
                onClick={(e) => {
                  handleDecision(e, inspectingApp.id, 'approved', inspectingApp.studentName);
                  setInspectingApp(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs"
              >
                Duyệt & Xếp phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
