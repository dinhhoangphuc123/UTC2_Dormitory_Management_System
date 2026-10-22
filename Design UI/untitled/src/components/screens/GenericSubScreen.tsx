import React, { useState } from 'react';
import { ScreenId } from '../Sidebar.tsx';

interface GenericSubScreenProps {
  screenId: ScreenId;
  onNavigate: (s: ScreenId) => void;
  onShowToast: (msg: string) => void;
}

export const GenericSubScreen: React.FC<GenericSubScreenProps> = ({ screenId, onNavigate, onShowToast }) => {
  const [filterQuery, setFilterQuery] = useState('');

  if (screenId === 'dot-va-don-dang-ky') {
    return (
      <div className="flex flex-col w-full space-y-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-wider text-[#747780] font-semibold">
              ĐĂNG KÝ &amp; NỘI TRÚ
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-[#00163a] tracking-tight mt-0.5">
              Đợt &amp; Đơn đăng ký KTX
            </h1>
          </div>
          <button
            onClick={() => onShowToast('Đã mở đợt đăng ký mới cho Học kỳ 2!')}
            className="h-10 px-4 rounded-xl bg-[#00163a] text-white text-xs font-semibold hover:bg-[#0b2a5b] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Mở đợt đăng ký mới
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
          <div className="p-space-lg rounded-xl bg-white shadow-xs border border-[#dfe8ff]/60">
            <span className="text-xs text-[#747780] font-semibold uppercase">ĐỢT ĐANG MỞ</span>
            <div className="text-2xl font-bold text-[#00163a] mt-2">Đợt 2 - HK1 2026</div>
            <div className="text-xs text-emerald-700 mt-1 font-medium">Hạn chót: 30/10/2026</div>
          </div>
          <div className="p-space-lg rounded-xl bg-white shadow-xs border border-[#dfe8ff]/60">
            <span className="text-xs text-[#747780] font-semibold uppercase">ĐƠN CHỜ DUYỆT</span>
            <div className="text-2xl font-bold text-[#375ba9] mt-2">42 đơn</div>
            <div className="text-xs text-[#747780] mt-1">28 hồ sơ ưu tiên chính sách</div>
          </div>
          <div className="p-space-lg rounded-xl bg-white shadow-xs border border-[#dfe8ff]/60">
            <span className="text-xs text-[#747780] font-semibold uppercase">ĐÃ DUYỆT CẤP CHỖ</span>
            <div className="text-2xl font-bold text-[#00163a] mt-2">3.420 sinh viên</div>
            <div className="text-xs text-[#747780] mt-1">Tỷ lệ lấp đầy: 95.0%</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-[#dfe8ff]/60 overflow-hidden">
          <div className="p-4 border-b border-[#f0f3ff] flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#00163a]">Danh Sách Đơn Đăng Ký Chờ Phê Duyệt</h2>
            <span className="text-xs text-[#747780]">Hiển thị 4 đơn mới nhất</span>
          </div>
          <div className="divide-y divide-[#f0f3ff] text-xs">
            {[
              { mssv: '74DCCN24011', name: 'Nguyễn Phương Thảo', faculty: 'Công nghệ thông tin', pref: 'Tòa B01 - Nữ', priority: 'Hộ nghèo / Miền núi', date: '21/10/2026' },
              { mssv: '74DCOT24022', name: 'Lê Hoàng Đăng', faculty: 'Cơ khí', pref: 'Tòa A01 - Nam', priority: 'Con thương binh', date: '21/10/2026' },
              { mssv: '74DCVT24088', name: 'Đặng Tuấn Anh', faculty: 'Kinh tế vận tải', pref: 'Tòa A02 - Nam', priority: 'Thông thường', date: '20/10/2026' },
              { mssv: '74DCCT24039', name: 'Trần Thảo Ly', faculty: 'Kỹ thuật công trình', pref: 'Tòa B02 - Nữ', priority: 'Thông thường', date: '20/10/2026' },
            ].map((d, i) => (
              <div key={i} className="p-3 flex items-center justify-between hover:bg-[#f9f9ff]">
                <div>
                  <div className="font-bold text-[#00163a]">{d.name} ({d.mssv})</div>
                  <div className="text-[#747780]">{d.faculty} · Đăng ký {d.pref} · Đối tượng: {d.priority}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onShowToast(`Đã duyệt cấp phòng cho SV ${d.name} (${d.mssv})!`)}
                    className="px-3 py-1.5 rounded-lg bg-[#00163a] text-white font-semibold cursor-pointer"
                  >
                    Duyệt cấp chỗ
                  </button>
                  <button
                    onClick={() => onShowToast(`Đã từ chối đơn của ${d.name}!`)}
                    className="px-3 py-1.5 rounded-lg bg-[#ffdad6] text-[#ba1a1a] font-semibold cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screenId === 'quan-ly-hop-dong') {
    return (
      <div className="flex flex-col w-full space-y-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-wider text-[#747780] font-semibold">
              ĐĂNG KÝ &amp; NỘI TRÚ
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-[#00163a] tracking-tight mt-0.5">
              Quản lý Hợp đồng Nội trú
            </h1>
          </div>
          <button
            onClick={() => onShowToast('Đã mở trình tạo hợp đồng nội trú mới!')}
            className="h-10 px-4 rounded-xl bg-[#00163a] text-white text-xs font-semibold hover:bg-[#0b2a5b] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Lập hợp đồng mới
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-[#dfe8ff]/60 p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#747780]">Tổng cộng 3.420 hợp đồng có hiệu lực trong HK1 2026-2027</span>
            <span className="text-emerald-700 font-semibold">100% hợp đồng ký số SSO</span>
          </div>
          <div className="divide-y divide-[#f0f3ff] text-xs">
            {[
              { id: 'HĐ-UTC2-2026-081', sv: 'Trần Minh Hoàng', mssv: '72DCHT21045', room: 'A2-304', valid: '01/09/2026 - 31/01/2027', status: 'Còn hạn' },
              { id: 'HĐ-UTC2-2026-082', sv: 'Lê Thị Mai Khanh', mssv: '72DCOT22019', room: 'B1-102', valid: '01/09/2026 - 31/01/2027', status: 'Còn hạn' },
              { id: 'HĐ-UTC2-2026-083', sv: 'Nguyễn Quốc Tuấn', mssv: '71DCCK20112', room: 'A3-512', valid: '01/09/2026 - 31/01/2027', status: 'Chờ gia hạn' },
            ].map((h, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#00163a]">{h.id} · {h.sv} ({h.mssv})</div>
                  <div className="text-[#747780]">Phòng {h.room} · Thời hạn: {h.valid}</div>
                </div>
                <button
                  onClick={() => onShowToast(`Tải bản PDF hợp đồng ${h.id} thành công!`)}
                  className="px-3 py-1.5 rounded-lg bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#00163a] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  In hợp đồng
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screenId === 'ho-so-sinh-vien') {
    return (
      <div className="flex flex-col w-full space-y-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-wider text-[#747780] font-semibold">
              SINH VIÊN
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-[#00163a] tracking-tight mt-0.5">
              Hồ sơ Sinh viên Nội trú
            </h1>
          </div>
          <button
            onClick={() => onShowToast('Đã đồng bộ hồ sơ từ Cổng đào tạo UTC2!')}
            className="h-10 px-4 rounded-xl bg-[#dfe8ff] text-[#00163a] text-xs font-semibold hover:bg-[#d9e3fb] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">sync</span>
            Đồng bộ hồ sơ đào tạo
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-[#dfe8ff]/60 p-4 space-y-3">
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Tìm theo mã sinh viên, CCCD, tên sinh viên..."
            className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-xs focus:outline-none"
          />
          <div className="divide-y divide-[#f0f3ff] text-xs">
            {[
              { mssv: '72DCHT21045', name: 'Trần Minh Hoàng', class: 'CNTT-K63A', cccd: '079203001234', room: 'A2-304', phone: '0918.442.190' },
              { mssv: '72DCOT22019', name: 'Lê Thị Mai Khanh', class: 'KTVT-K64B', cccd: '079203005678', room: 'B1-102', phone: '0982.114.733' },
              { mssv: '71DCCK20112', name: 'Nguyễn Quốc Tuấn', class: 'CKOTO-K65', cccd: '079203009876', room: 'A3-512', phone: '0903.665.129' },
            ].map((sv, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#00163a]">{sv.name} ({sv.mssv})</div>
                  <div className="text-[#747780]">Lớp: {sv.class} · CCCD: {sv.cccd} · SĐT: {sv.phone} · Phòng: {sv.room}</div>
                </div>
                <button
                  onClick={() => onShowToast(`Mở chi tiết lý lịch nội trú của ${sv.name}`)}
                  className="px-3 py-1.5 rounded-lg bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#00163a] font-semibold cursor-pointer"
                >
                  Xem hồ sơ
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screenId === 'so-do-phong-va-giuong') {
    return (
      <div className="flex flex-col w-full space-y-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-wider text-[#747780] font-semibold">
              CƠ SỞ VẬT CHẤT
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-[#00163a] tracking-tight mt-0.5">
              Sơ đồ Phòng &amp; Giường KTX
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#747780]">Chọn tòa:</span>
            <select className="h-9 px-3 rounded-xl bg-white border border-[#dfe8ff] text-xs font-semibold text-[#00163a]">
              <option>Tòa A01 (Nam)</option>
              <option>Tòa A02 (Nam)</option>
              <option>Tòa B01 (Nữ)</option>
              <option>Tòa B02 (Nữ)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { room: 'A01-101', beds: '8/8', status: 'Kín chỗ', color: 'bg-emerald-50 text-emerald-800' },
            { room: 'A01-102', beds: '7/8', status: 'Trống 1', color: 'bg-blue-50 text-[#375ba9]' },
            { room: 'A01-103', beds: '8/8', status: 'Kín chỗ', color: 'bg-emerald-50 text-emerald-800' },
            { room: 'A01-104', beds: '0/8', status: 'Đang bảo trì', color: 'bg-[#ffdad6] text-[#ba1a1a]' },
            { room: 'A01-201', beds: '8/8', status: 'Kín chỗ', color: 'bg-emerald-50 text-emerald-800' },
            { room: 'A01-202', beds: '8/8', status: 'Kín chỗ', color: 'bg-emerald-50 text-emerald-800' },
            { room: 'A01-203', beds: '6/6', status: 'Kín chỗ', color: 'bg-emerald-50 text-emerald-800' },
            { room: 'A01-204', beds: '7/8', status: 'Trống 1', color: 'bg-blue-50 text-[#375ba9]' },
          ].map((r, i) => (
            <div
              key={i}
              onClick={() => onShowToast(`Chi tiết buồng phòng ${r.room} (sức chứa 8 chỗ, đã xếp ${r.beds})`)}
              className="p-3.5 rounded-xl bg-white shadow-xs border border-[#dfe8ff]/60 hover:border-[#375ba9] cursor-pointer transition-all"
            >
              <div className="font-bold text-[#00163a] text-sm">{r.room}</div>
              <div className="text-[#747780] my-1">Giường: {r.beds}</div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.color}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
