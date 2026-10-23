import React, { useState, useMemo } from 'react';
import { INITIAL_INVOICES, InvoiceItemData } from '../../data/mockData.ts';
import { formatVND } from '../../utils/calculations.ts';

interface InvoicesScreenProps {
  onShowToast: (msg: string) => void;
}

export const InvoicesScreen: React.FC<InvoicesScreenProps> = ({ onShowToast }) => {
  const [invoices, setInvoices] = useState<InvoiceItemData[]>(INITIAL_INVOICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('2026-03');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceItemData | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<InvoiceItemData | null>(null);
  const [confirmingInvoice, setConfirmingInvoice] = useState<InvoiceItemData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReminderConfigOpen, setIsReminderConfigOpen] = useState(false);

  // Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.room.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBuilding = buildingFilter === 'all' || item.building === buildingFilter;
      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchBuilding && matchCategory && matchStatus;
    });
  }, [invoices, searchTerm, buildingFilter, categoryFilter, statusFilter]);

  // Derived metrics
  const totalExpected = 486500000;
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) + 400000000;
  const totalDebt = totalExpected - totalPaid;
  const overdueCount = invoices.filter((i) => i.isOverdue && i.status !== 'paid').length + 22;

  const handleConfirmPayment = (invoice: InvoiceItemData) => {
    const updated = invoices.map((inv) => {
      if (inv.id === invoice.id) {
        return {
          ...inv,
          status: 'paid' as const,
          statusLabel: 'Đã nộp',
          isOverdue: false,
          method: 'Tiền mặt (BQL)',
          methodIcon: 'payments',
        };
      }
      return inv;
    });

    setInvoices(updated);
    setConfirmingInvoice(null);
    onShowToast(`Đã xác nhận thu tiền thành công cho hóa đơn ${invoice.code} (${formatVND(invoice.amount)})!`);
  };

  const handleSendReminders = () => {
    onShowToast(`Đã gửi thông báo nhắc nợ qua SMS và Email KTX tới ${overdueCount} sinh viên trễ hạn!`);
  };

  const handleExportReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Mã HĐ,Phòng,Sinh Viên,MSSV,Nội Dung,Số Tiền,Hạn Đóng,Phương Thức,Trạng Thái']
        .concat(
          filteredInvoices.map(
            (inv) =>
              `"${inv.code}","${inv.room}","${inv.studentName}","${inv.studentId}","${inv.title}",${inv.amount},"${inv.dueDate}","${inv.method}","${inv.statusLabel}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bao_cao_thu_phi_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Đã xuất báo cáo thu phí thành công!');
  };

  return (
    <div className="flex flex-col w-full gap-y-space-lg">
      {/* Title & Command Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
        <div>
          <div className="flex items-center gap-space-xs text-[#375ba9] mb-1">
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Tài chính &amp; Vận hành
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#00163a] tracking-tight font-bold">
            Quản lý Hóa đơn &amp; Thu phí
          </h1>
          <p className="font-body-md text-body-md text-[#747780]">
            Ký túc xá UTC2 · Đợt thu tập trung kỳ 2 (Tháng 03/2026)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-space-xs h-10 px-space-md rounded-xl bg-[#dfe8ff] text-[#111c2d] hover:bg-[#d9e3fb] transition-colors font-label-md text-label-md shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Xuất báo cáo thu</span>
          </button>
          <button
            onClick={handleSendReminders}
            className="flex items-center gap-space-xs h-10 px-space-md rounded-xl bg-[#ffdad6] text-[#93000a] hover:bg-[#ffdad6]/80 transition-colors font-label-md text-label-md shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">outgoing_mail</span>
            <span>Gửi nhắc nợ ({overdueCount})</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-space-xs h-10 px-space-md rounded-xl bg-[#00163a] text-white hover:bg-[#0b2a5b] transition-colors font-label-md text-label-md shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Tạo hóa đơn tháng</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="relative overflow-hidden rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỔNG PHẢI THU
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f0f3ff] flex items-center justify-center text-[#00163a]">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </span>
          </div>
          <div className="font-display-metric text-display-metric text-[#00163a] tabular-nums tracking-tight">
            486.500.000<span className="font-headline-sm text-headline-sm text-[#747780] ml-1">đ</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
              <div className="h-full bg-[#00163a] rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="font-code-metric text-code-metric text-[#747780] shrink-0">1.240 HĐ</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              ĐÃ THANH TOÁN
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#e8eeff] text-[#375ba9] font-code-metric text-code-metric font-semibold">
              84.7%
            </span>
          </div>
          <div className="font-display-metric text-display-metric text-[#111c2d] tabular-nums tracking-tight">
            412.300.000<span className="font-headline-sm text-headline-sm text-[#747780] ml-1">đ</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
              <div className="h-full bg-[#375ba9] rounded-full" style={{ width: '84.7%' }} />
            </div>
            <span className="font-code-metric text-code-metric text-[#375ba9] shrink-0">1.050 HĐ</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              CÒN NỢ / CHƯA NỘP
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#ffdad6]/60 text-[#ba1a1a] font-code-metric text-code-metric font-semibold">
              15.3%
            </span>
          </div>
          <div className="font-display-metric text-display-metric text-[#111c2d] tabular-nums tracking-tight">
            74.200.000<span className="font-headline-sm text-headline-sm text-[#747780] ml-1">đ</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
              <div className="h-full bg-[#ba1a1a] rounded-full" style={{ width: '15.3%' }} />
            </div>
            <span className="font-code-metric text-code-metric text-[#ba1a1a] shrink-0">190 HĐ</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              HÓA ĐƠN QUÁ HẠN
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-lg">warning</span>
            </span>
          </div>
          <div className="font-display-metric text-display-metric text-[#ba1a1a] tabular-nums tracking-tight">
            24 <span className="font-headline-sm text-headline-sm font-normal text-[#44474f]">hóa đơn</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-sm font-body-sm text-[#747780]">
            <span>Tổng giá trị trễ hạn</span>
            <span className="font-code-metric text-code-metric text-[#ba1a1a] font-semibold">18.450.000 đ</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl bg-white p-space-md shadow-xs flex flex-col gap-space-md border border-[#dfe8ff]/60">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#747780] text-lg pointer-events-none">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-space-md rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:bg-white focus:ring-2 focus:ring-[#00163a]/20 border border-transparent focus:border-[#c4c6d0] transition-all"
              placeholder="Tìm mã hóa đơn (HD-...), tên SV, hoặc mã số SV (72DCHT...)"
              type="text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center bg-[#f0f3ff] rounded-xl px-space-sm py-1 border border-transparent hover:border-[#c4c6d0]">
              <span className="material-symbols-outlined text-[#747780] text-base mr-1">domain</span>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-space-sm py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả Tòa nhà</option>
                <option value="A1">Tòa A1</option>
                <option value="A2">Tòa A2</option>
                <option value="A3">Tòa A3</option>
                <option value="B1">Tòa B1</option>
                <option value="B2">Tòa B2</option>
              </select>
            </div>

            <div className="flex items-center bg-[#f0f3ff] rounded-xl px-space-sm py-1 border border-transparent hover:border-[#c4c6d0]">
              <span className="material-symbols-outlined text-[#747780] text-base mr-1">category</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-space-sm py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả Loại phí</option>
                <option value="tonghop">Tổng hợp (Phòng + Điện nước)</option>
                <option value="phong">Tiền phòng</option>
                <option value="diennuoc">Điện nước</option>
                <option value="guixe">Phí gửi xe</option>
              </select>
            </div>

            <div className="flex items-center bg-[#f0f3ff] rounded-xl px-space-sm py-1 border border-transparent hover:border-[#c4c6d0]">
              <span className="material-symbols-outlined text-[#747780] text-base mr-1">tune</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-space-sm py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="paid">Đã nộp</option>
                <option value="pending">Chờ nộp</option>
                <option value="overdue">Nợ quá hạn / Khó đòi</option>
              </select>
            </div>

            <div className="flex items-center bg-[#f0f3ff] rounded-xl px-space-sm py-1 border border-transparent hover:border-[#c4c6d0]">
              <span className="material-symbols-outlined text-[#747780] text-base mr-1">calendar_today</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-transparent text-[#111c2d] font-label-md text-label-md font-medium pr-space-sm py-1 focus:outline-none cursor-pointer"
              >
                <option value="2026-03">Đợt Tháng 03/2026</option>
                <option value="2026-02">Đợt Tháng 02/2026</option>
                <option value="2026-01">Đợt Tháng 01/2026</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setBuildingFilter('all');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="h-10 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#e8eeff] text-[#111c2d] flex items-center justify-center transition-colors cursor-pointer"
              title="Làm mới bộ lọc"
              type="button"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-white shadow-xs overflow-hidden flex flex-col border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#747780] font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-space-md font-semibold">Mã HĐ</th>
                <th className="py-3 px-space-md font-semibold">Phòng &amp; Tòa</th>
                <th className="py-3 px-space-md font-semibold">Sinh viên đại diện</th>
                <th className="py-3 px-space-md font-semibold">Nội dung thu</th>
                <th className="py-3 px-space-md text-right font-semibold">Số tiền</th>
                <th className="py-3 px-space-md font-semibold">Hạn đóng</th>
                <th className="py-3 px-space-md font-semibold">Phương thức</th>
                <th className="py-3 px-space-md font-semibold text-center">Trạng thái</th>
                <th className="py-3 px-space-md text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff] text-[#111c2d] font-body-md text-body-md">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#f0f3ff]/60 transition-colors">
                  <td className="py-3.5 px-space-md font-code-metric text-code-metric font-semibold text-[#00163a]">
                    {inv.code}
                  </td>
                  <td className="py-3.5 px-space-md">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#e8eeff] font-code-metric text-code-metric text-[#111c2d] font-medium">
                      {inv.room}
                    </span>
                  </td>
                  <td className="py-3.5 px-space-md">
                    <div className="font-medium text-[#111c2d]">{inv.studentName}</div>
                    <div className="font-label-sm text-label-sm text-[#747780]">{inv.studentId}</div>
                  </td>
                  <td className="py-3.5 px-space-md">
                    <span className="inline-flex items-center gap-1.5 text-[#111c2d]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: inv.categoryColor }} />
                      {inv.title}
                    </span>
                  </td>
                  <td
                    className={`py-3.5 px-space-md text-right font-code-metric text-code-metric font-bold tabular-nums ${
                      inv.status === 'overdue' ? 'text-[#ba1a1a]' : 'text-[#00163a]'
                    }`}
                  >
                    {formatVND(inv.amount)}
                  </td>
                  <td
                    className={`py-3.5 px-space-md font-label-md text-label-md ${
                      inv.isOverdue ? 'text-[#ba1a1a] font-medium' : 'text-[#747780]'
                    }`}
                  >
                    {inv.dueDate} {inv.overdueText && `(${inv.overdueText})`}
                  </td>
                  <td className="py-3.5 px-space-md">
                    <div className="flex items-center gap-1.5 font-label-md text-label-md text-[#44474f]">
                      {inv.methodIcon && (
                        <span className="material-symbols-outlined text-base text-[#375ba9]">
                          {inv.methodIcon}
                        </span>
                      )}
                      <span>{inv.method}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-space-md text-center">
                    {inv.status === 'paid' && (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#dfe8ff] text-[#375ba9] font-label-sm text-label-sm font-semibold">
                        Đã nộp
                      </span>
                    )}
                    {inv.status === 'pending' && (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-label-sm text-label-sm font-semibold">
                        Chờ nộp
                      </span>
                    )}
                    {inv.status === 'overdue' && (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#ffdad6] text-[#93000a] font-label-sm text-label-sm font-semibold">
                        Nợ khó đòi
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-space-md text-right">
                    <div className="inline-flex items-center gap-1">
                      {inv.status !== 'paid' ? (
                        <>
                          <button
                            onClick={() => setConfirmingInvoice(inv)}
                            className="h-8 px-2.5 rounded-lg bg-[#00163a] text-white hover:bg-[#0b2a5b] font-label-sm text-label-sm font-medium transition-colors cursor-pointer"
                            type="button"
                          >
                            Xác nhận nộp
                          </button>
                          <button
                            onClick={() => onShowToast(`Đã gửi thông báo nhắc nợ tới ${inv.studentName} (${inv.code})`)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#44474f] hover:text-[#00163a] transition-colors cursor-pointer"
                            title="Gửi nhắc nợ cá nhân"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">notifications_active</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#44474f] hover:text-[#00163a] transition-colors cursor-pointer"
                            title="In phiếu thu"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">print</span>
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eeff] text-[#44474f] hover:text-[#00163a] transition-colors cursor-pointer"
                            title="Xem chi tiết"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-space-md bg-[#f0f3ff] flex flex-col sm:flex-row items-center justify-between gap-space-sm text-[#747780]">
          <div className="font-body-sm text-body-sm">
            Hiển thị <span className="font-semibold text-[#111c2d]">1 - {filteredInvoices.length}</span> trên tổng số{' '}
            <span className="font-semibold text-[#111c2d]">1.240</span> hóa đơn
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg bg-white text-[#747780] hover:text-[#111c2d] flex items-center justify-center transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-8 h-8 rounded-lg font-code-metric text-code-metric font-semibold flex items-center justify-center shadow-xs cursor-pointer ${
                currentPage === 1 ? 'bg-[#00163a] text-white' : 'bg-white text-[#111c2d] hover:bg-[#e8eeff]'
              }`}
              type="button"
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-8 h-8 rounded-lg font-code-metric text-code-metric flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                currentPage === 2 ? 'bg-[#00163a] text-white' : 'bg-white text-[#111c2d] hover:bg-[#e8eeff]'
              }`}
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-8 h-8 rounded-lg font-code-metric text-code-metric flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                currentPage === 3 ? 'bg-[#00163a] text-white' : 'bg-white text-[#111c2d] hover:bg-[#e8eeff]'
              }`}
              type="button"
            >
              3
            </button>
            <span className="px-1 text-[#747780] font-label-sm">...</span>
            <button
              onClick={() => setCurrentPage(207)}
              className={`w-8 h-8 rounded-lg font-code-metric text-code-metric flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                currentPage === 207 ? 'bg-[#00163a] text-white' : 'bg-white text-[#111c2d] hover:bg-[#e8eeff]'
              }`}
              type="button"
            >
              207
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(207, p + 1))}
              className="w-8 h-8 rounded-lg bg-white text-[#747780] hover:text-[#111c2d] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Operational Analytic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TỶ LỆ PHƯƠNG THỨC THU
            </span>
            <span className="material-symbols-outlined text-[#375ba9] text-lg">donut_large</span>
          </div>
          <div className="space-y-space-sm">
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="font-medium text-[#111c2d]">VNPAY QR &amp; Cổng trực tuyến</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#375ba9]">68.4%</span>
              </div>
              <div className="h-2 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#375ba9] rounded-full" style={{ width: '68.4%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="font-medium text-[#111c2d]">Chuyển khoản Ngân hàng</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#00163a]">24.2%</span>
              </div>
              <div className="h-2 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#00163a] rounded-full" style={{ width: '24.2%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="font-medium text-[#111c2d]">Tiền mặt tại Văn phòng KTX</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#747780]">7.4%</span>
              </div>
              <div className="h-2 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#747780] rounded-full" style={{ width: '7.4%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-space-lg shadow-xs border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
              TIẾN ĐỘ THU THEO TÒA
            </span>
            <span className="material-symbols-outlined text-[#00163a] text-lg">apartment</span>
          </div>
          <div className="space-y-space-sm">
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="text-[#111c2d]">Tòa A1 · Nam</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#00163a]">91%</span>
              </div>
              <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#00163a] rounded-full" style={{ width: '91%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="text-[#111c2d]">Tòa A2 · Nữ</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#00163a]">88%</span>
              </div>
              <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#00163a] rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm mb-1">
                <span className="text-[#111c2d]">Tòa A3 · Tổng hợp</span>
                <span className="font-code-metric text-code-metric font-semibold text-[#ba1a1a]">72%</span>
              </div>
              <div className="h-1.5 w-full bg-[#dfe8ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#ba1a1a] rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#00163a] text-white p-space-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-space-xs text-[#d8e2ff] mb-1">
              <span className="material-symbols-outlined text-base">info</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                LƯU Ý NGHIỆP VỤ
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-white mb-2 font-bold">Hạn chót đóng tiền T03</h3>
            <p className="font-body-md text-body-md text-[#7a93ca]">
              Sau 24h ngày 15/03/2026, hệ thống tự động khóa thẻ ra vào KTX và dịch vụ Internet đối với các phòng chưa
              hoàn tất nghĩa vụ tài chính.
            </p>
          </div>
          <div className="pt-space-md flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-[#d8e2ff]">Tự động hóa bởi KTX UTC2</span>
            <button
              onClick={() => setIsReminderConfigOpen(true)}
              className="h-8 px-space-sm rounded-lg bg-[#dfe8ff] text-[#00163a] hover:bg-white font-label-md text-label-md font-semibold transition-colors cursor-pointer"
              type="button"
            >
              Cấu hình nhắc nợ
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Xác nhận nộp tiền */}
      {confirmingInvoice && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">price_check</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Xác Nhận Nộp Tiền</h2>
              </div>
              <button
                onClick={() => setConfirmingInvoice(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f0f3ff] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#747780]">Mã hóa đơn:</span>
                <span className="font-code-metric font-bold text-[#00163a]">{confirmingInvoice.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747780]">Sinh viên:</span>
                <span className="font-semibold text-[#111c2d]">
                  {confirmingInvoice.studentName} ({confirmingInvoice.studentId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747780]">Phòng &amp; Tòa:</span>
                <span className="font-semibold text-[#111c2d]">{confirmingInvoice.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747780]">Nội dung thu:</span>
                <span className="font-medium text-[#111c2d]">{confirmingInvoice.title}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#dfe8ff] text-sm">
                <span className="font-bold text-[#00163a]">Số tiền thực thu:</span>
                <span className="font-code-metric font-bold text-emerald-700">
                  {formatVND(confirmingInvoice.amount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#747780]">
              Chọn hình thức thu tiền mặt hoặc quét mã POS tại văn phòng Ban Quản lý KTX UTC2.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmingInvoice(null)}
                className="flex-1 h-10 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold hover:bg-[#dfe8ff]"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleConfirmPayment(confirmingInvoice)}
                className="flex-1 h-10 rounded-xl bg-[#00163a] text-white text-xs font-semibold hover:bg-[#0b2a5b] shadow-xs"
              >
                Xác nhận đã thu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: In Phiếu Thu */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">receipt</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Phiếu Thu Điện Tử</h2>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 border-2 border-dashed border-[#dfe8ff] rounded-xl space-y-3 bg-[#f9f9ff]">
              <div className="text-center pb-2 border-b border-[#dfe8ff]">
                <div className="font-bold text-sm text-[#00163a]">KÝ TÚC XÁ PHÂN HIỆU UTC2 TP.HCM</div>
                <div className="text-[11px] text-[#747780]">Đường Tăng Nhơn Phú, P. Hiệp Phú, TP. Thủ Đức, TP.HCM</div>
                <div className="text-xs font-bold text-[#375ba9] mt-2">PHIẾU THU TIỀN KÝ TÚC XÁ</div>
                <div className="font-code-metric text-[11px] text-[#747780]">Mã: {selectedInvoiceForPrint.code}</div>
              </div>

              <div className="text-xs space-y-1.5 text-[#111c2d]">
                <div className="flex justify-between">
                  <span className="text-[#747780]">Họ và tên:</span>
                  <span className="font-bold">{selectedInvoiceForPrint.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#747780]">Mã số sinh viên:</span>
                  <span className="font-code-metric">{selectedInvoiceForPrint.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#747780]">Phòng lưu trú:</span>
                  <span className="font-semibold">{selectedInvoiceForPrint.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#747780]">Nội dung thu:</span>
                  <span>{selectedInvoiceForPrint.title}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#dfe8ff] text-sm">
                  <span className="font-bold text-[#00163a]">Tổng thanh toán:</span>
                  <span className="font-code-metric font-bold text-[#00163a]">
                    {formatVND(selectedInvoiceForPrint.amount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                ĐÃ HOÀN TẤT THANH TOÁN (HỆ THỐNG UTC2)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  window.print();
                  setSelectedInvoiceForPrint(null);
                }}
                className="px-4 h-9 rounded-xl bg-[#00163a] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                In phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết hóa đơn */}
      {selectedInvoiceForDetail && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <h2 className="font-headline-sm text-base font-bold text-[#00163a]">
                Chi Tiết Hóa Đơn {selectedInvoiceForDetail.code}
              </h2>
              <button
                onClick={() => setSelectedInvoiceForDetail(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Sinh viên đại diện:</span>
                <span className="font-bold text-[#111c2d]">{selectedInvoiceForDetail.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">MSSV:</span>
                <span className="font-code-metric">{selectedInvoiceForDetail.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Phòng &amp; Tòa:</span>
                <span className="font-semibold">{selectedInvoiceForDetail.room}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Khoản thu:</span>
                <span>{selectedInvoiceForDetail.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3ff]">
                <span className="text-[#747780]">Phương thức thanh toán:</span>
                <span className="font-medium text-[#375ba9]">{selectedInvoiceForDetail.method}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-bold text-[#00163a]">
                <span>Tổng tiền:</span>
                <span className="font-code-metric">{formatVND(selectedInvoiceForDetail.amount)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceForDetail(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo hóa đơn tháng mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">post_add</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Tạo Đợt Hóa Đơn Tháng</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Chọn Đợt Thu Phí</label>
                <select className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none">
                  <option>Đợt thu Tháng 04/2026 (Kỳ 3)</option>
                  <option>Đợt thu Tháng 03/2026 (Kỳ 2)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Áp dụng cho phạm vi</label>
                <select className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none">
                  <option>Tất cả các tòa KTX (A1, A2, A3, B1, B2, C1)</option>
                  <option>Khu A (Tòa A1, A2, A3)</option>
                  <option>Khu B (Tòa B1, B2, B3)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <span className="font-semibold text-[#44474f]">Bao gồm các khoản thu:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input defaultChecked type="checkbox" className="accent-[#00163a]" />
                  <span>Tiền buồng phòng học kỳ / tháng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input defaultChecked type="checkbox" className="accent-[#00163a]" />
                  <span>Điện nước theo chỉ số công tơ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input defaultChecked type="checkbox" className="accent-[#00163a]" />
                  <span>Dịch vụ Internet &amp; Vệ sinh môi trường</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f3ff]">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  onShowToast('Đã khởi tạo đợt hóa đơn tháng thành công cho 320 phòng!');
                }}
                className="px-5 h-9 rounded-xl bg-[#00163a] text-white text-xs font-semibold shadow-xs"
              >
                Khởi tạo ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cấu hình nhắc nợ tự động */}
      {isReminderConfigOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">schedule</span>
                <h2 className="font-headline-sm text-base font-bold text-[#00163a]">Cấu Hình Nhắc Nợ Tự Động</h2>
              </div>
              <button
                onClick={() => setIsReminderConfigOpen(false)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#f0f3ff]">
                <span>Tự động gửi thông báo trước hạn 3 ngày</span>
                <input type="checkbox" defaultChecked className="accent-[#00163a]" />
              </label>
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#f0f3ff]">
                <span>Tự động gửi thông báo trong ngày hạn đóng</span>
                <input type="checkbox" defaultChecked className="accent-[#00163a]" />
              </label>
              <label className="flex items-center justify-between p-2 rounded-xl bg-[#f0f3ff]">
                <span>Khóa thẻ KTX và Internet sau quá hạn 5 ngày</span>
                <input type="checkbox" defaultChecked className="accent-[#ba1a1a]" />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsReminderConfigOpen(false)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setIsReminderConfigOpen(false);
                  onShowToast('Đã lưu cấu hình nhắc nợ tự động thành công!');
                }}
                className="px-4 h-9 rounded-xl bg-[#00163a] text-white text-xs font-semibold"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
