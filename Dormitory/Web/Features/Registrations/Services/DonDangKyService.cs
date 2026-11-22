using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Mappings;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Mappings;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Shared.Helpers;

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
                .AsNoTracking()
                .Where(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)
                .Include(d => d.DotDangKy)
                .Include(d => d.SinhVien)
                    .ThenInclude(s => s!.LopHoc)
                .Include(d => d.LoaiPhong)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.LoaiPhong)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.ToaNha)
                .AsSplitQuery()
                .AsQueryable();

            var entities = await query.ToListAsync();

            var list = entities.Select(d => d.ToApplicationListItemDto()).ToList();

            // Sinh viên đã từng ở KTX: có ít nhất một hợp đồng lưu trú (không bị huỷ).
            var stayedStudentIds = await _context.HopDongs
                .AsNoTracking()
                .Where(h => h.TrangThai != "daHuy")
                .Select(h => h.MaSinhVien)
                .Distinct()
                .ToListAsync();
            var stayedSet = new HashSet<string>(stayedStudentIds, StringComparer.OrdinalIgnoreCase);

            // Trạng thái thu phí lấy từ hóa đơn giữ chỗ gắn với đơn đăng ký (nếu đã duyệt).
            var invoiceRows = await _context.HoaDons
                .AsNoTracking()
                .Where(h => h.HopDong != null && h.HopDong.MaDonDangKy != null)
                .Select(h => new
                {
                    AppId = h.HopDong!.MaDonDangKy!,
                    h.MaHoaDon,
                    h.TrangThai,
                    h.AnhMinhChung,
                    h.NgayNopMinhChung,
                    h.LyDoTuChoiMinhChung,
                    h.NgayTuChoiMinhChung
                })
                .ToListAsync();
            var invoiceByApp = invoiceRows
                .GroupBy(x => x.AppId, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MaHoaDon).First(), StringComparer.OrdinalIgnoreCase);

            foreach (var item in list)
            {
                item.HasStayedBefore = stayedSet.Contains(item.Mssv);

                if (invoiceByApp.TryGetValue(item.Id, out var invoice))
                {
                    item.InvoiceId = invoice.MaHoaDon;
                    item.ProofSubmittedAt = invoice.NgayNopMinhChung?.ToString("HH:mm dd/MM/yyyy");
                    item.ProofRejectionReason = invoice.LyDoTuChoiMinhChung;
                    item.ProofRejectedAt = invoice.NgayTuChoiMinhChung?.ToString("HH:mm dd/MM/yyyy");

                    // Minh chứng đã bị từ chối thì quay lại trạng thái chưa thanh toán để chờ sinh viên nộp lại.
                    bool rejected = !string.IsNullOrEmpty(invoice.LyDoTuChoiMinhChung);
                    item.PaymentStatus = invoice.TrangThai == "daThanhToan"
                        ? "daNhanThanhToan"
                        : (!rejected && (!string.IsNullOrEmpty(invoice.AnhMinhChung) || invoice.NgayNopMinhChung.HasValue))
                            ? "choXacNhan"
                            : "chuaThanhToan";
                }
            }

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
                var targetGender = app.SinhVien?.GioiTinh ?? "nam";
                var candidates = await _context.Phongs
                    .Include(p => p.ToaNha)
                    .Include(p => p.LoaiPhong)
                    .Where(p => p.MaLoaiPhong == app.MaLoaiPhong && p.TrangThai == "hoatDong" && p.ToaNha != null && p.ToaNha.TrangThai == "hoatDong")
                    .ToListAsync();
                room = candidates.FirstOrDefault(p => ContractRules.IsGenderCompatible(targetGender, p.ToaNha?.GioiTinhQuyDinh ?? "nam"))
                    ?? candidates.FirstOrDefault();
            }

            if (room == null || room.TrangThai != "hoatDong" || room.ToaNha?.TrangThai != "hoatDong")
            {
                return ApproveApplicationResult.Conflict("Phòng hoặc tòa nhà hiện không hoạt động.");
            }

            // 2b. Giới tính sinh viên phải phù hợp với tòa nhà.
            var studentGender = app.SinhVien?.GioiTinh ?? "nam";
            if (!ContractRules.IsGenderCompatible(studentGender, room.ToaNha?.GioiTinhQuyDinh ?? "nam"))
            {
                return ApproveApplicationResult.Conflict(
                    $"Sinh viên {studentGender} không phù hợp với tòa nhà chỉ dành cho {room.ToaNha?.GioiTinhQuyDinh}.");
            }

            // 2c. Sinh viên không được có hợp đồng còn hiệu lực trong cùng năm học.
            string academicYearForCheck = app.DotDangKy?.KyHoc?.MaNamHoc ?? academicYear ?? string.Empty;
            bool hasActiveContract = await _context.HopDongs.AnyAsync(h =>
                h.MaSinhVien == app.MaSinhVien &&
                h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy" &&
                (string.IsNullOrEmpty(academicYearForCheck) || (h.KyHoc != null && h.KyHoc.MaNamHoc == academicYearForCheck)));
            if (hasActiveContract)
            {
                return ApproveApplicationResult.Conflict("Sinh viên này đã có hợp đồng nội trú còn hiệu lực trong năm học.");
            }

            // 3. Ưu tiên giường sinh viên đã chọn, nếu chưa có thì lấy giường trống soThuTu nhỏ nhất
            string maKyHoc = app.DotDangKy?.MaKyHoc ?? string.Empty;
            var beds = await _context.Giuongs
                .Where(g => g.MaPhong == room.MaPhong && g.LaDangHoat)
                .OrderBy(g => g.SoThuTu)
                .ToListAsync();

            var occupiedBedIds = await _context.HopDongs
                .Where(h => h.MaKyHoc == maKyHoc && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => h.MaGiuong)
                .ToListAsync();

            // Giường của đơn chờ duyệt khác cũng bị giữ, tránh hai đơn cùng nhận một giường.
            var pendingBedIds = await _context.DonDangKys
                .Where(d => d.MaGiuong != null && d.TrangThai == "choDuyet" &&
                            d.MaDonDangKy != app.MaDonDangKy && d.DotDangKy != null &&
                            d.DotDangKy.MaKyHoc == maKyHoc)
                .Select(d => d.MaGiuong!)
                .ToListAsync();

            Giuong? availableBed = null;
            if (!string.IsNullOrEmpty(app.MaGiuong))
            {
                var chosenBed = beds.FirstOrDefault(b => b.MaGiuong == app.MaGiuong);
                if (chosenBed == null)
                {
                    return ApproveApplicationResult.Conflict("Giường sinh viên đã chọn không còn khả dụng, hãy đề nghị sinh viên chọn lại.");
                }
                if (occupiedBedIds.Contains(chosenBed.MaGiuong) || pendingBedIds.Contains(chosenBed.MaGiuong))
                {
                    return ApproveApplicationResult.Conflict("Giường sinh viên đã chọn vừa có người giữ chỗ, hãy đề nghị sinh viên chọn giường khác.");
                }
                availableBed = chosenBed;
            }

            availableBed ??= beds.FirstOrDefault(b => !occupiedBedIds.Contains(b.MaGiuong) && !pendingBedIds.Contains(b.MaGiuong));
            if (availableBed == null)
            {
                return ApproveApplicationResult.Conflict("Phòng đã hết giường, hãy từ chối hoặc đề nghị sinh viên chọn phòng khác.");
            }

            // 4. Bắt buộc có nhân viên duyệt thật, không dùng mã hardcode.
            if (string.IsNullOrWhiteSpace(staffId))
            {
                return ApproveApplicationResult.Conflict("Không xác định được nhân viên duyệt. Vui lòng đăng nhập lại.");
            }
            var staffExists = await _context.NhanViens.AnyAsync(n => n.MaNhanVien == staffId);
            if (!staffExists)
            {
                return ApproveApplicationResult.Conflict("Nhân viên duyệt không tồn tại trong hệ thống.");
            }

            // 5. Thực hiện trong một Transaction với ExecutionStrategy của EF Core
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                // Khóa Serializable để hai lượt duyệt đồng thời không lấy trùng một giường.
                using var tx = _context.Database.IsRelational()
                    ? await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                    : await _context.Database.BeginTransactionAsync();
                try
                {
                    // Đọc lại trạng thái đơn và giường ngay trong transaction để chặn race condition.
                    await _context.Entry(app).ReloadAsync();
                    if (app.TrangThai != "choDuyet")
                    {
                        await tx.RollbackAsync();
                        return ApproveApplicationResult.Conflict("Hồ sơ đã được xử lý bởi người khác.");
                    }

                    bool bedTaken = await _context.HopDongs.AnyAsync(h =>
                        h.MaGiuong == availableBed.MaGiuong &&
                        h.MaKyHoc == maKyHoc &&
                        h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy");
                    if (!bedTaken)
                    {
                        bedTaken = await _context.DonDangKys.AnyAsync(d =>
                            d.MaGiuong == availableBed.MaGiuong &&
                            d.MaDonDangKy != app.MaDonDangKy &&
                            d.TrangThai == "choDuyet" &&
                            d.DotDangKy != null && d.DotDangKy.MaKyHoc == maKyHoc);
                    }
                    if (bedTaken)
                    {
                        await tx.RollbackAsync();
                        return ApproveApplicationResult.Conflict("Giường vừa được người khác giữ chỗ. Vui lòng duyệt lại.");
                    }

                    var now = DateTime.Now;
                    var options = _registrationOptions.Value;
                    var hanGiuCho = RegistrationRules.CalculateHoldExpiration(now, options.HoldHours);
                    var term = app.DotDangKy?.KyHoc;
                    decimal rent = room.LoaiPhong?.GiaThueThang ?? 500000m;

                    string maHopDong = Shared.Helpers.IdGenerator.Next("HD", DateTime.Today);
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

                    string maHoaDon = Shared.Helpers.IdGenerator.Next("HD", DateTime.Today);
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
                    app.MaGiuong = availableBed.MaGiuong;
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
            await using var tx = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync()
                : null;

            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId && 
                                                                         (academicYear == null || (d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)));
            if (app == null || app.TrangThai != "choDuyet")
            {
                return false;
            }

            var now = DateTime.Now;
            app.TrangThai = "tuChoi";
            app.MaNhanVienDuyet = string.IsNullOrWhiteSpace(staffId) ? null : staffId;
            app.NgayDuyet = now;
            app.GhiChu = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();

            // Bắt buộc thông báo cho sinh viên biết lý do bị từ chối.
            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = app.MaSinhVien,
                TieuDe = "Hồ sơ đăng ký nội trú bị từ chối",
                NoiDung = string.IsNullOrWhiteSpace(reason)
                    ? $"Đơn đăng ký {app.MaDonDangKy} của bạn đã bị từ chối. Vui lòng liên hệ Ban quản lý KTX để biết thêm chi tiết."
                    : $"Đơn đăng ký {app.MaDonDangKy} của bạn đã bị từ chối. Lý do: {reason.Trim()}",
                Loai = "donDangKy",
                LienKet = "/student/registration",
                DaDoc = false,
                NgayTao = now
            });

            await _context.SaveChangesAsync();
            if (tx != null) await tx.CommitAsync();
            return true;
        }

        public async Task<byte[]> ExportApplicationsExcelAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null,
            string? academicYear = null,
            string? roomType = null,
            string? stayed = null,
            string? search = null)
        {
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("DonDangKy");

            string[] headers =
            [
                "Mã đơn",
                "MSSV",
                "Họ và tên",
                "Ngày sinh",
                "Giới tính",
                "CCCD",
                "Điện thoại",
                "Email",
                "Địa chỉ thường trú",
                "Lớp",
                "Khoa",
                "Năm nhập học",
                "Diện ưu tiên",
                "Đợt đăng ký",
                "Tòa nhà",
                "Mã phòng",
                "Mã giường",
                "Loại phòng",
                "Giá thuê tháng",
                "Tiền cọc",
                "Ngày bắt đầu",
                "Ngày kết thúc",
                "Trạng thái đơn"
            ];

            for (int col = 1; col <= headers.Length; col++)
            {
                var cell = ws.Cell(1, col);
                cell.Value = headers[col - 1];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A5B");
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            }
            ws.Row(1).Height = 24;

            var namHoc = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.AsNoTracking().FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);

            if (namHoc != null)
            {
                if (_reservationExpiryService != null)
                {
                    await _reservationExpiryService.ProcessExpiredReservationsAsync();
                }

                var applications = await _context.DonDangKys
                    .AsNoTracking()
                    .Where(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)
                    .Include(d => d.DotDangKy)
                        .ThenInclude(dot => dot!.KyHoc)
                    .Include(d => d.SinhVien)
                        .ThenInclude(s => s!.LopHoc)
                    .Include(d => d.LoaiPhong)
                    .Include(d => d.Phong)
                        .ThenInclude(p => p!.LoaiPhong)
                    .Include(d => d.Phong)
                        .ThenInclude(p => p!.ToaNha)
                    .AsSplitQuery()
                    .ToListAsync();

                HashSet<string>? stayedStudentSet = null;
                if (!string.IsNullOrWhiteSpace(stayed) && !stayed.Equals("all", StringComparison.OrdinalIgnoreCase))
                {
                    var stayedIds = await _context.HopDongs
                        .AsNoTracking()
                        .Where(h => h.TrangThai != "daHuy")
                        .Select(h => h.MaSinhVien)
                        .Distinct()
                        .ToListAsync();
                    stayedStudentSet = new HashSet<string>(stayedIds, StringComparer.OrdinalIgnoreCase);
                }

                applications = FilterApplicationsForExport(
                        applications,
                        statusTab,
                        priority,
                        cohort,
                        gender,
                        roomType,
                        stayed,
                        search,
                        stayedStudentSet)
                    .OrderBy(d => GetExportStatusRank(d.TrangThai))
                    .ThenBy(d => d.NgayDangKy)
                    .ThenBy(d => d.MaDonDangKy, StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var activeContracts = await _context.HopDongs
                    .AsNoTracking()
                    .Where(h => h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                    .Include(h => h.KyHoc)
                    .Include(h => h.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                    .Include(h => h.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.LoaiPhong)
                    .AsSplitQuery()
                    .ToListAsync();

                var activeContractByStudent = activeContracts
                    .Where(h => h.KyHoc == null || h.KyHoc.MaNamHoc == academicYear)
                    .GroupBy(h => h.MaSinhVien, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

                var reservedBedIds = new HashSet<string>(
                    activeContracts.Select(h => h.MaGiuong),
                    StringComparer.OrdinalIgnoreCase);

                var activeRooms = await _context.Phongs
                    .AsNoTracking()
                    .Where(p => p.TrangThai == "hoatDong" && p.ToaNha != null && p.ToaNha.TrangThai == "hoatDong")
                    .Include(p => p.ToaNha)
                    .Include(p => p.LoaiPhong)
                    .Include(p => p.DanhSachGiuong)
                    .OrderBy(p => p.MaPhong)
                    .AsSplitQuery()
                    .ToListAsync();

                int rowIndex = 2;
                foreach (var app in applications)
                {
                    var student = app.SinhVien;
                    var studentGender = student?.GioiTinh ?? "nam";
                    string maToaNha = app.Phong?.MaToaNha ?? string.Empty;
                    string maPhong = app.Phong?.MaPhong ?? app.MaPhong ?? string.Empty;
                    string maGiuong = string.Empty;
                    string tenLoaiPhong = app.Phong?.LoaiPhong?.TenLoaiPhong ?? app.LoaiPhong?.TenLoaiPhong ?? string.Empty;
                    decimal? giaThue = app.Phong?.LoaiPhong?.GiaThueThang ?? app.LoaiPhong?.GiaThueThang;
                    decimal? tienCoc = null;
                    string ngayBatDau = string.Empty;
                    string ngayKetThuc = string.Empty;

                    if (activeContractByStudent.TryGetValue(app.MaSinhVien, out var existingContract))
                    {
                        var contractRoom = existingContract.Giuong?.Phong;
                        maToaNha = contractRoom?.MaToaNha ?? maToaNha;
                        maPhong = contractRoom?.MaPhong ?? maPhong;
                        maGiuong = existingContract.MaGiuong;
                        tenLoaiPhong = contractRoom?.LoaiPhong?.TenLoaiPhong ?? tenLoaiPhong;
                        giaThue = existingContract.GiaThueThang;
                        tienCoc = existingContract.TienCoc;
                        ngayBatDau = existingContract.NgayBatDau.ToString("yyyy-MM-dd");
                        ngayKetThuc = existingContract.NgayKetThuc.ToString("yyyy-MM-dd");
                    }
                    else if (app.TrangThai is "choDuyet" or "daDuyet")
                    {
                        var (selectedRoom, selectedBed) = FindSuggestedBedForExport(app, studentGender, activeRooms, reservedBedIds);
                        if (selectedRoom != null && selectedBed != null)
                        {
                            reservedBedIds.Add(selectedBed.MaGiuong);
                            maToaNha = selectedRoom.MaToaNha;
                            maPhong = selectedRoom.MaPhong;
                            maGiuong = selectedBed.MaGiuong;
                            tenLoaiPhong = selectedRoom.LoaiPhong?.TenLoaiPhong ?? tenLoaiPhong;
                            giaThue = selectedRoom.LoaiPhong?.GiaThueThang ?? giaThue ?? 500000m;
                        }
                        else
                        {
                            giaThue ??= 500000m;
                        }

                        tienCoc = 0m;
                        ngayBatDau = namHoc.NgayBatDau.ToString("yyyy-MM-dd");
                        ngayKetThuc = namHoc.NgayKetThuc.ToString("yyyy-MM-dd");
                    }

                    ws.Cell(rowIndex, 1).Value = app.MaDonDangKy;
                    ws.Cell(rowIndex, 2).Value = app.MaSinhVien;
                    ws.Cell(rowIndex, 3).Value = student?.HoTen ?? string.Empty;
                    ws.Cell(rowIndex, 4).Value = student != null ? student.NgaySinh.ToString("yyyy-MM-dd") : string.Empty;
                    ws.Cell(rowIndex, 5).Value = FormatGenderLabel(student?.GioiTinh);
                    ws.Cell(rowIndex, 6).Value = student?.Cccd ?? string.Empty;
                    ws.Cell(rowIndex, 7).Value = student?.DienThoai ?? string.Empty;
                    ws.Cell(rowIndex, 8).Value = student?.Email ?? string.Empty;
                    ws.Cell(rowIndex, 9).Value = student?.DiaChiThuongTru ?? string.Empty;
                    ws.Cell(rowIndex, 10).Value = student?.MaLop ?? string.Empty;
                    ws.Cell(rowIndex, 11).Value = student?.LopHoc?.TenKhoa ?? string.Empty;
                    if (student != null)
                    {
                        ws.Cell(rowIndex, 12).Value = student.NamNhapHoc;
                    }
                    ws.Cell(rowIndex, 13).Value = student?.DoiTuongUuTien ?? string.Empty;
                    ws.Cell(rowIndex, 14).Value = app.DotDangKy?.TenDotHienThi ?? app.MaDotDangKy;
                    ws.Cell(rowIndex, 15).Value = maToaNha;
                    ws.Cell(rowIndex, 16).Value = maPhong;
                    ws.Cell(rowIndex, 17).Value = maGiuong;
                    ws.Cell(rowIndex, 18).Value = tenLoaiPhong;

                    if (giaThue.HasValue)
                    {
                        ws.Cell(rowIndex, 19).Value = giaThue.Value;
                        ws.Cell(rowIndex, 19).Style.NumberFormat.Format = "#,##0";
                    }
                    if (tienCoc.HasValue)
                    {
                        ws.Cell(rowIndex, 20).Value = tienCoc.Value;
                        ws.Cell(rowIndex, 20).Style.NumberFormat.Format = "#,##0";
                    }

                    ws.Cell(rowIndex, 21).Value = ngayBatDau;
                    ws.Cell(rowIndex, 22).Value = ngayKetThuc;
                    ws.Cell(rowIndex, 23).Value = FormatApplicationStatus(app.TrangThai);

                    for (int col = 1; col <= headers.Length; col++)
                    {
                        var cell = ws.Cell(rowIndex, col);
                        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                        cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#E2E8F0");
                    }

                    rowIndex++;
                }
            }

            ws.SheetView.FreezeRows(1);
            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private static IEnumerable<DonDangKy> FilterApplicationsForExport(
            IEnumerable<DonDangKy> applications,
            string? statusTab,
            string? priority,
            string? cohort,
            string? gender,
            string? roomType,
            string? stayed,
            string? search,
            HashSet<string>? stayedStudentSet)
        {
            var filtered = applications;

            if (!string.IsNullOrWhiteSpace(statusTab) && !statusTab.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                string st = statusTab.Trim().ToLowerInvariant();
                filtered = st switch
                {
                    "pending" or "choduyet" => filtered.Where(d => d.TrangThai == "choDuyet"),
                    "approved" or "daduyet" => filtered.Where(d => d.TrangThai == "daDuyet"),
                    "rejected" or "tuchoi" => filtered.Where(d => d.TrangThai is "tuChoi" or "hetHan"),
                    _ => filtered
                };
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                string qNorm = ExcelImportHelper.NormalizeHeaderKey(priority);
                filtered = filtered.Where(d =>
                    ExcelImportHelper.NormalizeHeaderKey(d.SinhVien?.DoiTuongUuTien ?? string.Empty).Contains(qNorm, StringComparison.Ordinal));
            }

            if (!string.IsNullOrWhiteSpace(cohort) && !cohort.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                string c = cohort.Trim();
                filtered = filtered.Where(d =>
                    d.SinhVien != null &&
                    AcademicMappings.GetCohortCode(d.SinhVien.MaLop, d.SinhVien.NamNhapHoc)
                        .Equals(c, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(gender) && !gender.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                string normalizedFilterGender = gender.Trim().Equals("Nữ", StringComparison.OrdinalIgnoreCase) ||
                                              gender.Trim().Equals("nu", StringComparison.OrdinalIgnoreCase)
                    ? "nu"
                    : "nam";
                filtered = filtered.Where(d =>
                    string.Equals(d.SinhVien?.GioiTinh, normalizedFilterGender, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(roomType) && !roomType.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                string rt = roomType.Trim().ToLowerInvariant();
                filtered = filtered.Where(d => MatchesRoomTypeFilter(d, rt));
            }

            if (!string.IsNullOrWhiteSpace(stayed) && !stayed.Equals("all", StringComparison.OrdinalIgnoreCase) && stayedStudentSet != null)
            {
                if (stayed.Equals("stayed", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(d => stayedStudentSet.Contains(d.MaSinhVien));
                }
                else if (stayed.Equals("new", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(d => !stayedStudentSet.Contains(d.MaSinhVien));
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string searchNorm = ExcelImportHelper.NormalizeHeaderKey(search);
                if (!string.IsNullOrEmpty(searchNorm))
                {
                    var tokens = searchNorm.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    filtered = filtered.Where(d =>
                    {
                        string roomPref = BuildRoomPreferenceText(d);
                        string combined = ExcelImportHelper.NormalizeHeaderKey(
                            $"{d.MaDonDangKy} #{d.MaDonDangKy} {d.MaSinhVien} {d.SinhVien?.HoTen} {d.SinhVien?.LopHoc?.TenKhoa} {d.SinhVien?.DoiTuongUuTien} {roomPref} {FormatApplicationStatus(d.TrangThai)}");
                        return tokens.All(t => combined.Contains(t, StringComparison.Ordinal));
                    });
                }
            }

            return filtered;
        }

        private static string BuildRoomPreferenceText(DonDangKy d)
        {
            if (d.Phong != null)
            {
                string typeName = d.Phong.LoaiPhong?.TenLoaiPhong ?? d.LoaiPhong?.TenLoaiPhong ?? string.Empty;
                return string.IsNullOrEmpty(typeName) ? d.Phong.MaPhong : $"{d.Phong.MaPhong} ({typeName})";
            }
            return d.LoaiPhong?.TenLoaiPhong ?? string.Empty;
        }

        private static bool MatchesRoomTypeFilter(DonDangKy d, string rt)
        {
            string pref = BuildRoomPreferenceText(d).ToLowerInvariant();
            string genderCode = (d.SinhVien?.GioiTinh ?? string.Empty).Trim().ToLowerInvariant();
            bool isClc = pref.Contains("chất lượng cao") || pref.Contains("clc");
            bool isTieuChuan = pref.Contains("tiêu chuẩn") || pref.Contains("thường");
            bool isNam = pref.Contains("nam") || genderCode == "nam";
            bool isNu = pref.Contains("nữ") || pref.Contains("nu") || genderCode == "nu";

            return rt switch
            {
                "clc" or "cao" => isClc,
                "clc_nam" => isClc && !pref.Contains("nữ") && isNam,
                "clc_nu" => isClc && !pref.Contains("nam") && isNu,
                "nam" => !isClc && (pref.Contains("nam") || (isTieuChuan && genderCode == "nam")),
                "nu" => !isClc && (pref.Contains("nữ") || pref.Contains("nu") || (isTieuChuan && genderCode == "nu")),
                _ => pref.Contains(rt)
            };
        }

        private static int GetExportStatusRank(string trangThai) => trangThai switch
        {
            "choDuyet" => 0,
            "daDuyet" => 1,
            "hetHan" => 2,
            "tuChoi" => 3,
            _ => 4
        };

        private static (Phong? Room, Giuong? Bed) FindSuggestedBedForExport(
            DonDangKy app,
            string studentGender,
            List<Phong> activeRooms,
            HashSet<string> reservedBedIds)
        {
            if (!string.IsNullOrWhiteSpace(app.MaGiuong))
            {
                var chosenRoom = activeRooms.FirstOrDefault(r =>
                    r.ToaNha != null &&
                    ContractRules.IsGenderCompatible(studentGender, r.ToaNha.GioiTinhQuyDinh) &&
                    r.DanhSachGiuong.Any(b => b.MaGiuong == app.MaGiuong && b.LaDangHoat && !reservedBedIds.Contains(b.MaGiuong)));

                if (chosenRoom != null)
                {
                    return (chosenRoom, chosenRoom.DanhSachGiuong.First(b => b.MaGiuong == app.MaGiuong));
                }
            }

            if (!string.IsNullOrWhiteSpace(app.MaPhong))
            {
                var requestedRoom = activeRooms.FirstOrDefault(r =>
                    r.MaPhong.Equals(app.MaPhong, StringComparison.OrdinalIgnoreCase) &&
                    r.ToaNha != null &&
                    ContractRules.IsGenderCompatible(studentGender, r.ToaNha.GioiTinhQuyDinh));

                var requestedBed = requestedRoom?.DanhSachGiuong
                    .Where(b => b.LaDangHoat && !reservedBedIds.Contains(b.MaGiuong))
                    .OrderBy(b => b.SoThuTu)
                    .FirstOrDefault();

                if (requestedRoom != null && requestedBed != null)
                {
                    return (requestedRoom, requestedBed);
                }
            }

            var candidateRooms = activeRooms.Where(r =>
                r.ToaNha != null &&
                ContractRules.IsGenderCompatible(studentGender, r.ToaNha.GioiTinhQuyDinh) &&
                (string.IsNullOrWhiteSpace(app.MaLoaiPhong) ||
                 r.MaLoaiPhong.Equals(app.MaLoaiPhong, StringComparison.OrdinalIgnoreCase)));

            foreach (var room in candidateRooms)
            {
                var freeBed = room.DanhSachGiuong
                    .Where(b => b.LaDangHoat && !reservedBedIds.Contains(b.MaGiuong))
                    .OrderBy(b => b.SoThuTu)
                    .FirstOrDefault();

                if (freeBed != null)
                {
                    return (room, freeBed);
                }
            }

            return (null, null);
        }

        private static string FormatGenderLabel(string? gioiTinh) => gioiTinh?.Trim().ToLowerInvariant() switch
        {
            "nu" => "Nữ",
            "nam" => "Nam",
            _ => "Khác"
        };

        private static string FormatApplicationStatus(string trangThai) => trangThai switch
        {
            "daDuyet" => "Đã duyệt",
            "tuChoi" => "Bị từ chối",
            "hetHan" => "Hết hạn",
            _ => "Chờ duyệt"
        };
    }
}
