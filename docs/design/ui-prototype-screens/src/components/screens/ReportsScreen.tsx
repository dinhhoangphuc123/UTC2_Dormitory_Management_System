import React, { useState } from 'react';
import { BUILDING_OPERATIONS } from '../../data/mockData.ts';

interface ReportsScreenProps {
  onShowToast: (msg: string) => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ onShowToast }) => {
  const [semester, setSemester] = useState('Năm học 2026-2027 · HK1');
  const [reportType, setReportType] = useState('Báo cáo buồng phòng & lấp đầy');
  const [dormScope, setDormScope] = useState('Toàn phân khu KTX (Tất cả)');

  const handleExportExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Tòa Nhà,Tổng Phòng,Tổng Giường,Đang Ở,Còn Trống,Tỷ Lệ Lấp Đầy,Doanh Thu Kỳ,Trạng Thái']
        .concat(
          BUILDING_OPERATIONS.map(
            (b) =>
              `"${b.name}",${b.rooms},${b.beds},${b.occupied},${b.vacant},"${b.rate}%","${b.revenue}","${b.status}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bao_cao_ktx_utc2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Đã xuất báo cáo thống kê sang file Excel (CSV) thành công!');
  };

  const handleDownloadPDF = () => {
    window.print();
    onShowToast('Đang tạo bản in PDF báo cáo thống kê KTX UTC2...');
  };

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* CONTROL BAR & FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md bg-[#f0f3ff] p-space-md rounded-xl shadow-xs border border-[#dfe8ff]/60">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          {/* Học kỳ */}
          <div className="relative flex items-center bg-white px-space-md py-2 rounded-lg shadow-xs border border-[#dfe8ff]">
            <span className="material-symbols-outlined text-[#375ba9] text-base mr-2 pointer-events-none">
              event_available
            </span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-6 focus:outline-none cursor-pointer appearance-none"
            >
              <option value="Năm học 2026-2027 · HK1">Năm học 2026-2027 · HK1</option>
              <option value="Năm học 2025-2026 · HK2">Năm học 2025-2026 · HK2</option>
              <option value="Năm học 2025-2026 · HK1">Năm học 2025-2026 · HK1</option>
            </select>
            <span className="material-symbols-outlined text-[#747780] text-sm absolute right-2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Loại báo cáo */}
          <div className="relative flex items-center bg-white px-space-md py-2 rounded-lg shadow-xs border border-[#dfe8ff]">
            <span className="material-symbols-outlined text-[#375ba9] text-base mr-2 pointer-events-none">
              pie_chart
            </span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-6 focus:outline-none cursor-pointer appearance-none"
            >
              <option value="Báo cáo buồng phòng & lấp đầy">Báo cáo buồng phòng &amp; lấp đầy</option>
              <option value="Báo cáo thu chi & công nợ">Báo cáo thu chi &amp; công nợ</option>
              <option value="Báo cáo cơ sở vật chất">Báo cáo cơ sở vật chất</option>
              <option value="Báo cáo vi phạm kỷ luật">Báo cáo vi phạm kỷ luật</option>
            </select>
            <span className="material-symbols-outlined text-[#747780] text-sm absolute right-2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Phạm vi tòa */}
          <div className="relative flex items-center bg-white px-space-md py-2 rounded-lg shadow-xs border border-[#dfe8ff]">
            <span className="material-symbols-outlined text-[#375ba9] text-base mr-2 pointer-events-none">
              domain
            </span>
            <select
              value={dormScope}
              onChange={(e) => setDormScope(e.target.value)}
              className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-6 focus:outline-none cursor-pointer appearance-none"
            >
              <option value="Toàn phân khu KTX (Tất cả)">Toàn phân khu KTX (Tất cả)</option>
              <option value="Khu A (A01, A02, A03)">Khu A (A01, A02, A03)</option>
              <option value="Khu B (B01, B02, B03)">Khu B (B01, B02, B03)</option>
            </select>
            <span className="material-symbols-outlined text-[#747780] text-sm absolute right-2 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Nút hành động tải dữ liệu */}
        <div className="flex items-center gap-space-xs shrink-0">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white text-[#111c2d] hover:bg-[#dfe8ff] transition-all px-space-md h-10 rounded-lg shadow-xs font-label-md text-label-md font-medium border border-[#dfe8ff] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg text-[#375ba9]">table_view</span>
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-[#0b2a5b] text-white hover:bg-[#00163a] transition-all px-space-md h-10 rounded-lg shadow-xs font-label-md text-label-md font-medium cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            <span>Tải PDF</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Thẻ 1 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỔNG CÔNG SUẤT
            </span>
            <div className="w-7 h-7 rounded-full bg-[#dfe8ff] flex items-center justify-center text-[#00163a]">
              <span className="material-symbols-outlined text-sm">bed</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              3.600 <span className="font-body-md text-body-md text-[#747780] font-normal">giường</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-[#747780]">
            <span>6 tòa / 450 phòng</span>
            <span className="text-[#44474f] font-medium">100% bàn giao</span>
          </div>
          <div className="w-full bg-[#dfe8ff] h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#00163a] h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Thẻ 2 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỶ LỆ LẤP ĐẦY
            </span>
            <div className="px-2 py-0.5 rounded-full bg-[#dfe8ff] text-[#375ba9] font-code-metric text-code-metric font-semibold">
              95.0%
            </div>
          </div>
          <div className="my-3">
            <div className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              3.420 <span className="font-body-md text-body-md text-[#747780] font-normal">sinh viên</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-[#747780]">
            <span>Trống khả dụng</span>
            <span className="text-[#375ba9] font-semibold font-code-metric text-code-metric">180 giường</span>
          </div>
          <div className="w-full bg-[#dfe8ff] h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '95%' }} />
          </div>
        </div>

        {/* Thẻ 3 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              DOANH THU HỌC KỲ
            </span>
            <div className="w-7 h-7 rounded-full bg-[#dfe8ff] flex items-center justify-center text-[#375ba9]">
              <span className="material-symbols-outlined text-sm">payments</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              5,24 <span className="font-body-md text-body-md text-[#747780] font-normal">tỷ đ</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-[#747780]">
            <span>Kế hoạch: 5,41 tỷ</span>
            <span className="text-[#375ba9] font-semibold font-code-metric text-code-metric">+11.4% yoy</span>
          </div>
          <div className="w-full bg-[#dfe8ff] h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#0b2a5b] h-full rounded-full" style={{ width: '96.8%' }} />
          </div>
        </div>

        {/* Thẻ 4 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỶ LỆ THU ĐẠT
            </span>
            <div className="px-2 py-0.5 rounded-full bg-[#dfe8ff] text-[#00163a] font-code-metric text-code-metric font-semibold">
              96.8%
            </div>
          </div>
          <div className="my-3">
            <div className="font-display-metric text-display-metric font-bold text-[#111c2d] tracking-tight">
              5.072 <span className="font-body-md text-body-md text-[#747780] font-normal">triệu đ</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-[#747780]">
            <span>Còn tồn đọng</span>
            <span className="text-[#ba1a1a] font-medium font-code-metric text-code-metric">168 triệu đ</span>
          </div>
          <div className="w-full bg-[#dfe8ff] h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#88a9fd] h-full rounded-full" style={{ width: '96.8%' }} />
          </div>
        </div>
      </div>

      {/* VISUAL ANALYSIS SECTION: 2 COLUMNS (2:1 RATIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        {/* Left: Phân bổ SV theo Khoa/Viện */}
        <div className="lg:col-span-2 bg-white p-space-xl rounded-xl shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-space-lg">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-[#111c2d] tracking-tight">
                Phân bổ sinh viên theo Khoa / Viện
              </h2>
              <p className="font-body-sm text-body-sm text-[#747780] mt-0.5">
                3.420 sinh viên nội trú phân bổ theo đơn vị chuyên môn
              </p>
            </div>
            <div className="flex items-center gap-space-xs font-code-metric text-code-metric text-[#747780] bg-[#f0f3ff] px-2.5 py-1 rounded-md">
              <span>HK1 2026-2027</span>
            </div>
          </div>

          {/* Metric Bars Grid */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label-md text-label-md font-medium text-[#111c2d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0b2a5b]" />
                  Khoa Kỹ thuật Giao thông
                </span>
                <div className="flex items-center gap-space-sm font-code-metric text-code-metric">
                  <span className="text-[#111c2d] font-semibold">1.180 SV</span>
                  <span className="text-[#747780] w-12 text-right">34.5%</span>
                </div>
              </div>
              <div className="w-full bg-[#f0f3ff] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#0b2a5b] h-full rounded-full transition-all duration-500" style={{ width: '34.5%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label-md text-label-md font-medium text-[#111c2d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#375ba9]" />
                  Khoa Công nghệ Thông tin
                </span>
                <div className="flex items-center gap-space-sm font-code-metric text-code-metric">
                  <span className="text-[#111c2d] font-semibold">890 SV</span>
                  <span className="text-[#747780] w-12 text-right">26.0%</span>
                </div>
              </div>
              <div className="w-full bg-[#f0f3ff] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#375ba9] h-full rounded-full transition-all duration-500" style={{ width: '26.0%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label-md text-label-md font-medium text-[#111c2d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#88a9fd]" />
                  Khoa Điện - Điện tử
                </span>
                <div className="flex items-center gap-space-sm font-code-metric text-code-metric">
                  <span className="text-[#111c2d] font-semibold">615 SV</span>
                  <span className="text-[#747780] w-12 text-right">18.0%</span>
                </div>
              </div>
              <div className="w-full bg-[#f0f3ff] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#88a9fd] h-full rounded-full transition-all duration-500" style={{ width: '18.0%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label-md text-label-md font-medium text-[#111c2d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#455e91]" />
                  Khoa Kinh tế Vận tải &amp; Logistics
                </span>
                <div className="flex items-center gap-space-sm font-code-metric text-code-metric">
                  <span className="text-[#111c2d] font-semibold">480 SV</span>
                  <span className="text-[#747780] w-12 text-right">14.0%</span>
                </div>
              </div>
              <div className="w-full bg-[#f0f3ff] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#455e91] h-full rounded-full transition-all duration-500" style={{ width: '14.0%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-label-md text-label-md font-medium text-[#111c2d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#c4c6d0]" />
                  Khoa Khoa học Cơ bản &amp; Khác
                </span>
                <div className="flex items-center gap-space-sm font-code-metric text-code-metric">
                  <span className="text-[#111c2d] font-semibold">255 SV</span>
                  <span className="text-[#747780] w-12 text-right">7.5%</span>
                </div>
              </div>
              <div className="w-full bg-[#f0f3ff] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#c4c6d0] h-full rounded-full transition-all duration-500" style={{ width: '7.5%' }} />
              </div>
            </div>
          </div>

          {/* Quick summary footer */}
          <div className="pt-4 mt-4 border-t border-[#f0f3ff] flex flex-col sm:flex-row items-start sm:items-center justify-between text-body-sm font-body-sm text-[#747780] gap-2">
            <span>
              Tỷ lệ phân bổ nam/nữ:{' '}
              <strong className="text-[#111c2d]">72% Nam · 28% Nữ</strong>
            </span>
            <span>
              Mức độ ưu tiên chính sách:{' '}
              <strong className="text-[#111c2d]">385 SV (11.2%)</strong>
            </span>
          </div>
        </div>

        {/* Right: Cơ cấu Doanh thu (Donut Chart) */}
        <div className="bg-white p-space-xl rounded-xl shadow-xs flex flex-col justify-between border border-[#dfe8ff]/60">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-[#111c2d] tracking-tight">
              Cơ cấu Doanh thu
            </h2>
            <p className="font-body-sm text-body-sm text-[#747780] mt-0.5">
              Tổng thu ghi nhận: 5.240.000.000 đ
            </p>
          </div>

          {/* SVG Donut Chart */}
          <div className="relative flex items-center justify-center my-6">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                className="text-[#f0f3ff]"
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="currentColor"
                strokeWidth="14"
              />
              {/* Segment 1: Tiền phòng 75% */}
              <circle
                className="text-[#0b2a5b]"
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="currentColor"
                strokeDasharray="226.2 301.6"
                strokeDashoffset="0"
                strokeLinecap="round"
                strokeWidth="14"
              />
              {/* Segment 2: Điện nước 20% */}
              <circle
                className="text-[#375ba9]"
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="currentColor"
                strokeDasharray="60.3 301.6"
                strokeDashoffset="-226.2"
                strokeLinecap="round"
                strokeWidth="14"
              />
              {/* Segment 3: Dịch vụ khác 5% */}
              <circle
                className="text-[#88a9fd]"
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="currentColor"
                strokeDasharray="15.1 301.6"
                strokeDashoffset="-286.5"
                strokeLinecap="round"
                strokeWidth="14"
              />
            </svg>

            {/* Centered Metric Inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-code-metric text-code-metric text-[#747780] uppercase tracking-wider text-[11px]">
                Tỷ lệ phòng
              </span>
              <span className="font-headline-lg text-headline-lg font-bold text-[#111c2d] leading-none mt-0.5">
                75%
              </span>
              <span className="font-label-sm text-label-sm text-[#375ba9] font-medium">
                3,93 tỷ đ
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-body-md text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#0b2a5b] shrink-0" />
                <span className="text-[#111c2d]">Tiền buồng phòng</span>
              </div>
              <div className="font-code-metric text-code-metric font-semibold text-[#111c2d]">
                3.930.000.000 đ <span className="text-[#747780] font-normal ml-1">75%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-body-md text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#375ba9] shrink-0" />
                <span className="text-[#111c2d]">Điện, nước &amp; mạng</span>
              </div>
              <div className="font-code-metric text-code-metric font-semibold text-[#111c2d]">
                1.048.000.000 đ <span className="text-[#747780] font-normal ml-1">20%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-body-md text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#88a9fd] shrink-0" />
                <span className="text-[#111c2d]">Dịch vụ gửi xe &amp; khác</span>
              </div>
              <div className="font-code-metric text-code-metric font-semibold text-[#111c2d]">
                262.000.000 đ <span className="text-[#747780] font-normal ml-1">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE: SUMMARY BY DORMITORY BLOCK */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-[#dfe8ff]/60">
        <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-[#f0f3ff]">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-[#111c2d] tracking-tight">
              Số liệu Vận hành theo từng Tòa nhà
            </h2>
            <p className="font-body-sm text-body-sm text-[#747780] mt-0.5">
              Theo dõi chi tiết số chỗ, công suất và trạng thái cơ sở hạ tầng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-[#747780]">Cập nhật: Hôm nay 14:30</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#747780] font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-space-lg font-semibold">Tòa nhà</th>
                <th className="py-3 px-space-md font-semibold text-right">Tổng phòng</th>
                <th className="py-3 px-space-md font-semibold text-right">Tổng giường</th>
                <th className="py-3 px-space-md font-semibold text-right">Đang ở</th>
                <th className="py-3 px-space-md font-semibold text-right">Còn trống</th>
                <th className="py-3 px-space-md font-semibold">Tỷ lệ lấp đầy</th>
                <th className="py-3 px-space-md font-semibold text-right">Doanh thu kỳ</th>
                <th className="py-3 px-space-lg font-semibold text-center">Trạng thái CSVC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff] text-body-md text-sm text-[#111c2d]">
              {BUILDING_OPERATIONS.map((b, i) => (
                <tr key={i} className="hover:bg-[#f0f3ff]/60 transition-colors">
                  <td className="py-3 px-space-lg font-semibold flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        b.name.includes('Nam') ? 'bg-[#375ba9]' : 'bg-[#88a9fd]'
                      }`}
                    />
                    {b.name}
                  </td>
                  <td className="py-3 px-space-md text-right font-code-metric text-code-metric">{b.rooms}</td>
                  <td className="py-3 px-space-md text-right font-code-metric text-code-metric">{b.beds}</td>
                  <td className="py-3 px-space-md text-right font-code-metric text-code-metric font-medium text-[#00163a]">
                    {b.occupied}
                  </td>
                  <td className="py-3 px-space-md text-right font-code-metric text-code-metric text-[#747780]">
                    {b.vacant}
                  </td>
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#dfe8ff] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0b2a5b] h-full rounded-full"
                          style={{ width: `${b.rate}%` }}
                        />
                      </div>
                      <span className="font-code-metric text-code-metric text-[#747780]">{b.rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-space-md text-right font-code-metric text-code-metric font-semibold">
                    {b.revenue}
                  </td>
                  <td className="py-3 px-space-lg text-center">
                    {b.statusColor === 'stable' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-sm font-medium bg-[#dfe8ff] text-[#375ba9]">
                        {b.status}
                      </span>
                    )}
                    {b.statusColor === 'warning' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-sm font-medium bg-[#ffdad6] text-[#ba1a1a]">
                        {b.status}
                      </span>
                    )}
                    {b.statusColor === 'info' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-sm font-medium bg-[#f0f3ff] text-[#44474f]">
                        {b.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table summary bar */}
        <div className="bg-[#f0f3ff] px-space-lg py-3 flex flex-wrap items-center justify-between text-body-sm text-[#747780] border-t border-[#dfe8ff]/60">
          <div className="flex items-center gap-4">
            <span>
              Tổng cộng: <strong className="text-[#111c2d]">6 tòa</strong>
            </span>
            <span>·</span>
            <span>
              Tổng phòng: <strong className="text-[#111c2d]">450</strong>
            </span>
            <span>·</span>
            <span>
              Giường khả dụng: <strong className="text-[#111c2d]">3.600</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Tổng thực thu tích lũy:</span>
            <span className="font-code-metric text-code-metric font-bold text-[#111c2d] text-base">
              5.240.000.000 đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
