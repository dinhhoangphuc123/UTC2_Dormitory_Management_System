using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Mappings;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.Registrations.Services
{
    public class DonDangKyService : IDonDangKyService
    {
        private readonly ApplicationDbContext _context;
        private readonly IOptions<RegistrationOptions> _registrationOptions;
        private readonly IReservationExpiryService? _reservationExpiryService;

        public DonDangKyService(
            ApplicationDbContext context,
            IOptions<RegistrationOptions>? registrationOptions = null,
            IReservationExpiryService? reservationExpiryService = null)
        {
            _context = context;
            _registrationOptions = registrationOptions ?? Microsoft.Extensions.Options.Options.Create(new RegistrationOptions());
            _reservationExpiryService = reservationExpiryService;
        }

        public async Task<List<ApplicationListItemDto>> GetAllApplicationsAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null,
            string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear) ||
                !await _context.NamHocs.AnyAsync(n => n.MaNamHoc == academicYear))
                return new List<ApplicationListItemDto>();

            // Lazy check expired reservations
            if (_reservationExpiryService != null)
            {
                await _reservationExpiryService.ProcessExpiredReservationsAsync();
            }

            var query = _context.DonDangKys
                .Where(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)
                .Include(d => d.SinhVien)
                    .ThenInclude(s => s!.LopHoc)
                .Include(d => d.LoaiPhong)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.LoaiPhong)
                .AsQueryable();

            var entities = await query.ToListAsync();

            var list = entities.Select(d => d.ToApplicationListItemDto()).ToList();

            if (!string.IsNullOrWhiteSpace(statusTab) && statusTab != "all")
            {
                if (statusTab == "pending") list = list.Where(a => a.Status == "Chờ duyệt").ToList();
                else if (statusTab == "approved") list = list.Where(a => a.Status == "Đã duyệt").ToList();
                else if (statusTab == "rejected") list = list.Where(a => a.Status == "Bị từ chối").ToList();
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                list = list.Where(a => a.PriorityCategory.ToLower().Contains(priority.ToLower())).ToList();
            }

            if (!string.IsNullOrWhiteSpace(gender) && gender != "all")
            {
                list = list.Where(a => a.Gender.Equals(gender, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return list;
        }

        public async Task<ApproveApplicationResult> ApproveApplicationAsync(string applicationId, string? staffId, string? academicYear = null)
        {
            // 1. Quét dọn hết hạn trước khi duyệt đơn
            if (_reservationExpiryService != null)
            {
                await _reservationExpiryService.ProcessExpiredReservationsAsync();
            }

            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys
                .Include(d => d.DotDangKy)
                    .ThenInclude(dot => dot!.KyHoc)
                .Include(d => d.SinhVien)
                .FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId && 
                                          (academicYear == null || (d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)));

            if (app == null || app.TrangThai != "choDuyet")
            {
                return ApproveApplicationResult.NotFound("Không tìm thấy hồ sơ đang chờ duyệt.");
            }

            // 2. Xác định phòng cần duyệt
            Rooms.Entities.Phong? room = null;
            if (!string.IsNullOrEmpty(app.MaPhong))
            {
                room = await _context.Phongs
                    .Include(p => p.ToaNha)
                    .Include(p => p.LoaiPhong)
                    .FirstOrDefaultAsync(p => p.MaPhong == app.MaPhong);
            }
            else if (!string.IsNullOrEmpty(app.MaLoaiPhong))
            {
                room = await _context.Phongs
                    .Include(p => p.ToaNha)
                    .Include(p => p.LoaiPhong)
                    .FirstOrDefaultAsync(p => p.MaLoaiPhong == app.MaLoaiPhong && p.TrangThai == "hoatDong" && p.ToaNha != null && p.ToaNha.TrangThai == "hoatDong");
            }

            if (room == null || room.TrangThai != "hoatDong" || room.ToaNha?.TrangThai != "hoatDong")
            {
                return ApproveApplicationResult.Conflict("Phòng hoặc tòa nhà hiện không hoạt động.");
            }

            // 3. Tìm giường trống laDangHoat có soThuTu nhỏ nhất
            string maKyHoc = app.DotDangKy?.MaKyHoc ?? string.Empty;
            var beds = await _context.Giuongs
                .Where(g => g.MaPhong == room.MaPhong && g.LaDangHoat)
                .OrderBy(g => g.SoThuTu)
                .ToListAsync();

            var occupiedBedIds = await _context.HopDongs
                .Where(h => h.MaKyHoc == maKyHoc && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => h.MaGiuong)
                .ToListAsync();

            var availableBed = beds.FirstOrDefault(b => !occupiedBedIds.Contains(b.MaGiuong));
            if (availableBed == null)
            {
                return ApproveApplicationResult.Conflict("Phòng đã hết giường, hãy từ chối hoặc đề nghị sinh viên chọn phòng khác.");
            }

            // 4. Đảm bảo có staffId hợp lệ cho FK nhanVien
            if (string.IsNullOrEmpty(staffId))
            {
                staffId = await _context.NhanViens.Select(n => n.MaNhanVien).FirstOrDefaultAsync() ?? "NV01";
            }

            // 5. Thực hiện trong một Transaction với ExecutionStrategy của EF Core
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    var now = DateTime.Now;
                    var options = _registrationOptions.Value;
                    var hanGiuCho = RegistrationRules.CalculateHoldExpiration(now, options.HoldHours);
                    var term = app.DotDangKy?.KyHoc;
                    decimal rent = room.LoaiPhong?.GiaThueThang ?? 500000m;

                    string maHopDong = $"HD-{DateTime.Today:yyMMdd}-{Guid.NewGuid().ToString("N")[..8]}";
                    var hopDong = new HopDong
                    {
                        MaHopDong = maHopDong,
                        MaDonDangKy = app.MaDonDangKy,
                        MaSinhVien = app.MaSinhVien,
                        MaGiuong = availableBed.MaGiuong,
                        MaKyHoc = maKyHoc,
                        NgayBatDau = term?.NgayBatDau ?? DateTime.Today,
                        NgayKetThuc = term?.NgayKetThuc ?? DateTime.Today.AddMonths(5),
                        NgayNhanPhongThucTe = null,
                        GiaThueThang = rent,
                        TienCoc = options.DepositAmount,
                        PhanTramMienGiam = 0,
                        HanGiuCho = hanGiuCho,
                        TrangThai = "choThanhToan",
                        MaNhanVienLap = staffId
                    };
                    await _context.HopDongs.AddAsync(hopDong);

                    string maHoaDon = $"HD-{DateTime.Today:yyMM}-{Guid.NewGuid().ToString("N")[..8]}";
                    var hoaDon = new HoaDon
                    {
                        MaHoaDon = maHoaDon,
                        MaHopDong = maHopDong,
                        Thang = now.Month,
                        Nam = now.Year,
                        NgayLap = now.Date,
                        HanThanhToan = hanGiuCho.Date,
                        TrangThai = "chuaThanhToan"
                    };
                    await _context.HoaDons.AddAsync(hoaDon);

                    int months = options.InitialPaymentMonths <= 0 ? 1 : options.InitialPaymentMonths;
                    var chiTietPhong = new ChiTietHoaDon
                    {
                        MaHoaDon = maHoaDon,
                        LoaiKhoan = "tienPhong",
                        NoiDung = $"Tiền phòng ({months} tháng) giữ chỗ KTX",
                        SoLuong = months,
                        DonGia = rent
                    };
                    await _context.ChiTietHoaDons.AddAsync(chiTietPhong);

                    if (options.DepositAmount > 0)
                    {
                        var chiTietCoc = new ChiTietHoaDon
                        {
                            MaHoaDon = maHoaDon,
                            LoaiKhoan = "khac",
                            NoiDung = "Tiền đặt cọc cơ sở vật chất KTX",
                            SoLuong = 1,
                            DonGia = options.DepositAmount
                        };
                        await _context.ChiTietHoaDons.AddAsync(chiTietCoc);
                    }

                    app.TrangThai = "daDuyet";
                    app.MaNhanVienDuyet = staffId;
                    app.NgayDuyet = now;
                    if (string.IsNullOrEmpty(app.MaPhong))
                    {
                        app.MaPhong = room.MaPhong;
                    }

                    var thongBao = new ThongBao
                    {
                        MaSinhVien = app.MaSinhVien,
                        TieuDe = "Hồ sơ đăng ký nội trú đã được duyệt",
                        NoiDung = $"Đơn đăng ký của bạn đã được duyệt vào phòng {room.MaPhong}, giường số {availableBed.SoThuTu}. Vui lòng thanh toán trước {hanGiuCho:dd/MM/yyyy HH:mm} để giữ chỗ.",
                        Loai = "donDangKy",
                        LienKet = "/student/invoice",
                        DaDoc = false,
                        NgayTao = now
                    };
                    await _context.ThongBaos.AddAsync(thongBao);

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();

                    return ApproveApplicationResult.Ok();
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<bool> RejectApplicationAsync(string applicationId, string? staffId, string? reason = null, string? academicYear = null)
        {
            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId && 
                                                                         (academicYear == null || (d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)));
            if (app == null || app.TrangThai != "choDuyet")
            {
                return false;
            }

            app.TrangThai = "tuChoi";
            app.MaNhanVienDuyet = staffId;
            app.NgayDuyet = DateTime.Now;
            app.GhiChu = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
