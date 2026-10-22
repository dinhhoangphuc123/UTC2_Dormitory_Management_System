import React from 'react';
import { ScreenId } from '../Sidebar.tsx';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (msg: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onShowToast }) => {
  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#00163a] text-white p-space-xl shadow-md border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#375ba9]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b2a5b] text-[#d8e2ff] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hệ Thống Trực Tuyến · KTX Phân Hiệu UTC2 TP.HCM
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Trung Tâm Vận Hành Ký Túc Xá
          </h1>
          <p className="text-sm text-[#7a93ca] leading-relaxed mb-6">
            Quản lý đồng bộ 6 tòa nhà, 450 buồng phòng, 3.420 sinh viên nội trú. Theo dõi thời gian thực chỉ số điện
            nước, đợt thu phí, xử lý phiếu sửa chữa cơ sở vật chất và kỷ luật nội quy.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('dien-nuoc-va-dich-vu')}
              className="h-10 px-4 rounded-xl bg-[#dfe8ff] text-[#00163a] hover:bg-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              Ghi chỉ số điện nước
            </button>
            <button
              onClick={() => onNavigate('hoa-don-va-thu-phi')}
              className="h-10 px-4 rounded-xl bg-[#0b2a5b] text-white hover:bg-[#375ba9] text-xs font-semibold transition-all border border-white/15 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              Hóa đơn &amp; Thu phí
            </button>
            <button
              onClick={() => onNavigate('yeu-cau-sua-chua')}
              className="h-10 px-4 rounded-xl bg-[#0b2a5b] text-white hover:bg-[#375ba9] text-xs font-semibold transition-all border border-white/15 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">build</span>
              Tiếp nhận sửa chữa
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Quick KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div
          onClick={() => onNavigate('lop-va-khoa-vien')}
          className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 hover:border-[#375ba9] hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">LỚP &amp; KHOA VIỆN</span>
            <span className="material-symbols-outlined text-xl text-[#375ba9] group-hover:scale-110 transition-transform">
              domain
            </span>
          </div>
          <div className="font-display-metric text-2xl font-bold text-[#00163a]">142 lớp</div>
          <div className="text-xs text-[#747780] mt-1">3.420 SV nội trú (24.8% toàn trường)</div>
        </div>

        <div
          onClick={() => onNavigate('dien-nuoc-va-dich-vu')}
          className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 hover:border-[#375ba9] hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ĐIỆN NƯỚC KỲ T03</span>
            <span className="material-symbols-outlined text-xl text-[#375ba9] group-hover:scale-110 transition-transform">
              bolt
            </span>
          </div>
          <div className="font-display-metric text-2xl font-bold text-[#00163a]">97.5% đã chốt</div>
          <div className="text-xs text-[#ba1a1a] mt-1 font-medium">18 phòng vượt định mức</div>
        </div>

        <div
          onClick={() => onNavigate('hoa-don-va-thu-phi')}
          className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 hover:border-[#375ba9] hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">THU PHÍ KỲ 2</span>
            <span className="material-symbols-outlined text-xl text-[#375ba9] group-hover:scale-110 transition-transform">
              payments
            </span>
          </div>
          <div className="font-display-metric text-2xl font-bold text-[#00163a]">412,3 triệu đ</div>
          <div className="text-xs text-[#747780] mt-1">Đạt 84.7% kế hoạch thu đợt 2</div>
        </div>

        <div
          onClick={() => onNavigate('yeu-cau-sua-chua')}
          className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 hover:border-[#375ba9] hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">BẢO TRÌ CSVC</span>
            <span className="material-symbols-outlined text-xl text-[#375ba9] group-hover:scale-110 transition-transform">
              handyman
            </span>
          </div>
          <div className="font-display-metric text-2xl font-bold text-amber-700">12 chờ tiếp nhận</div>
          <div className="text-xs text-[#747780] mt-1">26 phiếu đang phân công xử lý</div>
        </div>
      </div>

      {/* 2 Feature Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Quick Operations Matrix */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
            <h2 className="font-headline-sm text-base font-bold text-[#00163a]">
              Phím Tắt Nghiệp Vụ Quản Lý
            </h2>
            <span className="text-xs text-[#747780]">Hệ thống UTC2</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => onNavigate('lop-va-khoa-vien')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#375ba9]">domain</span>
                Lớp &amp; Khoa viện
              </div>
              <p className="text-[#747780]">Xem danh sách 8 khoa chuyên trách và 142 lớp đại học.</p>
            </button>

            <button
              onClick={() => onNavigate('dien-nuoc-va-dich-vu')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#375ba9]">bolt</span>
                Điện nước &amp; Dịch vụ
              </div>
              <p className="text-[#747780]">Nhập nhanh chỉ số điện nước, xử lý vượt định mức.</p>
            </button>

            <button
              onClick={() => onNavigate('hoa-don-va-thu-phi')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#375ba9]">receipt_long</span>
                Hóa đơn &amp; Thu phí
              </div>
              <p className="text-[#747780]">Theo dõi công nợ, in phiếu thu điện tử, gửi nhắc nợ.</p>
            </button>

            <button
              onClick={() => onNavigate('yeu-cau-sua-chua')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#375ba9]">build</span>
                Yêu cầu sửa chữa
              </div>
              <p className="text-[#747780]">Tiếp nhận sự cố điện nước, phân công kỹ thuật viên.</p>
            </button>

            <button
              onClick={() => onNavigate('vi-pham-va-ky-luat')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#ba1a1a]">gavel</span>
                Vi phạm &amp; Kỷ luật
              </div>
              <p className="text-[#747780]">Lập biên bản vi phạm nội quy, theo dõi hồ sơ khiếu nại.</p>
            </button>

            <button
              onClick={() => onNavigate('bao-cao-thong-ke')}
              className="p-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-[#00163a] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base text-[#375ba9]">bar_chart</span>
                Báo cáo thống kê
              </div>
              <p className="text-[#747780]">Xem phân bổ sinh viên khoa viện, cơ cấu thu và xuất file.</p>
            </button>
          </div>
        </div>

        {/* Recent Operational Log */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs border border-[#dfe8ff]/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
            <h2 className="font-headline-sm text-base font-bold text-[#00163a]">
              Nhật Ký Hoạt Động Mới Nhất
            </h2>
            <button
              onClick={() => onShowToast('Đang làm mới nhật ký thời gian thực...')}
              className="text-xs text-[#375ba9] hover:underline font-medium"
            >
              Làm mới
            </button>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-[#f9f9ff] border border-[#dfe8ff]/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-emerald-600 text-lg mt-0.5">verified</span>
              <div className="flex-1">
                <div className="font-semibold text-[#111c2d]">
                  Thu thành công hóa đơn HD-202603-0891
                </div>
                <div className="text-[#747780] mt-0.5">
                  Sinh viên Trần Minh Hoàng (A2-304) nộp 1.480.000 đ qua VNPAY QR
                </div>
                <span className="text-[10px] text-[#747780]">10 phút trước</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#f9f9ff] border border-[#dfe8ff]/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-600 text-lg mt-0.5">bolt</span>
              <div className="flex-1">
                <div className="font-semibold text-[#111c2d]">
                  Cảnh báo chỉ số điện vượt định mức tại A01-202
                </div>
                <div className="text-[#747780] mt-0.5">
                  Tiêu thụ tháng 03 đạt 315 kWh (vượt 65 kWh so với ngưỡng chuẩn)
                </div>
                <span className="text-[10px] text-[#747780]">35 phút trước</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#f9f9ff] border border-[#dfe8ff]/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#375ba9] text-lg mt-0.5">engineering</span>
              <div className="flex-1">
                <div className="font-semibold text-[#111c2d]">
                  KTV Phạm Thành tiếp nhận sửa chữa SC-2598
                </div>
                <div className="text-[#747780] mt-0.5">
                  Khắc phục rò rỉ van cấp nước lavabo phòng B1-112
                </div>
                <span className="text-[10px] text-[#747780]">1 giờ trước</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#f9f9ff] border border-[#dfe8ff]/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#ba1a1a] text-lg mt-0.5">gavel</span>
              <div className="flex-1">
                <div className="font-semibold text-[#111c2d]">
                  Lập biên bản BB-2026-089 nấu ăn sai quy định
                </div>
                <div className="text-[#747780] mt-0.5">
                  Thu giữ bếp điện công suất lớn tại phòng P.304 Tòa A01
                </div>
                <span className="text-[10px] text-[#747780]">2 giờ trước</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
