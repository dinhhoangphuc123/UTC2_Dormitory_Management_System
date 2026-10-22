import React, { useState } from 'react';
import { Contract, Student } from '../types';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contractData: Partial<Contract>) => void;
}

export const NewContractModal: React.FC<NewContractModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [studentName, setStudentName] = useState('Trần Văn Bình');
  const [mssv, setMssv] = useState('2451080099');
  const [roomNumber, setRoomNumber] = useState('A102');
  const [bedNumber, setBedNumber] = useState('G05');
  const [monthlyFee, setMonthlyFee] = useState(500000);
  const [depositAmount, setDepositAmount] = useState(500000);
  const [startDate, setStartDate] = useState('01/10/2026');
  const [endDate, setEndDate] = useState('30/06/2027');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      contractNumber: `HĐ-2026-${roomNumber}-${bedNumber}`,
      studentName,
      mssv,
      roomNumber,
      bedNumber,
      monthlyFee,
      depositAmount,
      depositStatus: 'Đã nộp',
      startDate,
      endDate,
      status: 'Hiệu lực',
      remainingDays: 240,
      avatarInitials: studentName.split(' ').map((n) => n[0]).slice(-2).join(''),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">
              post_add
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Lập hợp đồng nội trú mới
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên sinh viên
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MSSV
              </label>
              <input
                type="text"
                required
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phòng
              </label>
              <select
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="A101">A101 (Tòa A)</option>
                <option value="A102">A102 (Tòa A)</option>
                <option value="A205">A205 (Tòa A)</option>
                <option value="B208">B208 (Tòa B)</option>
                <option value="B302">B302 (Tòa B)</option>
                <option value="C102">C102 (Tòa C)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vị trí giường
              </label>
              <select
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="G01">G01 (Tầng dưới)</option>
                <option value="G02">G02 (Tầng trên)</option>
                <option value="G03">G03 (Tầng dưới)</option>
                <option value="G04">G04 (Tầng trên)</option>
                <option value="G05">G05 (Tầng dưới)</option>
                <option value="G06">G06 (Tầng trên)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày kết thúc
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiền phòng / tháng (VND)
              </label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiền cọc giữ chỗ (VND)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-slate-600 dark:text-slate-300 text-[11px]">
            Hợp đồng có hiệu lực pháp lý theo Quy chế Ký túc xá Phân hiệu UTC2. Sinh viên tuân thủ
            nội quy an ninh, trật tự và vệ sinh môi trường.
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs"
            >
              Ký &amp; Ban hành hợp đồng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onTransfer: (s: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onTransfer,
}) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#0B2A5B]/30"
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {student.name}
              </h3>
              <p className="text-xs text-slate-500">
                MSSV: {student.mssv} • {student.className}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold text-[10px] uppercase">
                Chỗ ở hiện tại
              </span>
              <p className="font-bold text-sm text-[#0B2A5B] dark:text-blue-400">
                Phòng {student.roomNumber} · Giường {student.bedNumber}
              </p>
              <p className="text-slate-500">Tòa {student.buildingId} - Tầng {student.floor}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold text-[10px] uppercase">
                Tình trạng lưu trú
              </span>
              <p className="font-bold text-sm text-emerald-600">
                {student.residenceStatus}
              </p>
              <p className="text-slate-500">Nhập KTX từ: {student.admissionDate}</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Số CCCD / Định danh:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {student.cccd}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Số điện thoại liên lạc:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {student.phone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Quê quán thường trú:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {student.hometown}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tình trạng nộp phí:</span>
              <span
                className={`font-semibold ${
                  student.paymentStatus === 'Đủ' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {student.paymentStatus === 'Đủ' ? 'Đã hoàn tất phí KTX' : `Còn nợ ${student.debtAmount ? `${student.debtAmount / 1000}k` : 'phí'}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onTransfer(student);
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-300 font-semibold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            Điều chuyển buồng phòng
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs hover:bg-[#143F8C]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

interface PrintContractModalProps {
  contract: Contract | null;
  onClose: () => void;
}

export const PrintContractModal: React.FC<PrintContractModalProps> = ({
  contract,
  onClose,
}) => {
  if (!contract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-7 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start pb-4 border-b border-slate-200">
          <div className="text-center w-full">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-600">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-[11px] font-semibold text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
            <div className="w-24 h-0.5 bg-slate-300 mx-auto my-1.5" />
            <h2 className="text-base font-bold text-[#0B2A5B] mt-2 uppercase">
              HỢP ĐỒNG THUÊ CHỖ Ở NỘI TRÚ KÝ TÚC XÁ
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Số: {contract.contractNumber}/HĐ-KTX
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="py-4 space-y-3.5 text-xs text-slate-700 leading-relaxed">
          <p>
            Hôm nay, ngày ký hợp đồng tại Văn phòng Ban Quản lý KTX Phân hiệu Trường Đại học Giao
            thông Vận tải tại TP. Hồ Chí Minh, chúng tôi gồm có:
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p>
              <strong>BÊN CHO THUÊ (BÊN A):</strong> BAN QUẢN LÝ KÝ TÚC XÁ UTC2
            </p>
            <p>Đại diện: Ông Nguyễn Văn An - Chức vụ: Trưởng Ban Quản lý</p>
            <p>Địa chỉ: Số 450-451 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p>
              <strong>BÊN THUÊ (BÊN B):</strong> {contract.studentName}
            </p>
            <p>Mã số sinh viên: {contract.mssv}</p>
            <p>
              Vị trí bố trí: <strong>Phòng {contract.roomNumber} - Giường {contract.bedNumber}</strong> (Tòa {contract.buildingId})
            </p>
            <p>
              Thời hạn thuê: Từ ngày <strong>{contract.startDate}</strong> đến hết ngày{' '}
              <strong>{contract.endDate}</strong>
            </p>
            <p>
              Đơn giá tiền phòng: <strong>{new Intl.NumberFormat('vi-VN').format(contract.monthlyFee)} đ/tháng</strong>
            </p>
            <p>
              Tiền cọc thế chân trang thiết bị: <strong>{new Intl.NumberFormat('vi-VN').format(contract.depositAmount)} đ</strong> (Tình trạng: {contract.depositStatus})
            </p>
          </div>

          <p className="italic text-slate-600 text-[11px]">
            Hai bên cam kết thực hiện đúng nội quy nội trú của nhà trường. Hợp đồng được lập thành
            02 bản có giá trị pháp lý như nhau.
          </p>

          <div className="grid grid-cols-2 pt-6 text-center">
            <div>
              <p className="font-bold text-xs uppercase">ĐẠI DIỆN BÊN B</p>
              <p className="text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16 flex items-end justify-center font-semibold text-slate-800">
                {contract.studentName}
              </div>
            </div>
            <div>
              <p className="font-bold text-xs uppercase">ĐẠI DIỆN BÊN A</p>
              <p className="text-[11px] text-slate-500">(Ký tên và đóng dấu)</p>
              <div className="h-16 flex items-end justify-center font-semibold text-[#0B2A5B]">
                Nguyễn Văn An
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              window.print();
            }}
            className="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            In văn bản hợp đồng
          </button>
        </div>
      </div>
    </div>
  );
};
