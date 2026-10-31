using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Mappings;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.StudentPortal.Services
{
    public class StudentPortalService : IStudentPortalService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IOptions<StudentPortalOptions> _portalOptions;
        private readonly IOptions<PaymentOptions> _paymentOptions;
        private readonly IReservationExpiryService _reservationExpiryService;
        private readonly ILogger<StudentPortalService> _logger;

        public StudentPortalService(
            ApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IOptions<StudentPortalOptions> portalOptions,
            IOptions<PaymentOptions> paymentOptions,
            IReservationExpiryService reservationExpiryService,
            ILogger<StudentPortalService> logger)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _portalOptions = portalOptions;
            _paymentOptions = paymentOptions;
            _reservationExpiryService = reservationExpiryService;
            _logger = logger;
        }

        private async Task<NamHoc?> GetActiveAcademicYearAsync()
        {
            var today = DateTime.Today;
            var active = await _context.NamHocs.FirstOrDefaultAsync(n => n.NgayBatDau <= today && n.NgayKetThuc >= today);
            if (active != null) return active;
            return await _context.NamHocs.OrderByDescending(n => n.NgayKetThuc).FirstOrDefaultAsync();
        }

        // 1. Dashboard
        public async Task<StudentDashboardDto?> GetDashboardAsync(string studentId)
        {
            await _reservationExpiryService.ProcessExpiredReservationsAsync();

            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null) return null;

            var now = DateTime.Now;

            // Latest application
            var latestDon = await _context.DonDangKys
                .Where(d => d.MaSinhVien == studentId)
                .OrderByDescending(d => d.NgayDangKy)
                .FirstOrDefaultAsync();

            // Priority contract: hieuLuc > choThanhToan > latest
            var contracts = await _context.HopDongs
                .Where(h => h.MaSinhVien == studentId)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .OrderByDescending(h => h.NgayBatDau)
                .ToListAsync();

            var activeContract = contracts.FirstOrDefault(h => h.TrangThai == "hieuLuc")
                                 ?? contracts.FirstOrDefault(h => h.TrangThai == "choThanhToan")
                                 ?? contracts.FirstOrDefault();

            string regState = StudentPortalRules.ResolveDashboardRegistrationState(
                latestDon?.TrangThai,
                activeContract?.TrangThai,
                activeContract?.HanGiuCho,
                activeContract?.NgayNhanPhongThucTe,
                now);

            StudentDashboardRoomDto? roomDto = null;
            if (activeContract?.Giuong?.Phong != null)
            {
                var phong = activeContract.Giuong.Phong;
                roomDto = new StudentDashboardRoomDto
                {
                    Toa = phong.ToaNha?.TenToaNha ?? phong.MaToaNha,
                    Phong = phong.MaPhong,
                    Giuong = $"G{activeContract.Giuong.SoThuTu}",
                    NgayNhanPhong = activeContract.NgayNhanPhongThucTe?.ToString("dd/MM/yyyy")
                };
            }

            // Unpaid invoices
            var unpaidInvoices = await _context.HoaDons
                .Where(h => h.HopDong != null && h.HopDong.MaSinhVien == studentId && h.TrangThai == "chuaThanhToan")
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .ToListAsync();

            decimal amountDue = unpaidInvoices.Sum(inv =>
                inv.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia)
                - inv.DanhSachThanhToan.Sum(t => t.SoTien));

            var nextDue = unpaidInvoices.OrderBy(i => i.HanThanhToan).FirstOrDefault();

            int unreadNotifications = await _context.ThongBaos.CountAsync(t => t.MaSinhVien == studentId && !t.DaDoc);
            int openTickets = await _context.YeuCauSuaChuas.CountAsync(y => y.MaSinhVienGui == studentId && (y.TrangThai == "moiGui" || y.TrangThai == "dangXuLy"));

            string? holdDeadline = null;
            if (regState == StudentPortalRules.StateChoThanhToan && activeContract?.HanGiuCho != null)
            {
                holdDeadline = activeContract.HanGiuCho.Value.ToString("dd/MM/yyyy HH:mm");
            }

            return new StudentDashboardDto
            {
                RegistrationState = regState,
                Room = roomDto,
                AmountDue = Math.Max(0, amountDue),
                NextDueDate = nextDue?.HanThanhToan.ToString("dd/MM/yyyy"),
                UnpaidInvoiceCount = unpaidInvoices.Count,
                UnreadNotificationCount = unreadNotifications,
                OpenMaintenanceCount = openTickets,
                HoldDeadline = holdDeadline
            };
        }

        // 2. Profile & Guardians
        public async Task<StudentProfileDto?> GetProfileAsync(string studentId)
        {
            var student = await _context.SinhViens
                .Include(s => s.LopHoc)
                .FirstOrDefaultAsync(s => s.MaSinhVien == studentId);

            return student?.ToStudentProfileDto();
        }

        public async Task<bool> UpdateProfileAsync(string studentId, UpdateProfileDto dto)
        {
            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null) return false;

            if (dto.DienThoai != null) student.DienThoai = dto.DienThoai.Trim();
            if (dto.Email != null) student.Email = dto.Email.Trim();
            if (dto.DiaChiThuongTru != null) student.DiaChiThuongTru = dto.DiaChiThuongTru.Trim();

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<GuardianDto>> GetGuardiansAsync(string studentId)
        {
            var guardians = await _context.PhuHuynhLienHes
                .Where(p => p.MaSinhVien == studentId)
                .OrderBy(p => p.MaPhuHuynh)
                .ToListAsync();

            return guardians.Select(g => g.ToGuardianDto()).ToList();
        }

        public async Task<(bool Success, string? ErrorMessage)> AddGuardianAsync(string studentId, CreateGuardianDto dto)
        {
            int currentCount = await _context.PhuHuynhLienHes.CountAsync(p => p.MaSinhVien == studentId);
            if (currentCount >= 5)
            {
                return (false, "Bạn chỉ được thêm tối đa 5 người liên hệ.");
            }

            var rel = !string.IsNullOrWhiteSpace(dto.QuanHe) ? dto.QuanHe.Trim() : dto.MoiQuanHe.Trim();
            var guardian = new PhuHuynhLienHe
            {
                MaPhuHuynh = $"PH_{Guid.NewGuid().ToString("N")[..12]}",
                MaSinhVien = studentId,
                HoTen = dto.HoTen.Trim(),
                QuanHe = rel,
                DienThoai = dto.DienThoai.Trim(),
                LaLienHeKhanCap = dto.LaLienHeKhanCap
            };

            await _context.PhuHuynhLienHes.AddAsync(guardian);
            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<bool> UpdateGuardianAsync(string studentId, string guardianId, CreateGuardianDto dto)
        {
            var guardian = await _context.PhuHuynhLienHes
                .FirstOrDefaultAsync(p => p.MaPhuHuynh == guardianId && p.MaSinhVien == studentId);
            if (guardian == null) return false;

            var rel = !string.IsNullOrWhiteSpace(dto.QuanHe) ? dto.QuanHe.Trim() : dto.MoiQuanHe.Trim();
            guardian.HoTen = dto.HoTen.Trim();
            guardian.QuanHe = rel;
            guardian.DienThoai = dto.DienThoai.Trim();
            guardian.LaLienHeKhanCap = dto.LaLienHeKhanCap;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteGuardianAsync(string studentId, string guardianId)
        {
            var guardian = await _context.PhuHuynhLienHes
                .FirstOrDefaultAsync(p => p.MaPhuHuynh == guardianId && p.MaSinhVien == studentId);
            if (guardian == null) return false;

            _context.PhuHuynhLienHes.Remove(guardian);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<ProfileChangeRequestDto>> GetProfileChangeRequestsAsync(string studentId)
        {
            var requests = await _context.YeuCauDieuChinhHoSos
                .Where(y => y.MaSinhVien == studentId)
                .OrderByDescending(y => y.NgayGui)
                .ToListAsync();

            return requests.Select(r => r.ToProfileChangeRequestDto()).ToList();
        }

        public async Task<bool> CreateProfileChangeRequestAsync(string studentId, CreateProfileChangeRequestDto dto)
        {
            var entity = new YeuCauDieuChinhHoSo
            {
                MaSinhVien = studentId,
                Truong = dto.Truong.Trim(),
                GiaTriMoi = dto.GiaTriMoi.Trim(),
                LyDo = dto.LyDo.Trim(),
                TrangThai = "choDuyet",
                NgayGui = DateTime.Now
            };

            await _context.YeuCauDieuChinhHoSos.AddAsync(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(string studentId, string currentPassword, string newPassword)
        {
            var account = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaSinhVien == studentId);
            if (account == null)
            {
                return (false, "Không tìm thấy tài khoản người dùng.");
            }

            if (!_passwordHasher.VerifyPassword(currentPassword, account.MatKhauHash))
            {
                return (false, "Mật khẩu hiện tại không chính xác.");
            }

            account.MatKhauHash = _passwordHasher.HashPassword(newPassword);
            await _context.SaveChangesAsync();
            return (true, null);
        }

        // 3. Rounds, Buildings, Rooms
        public async Task<List<RegistrationRoundDto>> GetRoundsAsync(string studentId)
        {
            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null) return new();

            bool hasActiveContract = await _context.HopDongs
                .AnyAsync(h => h.MaSinhVien == studentId && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy");

            var rounds = await _context.DotDangKys
                .OrderByDescending(d => d.NgayMo)
                .ToListAsync();

            var now = DateTime.Now;
            var result = new List<RegistrationRoundDto>();

            foreach (var round in rounds)
            {
                bool hasAppInRound = await _context.DonDangKys
                    .AnyAsync(d => d.MaSinhVien == studentId && d.MaDotDangKy == round.MaDotDangKy);

                bool hasGenderBuilding = await _context.ToaNhas
                    .AnyAsync(t => t.TrangThai == "hoatDong" && (t.GioiTinhQuyDinh == "honHop" || t.GioiTinhQuyDinh == student.GioiTinh));

                var (eligible, reasons) = StudentPortalRules.CheckRoundEligibility(
                    student, round, hasActiveContract, hasAppInRound, hasGenderBuilding, now);

                result.Add(round.ToRegistrationRoundDto(eligible, reasons, now));
            }

            return result;
        }

        public async Task<List<StudentBuildingDto>> GetBuildingsForRoundAsync(string studentId, string roundId)
        {
            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null) return new();

            var round = await _context.DotDangKys.FirstOrDefaultAsync(d => d.MaDotDangKy == roundId);
            if (round == null) return new();

            var buildings = await _context.ToaNhas
                .Where(t => t.TrangThai == "hoatDong" && (t.GioiTinhQuyDinh == "honHop" || t.GioiTinhQuyDinh == student.GioiTinh))
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                .ToListAsync();

            var occupiedBedIds = await _context.HopDongs
                .Where(h => h.MaKyHoc == round.MaKyHoc && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => h.MaGiuong)
                .ToListAsync();

            var list = new List<StudentBuildingDto>();
            foreach (var b in buildings)
            {
                int totalRooms = b.DanhSachPhong.Count;
                int availRooms = b.DanhSachPhong.Count(p =>
                    p.TrangThai == "hoatDong" &&
                    p.DanhSachGiuong.Any(g => g.LaDangHoat && !occupiedBedIds.Contains(g.MaGiuong)));

                list.Add(b.ToStudentBuildingDto(totalRooms, availRooms));
            }

            return list;
        }

        public async Task<List<StudentRoomDto>> GetRoomsForRoundAsync(string studentId, string roundId, string? buildingId)
        {
            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null) return new();

            var round = await _context.DotDangKys.FirstOrDefaultAsync(d => d.MaDotDangKy == roundId);
            if (round == null) return new();

            var query = _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachGiuong)
                .Where(p => p.ToaNha != null && (p.ToaNha.GioiTinhQuyDinh == "honHop" || p.ToaNha.GioiTinhQuyDinh == student.GioiTinh))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(buildingId))
            {
                query = query.Where(p => p.MaToaNha == buildingId);
            }

            var rooms = await query.ToListAsync();

            var occupiedBedIds = await _context.HopDongs
                .Where(h => h.MaKyHoc == round.MaKyHoc && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => h.MaGiuong)
                .ToListAsync();

            var result = new List<StudentRoomDto>();
            foreach (var r in rooms)
            {
                int availableBeds = r.DanhSachGiuong.Count(g => g.LaDangHoat && !occupiedBedIds.Contains(g.MaGiuong));
                var (selectable, reason) = StudentPortalRules.CheckRoomSelectability(r, availableBeds, student.GioiTinh);
                result.Add(r.ToStudentRoomDto(availableBeds, selectable, reason));
            }

            return result;
        }

        // 4. Applications
        public async Task<(bool Success, string? ErrorMessage, string? ApplicationId, int StatusCode)> SubmitApplicationAsync(string studentId, SubmitApplicationRequestDto req)
        {
            var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == studentId);
            if (student == null || student.TrangThai != "dangHoc")
            {
                return (false, "Sinh viên không trong trạng thái đang học.", null, 400);
            }

            bool hasActiveContract = await _context.HopDongs
                .AnyAsync(h => h.MaSinhVien == studentId && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy");
            if (hasActiveContract)
            {
                return (false, "Bạn hiện đang có hợp đồng nội trú hoặc hồ sơ đang giữ chỗ.", null, 400);
            }

            var round = await _context.DotDangKys.FirstOrDefaultAsync(d => d.MaDotDangKy == req.MaDotDangKy);
            if (round == null)
            {
                return (false, "Không tìm thấy đợt đăng ký.", null, 400);
            }

            var now = DateTime.Now;
            if (round.NgayMo.Date > now.Date || round.NgayDong.Date < now.Date)
            {
                return (false, "Đợt đăng ký hiện không mở để tiếp nhận hồ sơ.", null, 400);
            }

            bool alreadyApplied = await _context.DonDangKys
                .AnyAsync(d => d.MaSinhVien == studentId && d.MaDotDangKy == req.MaDotDangKy);
            if (alreadyApplied)
            {
                return (false, "Bạn đã gửi đơn đăng ký trong đợt này.", null, 400);
            }

            var room = await _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachGiuong)
                .FirstOrDefaultAsync(p => p.MaPhong == req.MaPhong);

            if (room == null || room.TrangThai != "hoatDong" || room.ToaNha?.TrangThai != "hoatDong")
            {
                return (false, "Phòng hoặc tòa nhà hiện không hoạt động.", null, 400);
            }

            if (room.ToaNha != null && room.ToaNha.GioiTinhQuyDinh != "honHop" &&
                !string.Equals(room.ToaNha.GioiTinhQuyDinh, student.GioiTinh, StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Phòng đã chọn không phù hợp với giới tính của bạn.", null, 400);
            }

            var occupiedBedIds = await _context.HopDongs
                .Where(h => h.MaKyHoc == round.MaKyHoc && h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => h.MaGiuong)
                .ToListAsync();

            int availableBeds = room.DanhSachGiuong.Count(g => g.LaDangHoat && !occupiedBedIds.Contains(g.MaGiuong));
            if (availableBeds <= 0)
            {
                return (false, "Phòng đã chọn hiện đã hết giường trống.", null, 400);
            }

            string appId = $"DK-{DateTime.Today:yyMMdd}-{Guid.NewGuid().ToString("N")[..8]}";
            var don = new DonDangKy
            {
                MaDonDangKy = appId,
                MaSinhVien = studentId,
                MaDotDangKy = req.MaDotDangKy,
                MaPhong = room.MaPhong,
                MaLoaiPhong = room.MaLoaiPhong,
                TrangThai = "choDuyet",
                NgayDangKy = now
            };

            await _context.DonDangKys.AddAsync(don);
            await _context.SaveChangesAsync();

            return (true, null, appId, 201);
        }

        public async Task<List<StudentApplicationDto>> GetApplicationsAsync(string studentId)
        {
            await _reservationExpiryService.ProcessExpiredReservationsAsync();

            var apps = await _context.DonDangKys
                .Where(d => d.MaSinhVien == studentId)
                .Include(d => d.DotDangKy)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.ToaNha)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.LoaiPhong)
                .Include(d => d.LoaiPhong)
                .OrderByDescending(d => d.NgayDangKy)
                .ToListAsync();

            var contracts = await _context.HopDongs
                .Where(h => h.MaSinhVien == studentId)
                .Include(h => h.Giuong)
                .ToListAsync();

            var now = DateTime.Now;
            return apps.Select(a =>
            {
                var linked = contracts.FirstOrDefault(c => c.MaDonDangKy == a.MaDonDangKy);
                return a.ToStudentApplicationDto(linked, now);
            }).ToList();
        }

        public async Task<StudentApplicationDto?> GetApplicationByIdAsync(string studentId, string applicationId)
        {
            await _reservationExpiryService.ProcessExpiredReservationsAsync();

            var app = await _context.DonDangKys
                .Where(d => d.MaDonDangKy == applicationId && d.MaSinhVien == studentId)
                .Include(d => d.DotDangKy)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.ToaNha)
                .Include(d => d.Phong)
                    .ThenInclude(p => p!.LoaiPhong)
                .Include(d => d.LoaiPhong)
                .FirstOrDefaultAsync();

            if (app == null) return null;

            var contract = await _context.HopDongs
                .Where(h => h.MaDonDangKy == applicationId && h.MaSinhVien == studentId)
                .Include(h => h.Giuong)
                .FirstOrDefaultAsync();

            return app.ToStudentApplicationDto(contract, DateTime.Now);
        }

        public async Task<ApplicationPaymentInfoDto?> GetApplicationPaymentInfoAsync(string studentId, string applicationId)
        {
            await _reservationExpiryService.ProcessExpiredReservationsAsync();

            var app = await _context.DonDangKys
                .FirstOrDefaultAsync(d => d.MaDonDangKy == applicationId && d.MaSinhVien == studentId);
            if (app == null) return null;

            var contract = await _context.HopDongs
                .FirstOrDefaultAsync(h => h.MaDonDangKy == applicationId && h.MaSinhVien == studentId);

            if (app.TrangThai != "daDuyet" || contract == null || contract.TrangThai != "choThanhToan")
            {
                return null;
            }

            var now = DateTime.Now;
            bool isExpired = contract.HanGiuCho.HasValue && contract.HanGiuCho.Value < now;

            var invoice = await _context.HoaDons
                .Where(hd => hd.MaHopDong == contract.MaHopDong)
                .Include(hd => hd.DanhSachChiTietHoaDon)
                .Include(hd => hd.DanhSachThanhToan)
                .FirstOrDefaultAsync();

            PaymentInvoiceDto? invoiceDto = null;
            VietQrDto? qrDto = null;
            string? message = null;

            if (invoice != null)
            {
                decimal total = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
                invoiceDto = new PaymentInvoiceDto
                {
                    Code = invoice.MaHoaDon,
                    Total = total,
                    Lines = invoice.DanhSachChiTietHoaDon.Select(l => new PaymentInvoiceLineDto
                    {
                        Description = !string.IsNullOrWhiteSpace(l.NoiDung) ? l.NoiDung : "Tiền phòng KTX",
                        Amount = l.ThanhTien ?? l.SoLuong * l.DonGia,
                        Quantity = l.SoLuong,
                        UnitPrice = l.DonGia
                    }).ToList()
                };

                var pOpt = _paymentOptions.Value;
                if (!string.IsNullOrWhiteSpace(pOpt.AccountNo))
                {
                    string qrUrl = $"https://img.vietqr.io/image/{pOpt.BankId}-{pOpt.AccountNo}-compact2.png?amount={total}&addInfo={invoice.MaHoaDon}&accountName={Uri.EscapeDataString(pOpt.AccountName)}";
                    qrDto = new VietQrDto
                    {
                        ImageUrl = qrUrl,
                        BankId = pOpt.BankId,
                        AccountNo = pOpt.AccountNo,
                        AccountName = pOpt.AccountName,
                        Amount = total,
                        Content = invoice.MaHoaDon
                    };
                }
                else
                {
                    message = "Chưa cấu hình tài khoản ngân hàng KTX. Vui lòng liên hệ BQL.";
                }
            }

            return new ApplicationPaymentInfoDto
            {
                Invoice = invoiceDto,
                Deadline = contract.HanGiuCho.HasValue ? contract.HanGiuCho.Value.ToUniversalTime().ToString("o") : "",
                ServerNow = DateTime.UtcNow.ToString("o"),
                Qr = qrDto,
                Verification = isExpired ? "hetHan" : "dangChoXacMinh",
                Message = message
            };
        }

        // 5. Contracts
        public async Task<List<StudentContractDto>> GetContractsAsync(string studentId)
        {
            var contracts = await _context.HopDongs
                .Where(h => h.MaSinhVien == studentId)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .OrderByDescending(h => h.NgayBatDau)
                .ToListAsync();

            return contracts.Select(c => c.ToStudentContractDto()).ToList();
        }

        public async Task<StudentContractDto?> GetContractByIdAsync(string studentId, string contractId)
        {
            var contract = await _context.HopDongs
                .Where(h => h.MaHopDong == contractId && h.MaSinhVien == studentId)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .FirstOrDefaultAsync();

            return contract?.ToStudentContractDto();
        }

        // 6. Invoices & Utilities
        public async Task<List<StudentInvoiceListItemDto>> GetInvoicesAsync(string studentId, string? status = null, string? type = null)
        {
            var query = _context.HoaDons
                .Where(h => h.HopDong != null && h.HopDong.MaSinhVien == studentId)
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(h => h.TrangThai == status);
            }

            var invoices = await query.OrderByDescending(h => h.Nam).ThenByDescending(h => h.Thang).ToListAsync();

            var list = invoices.Select(h =>
            {
                bool isReg = h.HopDong?.MaDonDangKy != null && 
                             h.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == "tienPhong") &&
                             (h.HopDong.TrangThai == "choThanhToan" || h.Thang == h.HopDong.NgayBatDau.Month);
                return h.ToStudentInvoiceListItemDto(isReg);
            }).ToList();

            if (!string.IsNullOrWhiteSpace(type))
            {
                if (type.Equals("registration", StringComparison.OrdinalIgnoreCase))
                {
                    list = list.Where(i => i.IsRegistration).ToList();
                }
                else if (type.Equals("recurring", StringComparison.OrdinalIgnoreCase))
                {
                    list = list.Where(i => !i.IsRegistration).ToList();
                }
            }

            return list;
        }

        public async Task<StudentInvoiceDetailDto?> GetInvoiceByIdAsync(string studentId, string invoiceId)
        {
            var invoice = await _context.HoaDons
                .Where(h => h.MaHoaDon == invoiceId && h.HopDong != null && h.HopDong.MaSinhVien == studentId)
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .FirstOrDefaultAsync();

            if (invoice == null) return null;

            bool isReg = invoice.HopDong?.MaDonDangKy != null && 
                         invoice.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == "tienPhong") &&
                         (invoice.HopDong.TrangThai == "choThanhToan" || invoice.Thang == invoice.HopDong.NgayBatDau.Month);

            return invoice.ToStudentInvoiceDetailDto(isReg);
        }

        public async Task<StudentUtilityDto?> GetUtilitiesAsync(string studentId)
        {
            var activeContract = await _context.HopDongs
                .Where(h => h.MaSinhVien == studentId && h.TrangThai == "hieuLuc")
                .Include(h => h.Giuong)
                .FirstOrDefaultAsync();

            if (activeContract?.Giuong == null)
            {
                return new StudentUtilityDto();
            }

            string maPhong = activeContract.Giuong.MaPhong;

            var meterReadings = await _context.ChiSoDienNuocs
                .Where(c => c.MaPhong == maPhong)
                .OrderByDescending(c => c.Nam)
                .ThenByDescending(c => c.Thang)
                .Take(24)
                .ToListAsync();

            var groupedReadings = meterReadings
                .GroupBy(c => new { c.Thang, c.Nam })
                .Select(g =>
                {
                    var dien = g.FirstOrDefault(x => x.Loai == "dien");
                    var nuoc = g.FirstOrDefault(x => x.Loai == "nuoc");
                    var ngayGhi = g.OrderByDescending(x => x.NgayGhi).FirstOrDefault()?.NgayGhi;
                    return new StudentMeterReadingDto
                    {
                        Thang = g.Key.Thang,
                        Nam = g.Key.Nam,
                        ChiSoDienCu = dien?.ChiSoCu ?? 0,
                        ChiSoDienMoi = dien?.ChiSoMoi ?? 0,
                        DienTieuThu = dien != null ? Math.Max(0, dien.ChiSoMoi - dien.ChiSoCu) : 0,
                        ChiSoNuocCu = nuoc?.ChiSoCu ?? 0,
                        ChiSoNuocMoi = nuoc?.ChiSoMoi ?? 0,
                        NuocTieuThu = nuoc != null ? Math.Max(0, nuoc.ChiSoMoi - nuoc.ChiSoCu) : 0,
                        NgayGhi = ngayGhi?.ToString("dd/MM/yyyy")
                    };
                })
                .ToList();

            var services = await _context.DangKyDichVus
                .Where(d => d.MaHopDong == activeContract.MaHopDong)
                .Include(d => d.DichVu)
                .ToListAsync();

            return new StudentUtilityDto
            {
                MeterReadings = groupedReadings,
                RegisteredServices = services.Select(s => s.ToStudentRegisteredServiceDto()).ToList()
            };
        }

        // 7. Maintenance
        public async Task<List<StudentMaintenanceDto>> GetMaintenanceTicketsAsync(string studentId)
        {
            var tickets = await _context.YeuCauSuaChuas
                .Where(y => y.MaSinhVienGui == studentId)
                .Include(y => y.TaiSanPhong)
                .OrderByDescending(y => y.NgayGui)
                .ToListAsync();

            return tickets.Select(t => t.ToStudentMaintenanceDto()).ToList();
        }

        public async Task<StudentMaintenanceDto?> GetMaintenanceTicketByIdAsync(string studentId, int id)
        {
            var ticket = await _context.YeuCauSuaChuas
                .Where(y => y.MaYeuCau == id && y.MaSinhVienGui == studentId)
                .Include(y => y.TaiSanPhong)
                .FirstOrDefaultAsync();

            return ticket?.ToStudentMaintenanceDto();
        }

        public async Task<(bool Success, string? ErrorMessage, int StatusCode)> CreateMaintenanceTicketAsync(
            string studentId, CreateMaintenanceRequestDto req, string appDataPath)
        {
            var activeContract = await _context.HopDongs
                .Where(h => h.MaSinhVien == studentId && h.TrangThai == "hieuLuc")
                .Include(h => h.Giuong)
                .FirstOrDefaultAsync();

            if (activeContract?.Giuong == null)
            {
                return (false, "Bạn chỉ có thể gửi yêu cầu sửa chữa khi đang có hợp đồng nội trú có hiệu lực.", 409);
            }

            string? savedFileName = null;
            if (req.Image != null)
            {
                try
                {
                    string dir = Path.Combine(appDataPath, "maintenance");
                    Directory.CreateDirectory(dir);

                    string ext = Path.GetExtension(req.Image.FileName).ToLowerInvariant();
                    savedFileName = $"{Guid.NewGuid():N}{ext}";
                    string fullPath = Path.Combine(dir, savedFileName);

                    using var stream = new FileStream(fullPath, FileMode.Create);
                    await req.Image.CopyToAsync(stream);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi lưu ảnh minh họa sửa chữa.");
                    return (false, "Không thể lưu tệp ảnh minh họa.", 500);
                }
            }

            var ticket = new YeuCauSuaChua
            {
                MaPhong = activeContract.Giuong.MaPhong,
                MaSinhVienGui = studentId,
                MoTa = req.MoTa.Trim(),
                LoaiSuCo = string.IsNullOrWhiteSpace(req.LoaiSuCo) ? null : req.LoaiSuCo.Trim(),
                MucDoKhanCap = string.IsNullOrWhiteSpace(req.MucDoKhanCap) ? "binhThuong" : req.MucDoKhanCap.Trim(),
                AnhMinhHoa = savedFileName,
                TrangThai = "moiGui",
                NgayGui = DateTime.Now
            };

            await _context.YeuCauSuaChuas.AddAsync(ticket);
            await _context.SaveChangesAsync();

            return (true, null, 201);
        }

        public async Task<(byte[]? FileBytes, string? ContentType)> GetMaintenanceImageAsync(string studentId, int id, string appDataPath)
        {
            var ticket = await _context.YeuCauSuaChuas
                .FirstOrDefaultAsync(y => y.MaYeuCau == id && y.MaSinhVienGui == studentId);

            if (ticket == null || string.IsNullOrEmpty(ticket.AnhMinhHoa))
            {
                return (null, null);
            }

            string filePath = Path.Combine(appDataPath, "maintenance", ticket.AnhMinhHoa);
            if (!File.Exists(filePath))
            {
                return (null, null);
            }

            byte[] bytes = await File.ReadAllBytesAsync(filePath);
            string ext = Path.GetExtension(ticket.AnhMinhHoa).ToLowerInvariant();
            string contentType = ext == ".png" ? "image/png" : "image/jpeg";

            return (bytes, contentType);
        }

        // 8. Violations
        public async Task<List<StudentViolationDto>> GetViolationsAsync(string studentId)
        {
            var violations = await _context.ViPhams
                .Where(v => v.MaSinhVien == studentId)
                .Include(v => v.LoaiViPham)
                .OrderByDescending(v => v.NgayViPham)
                .ToListAsync();

            return violations.Select(v => v.ToStudentViolationDto()).ToList();
        }

        // 9. Notifications
        public async Task<List<StudentNotificationDto>> GetNotificationsAsync(string studentId, bool unreadOnly = false)
        {
            var query = _context.ThongBaos
                .Where(t => t.MaSinhVien == studentId)
                .AsQueryable();

            if (unreadOnly)
            {
                query = query.Where(t => !t.DaDoc);
            }

            var list = await query.OrderByDescending(t => t.NgayTao).ToListAsync();
            return list.Select(n => n.ToStudentNotificationDto()).ToList();
        }

        public async Task<int> GetUnreadNotificationCountAsync(string studentId)
        {
            return await _context.ThongBaos.CountAsync(t => t.MaSinhVien == studentId && !t.DaDoc);
        }

        public async Task<bool> MarkNotificationAsReadAsync(string studentId, int notificationId)
        {
            var notif = await _context.ThongBaos
                .FirstOrDefaultAsync(t => t.MaThongBao == notificationId && t.MaSinhVien == studentId);
            if (notif == null) return false;

            notif.DaDoc = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllNotificationsAsReadAsync(string studentId)
        {
            var unread = await _context.ThongBaos
                .Where(t => t.MaSinhVien == studentId && !t.DaDoc)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.DaDoc = true;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> BroadcastNotificationAsync(BroadcastNotificationDto dto)
        {
            var query = _context.HopDongs
                .Where(h => h.TrangThai == "hieuLuc")
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(dto.ToaNha))
            {
                query = query.Where(h => h.Giuong != null && h.Giuong.Phong != null && h.Giuong.Phong.MaToaNha == dto.ToaNha);
            }

            var studentIds = await query.Select(h => h.MaSinhVien).Distinct().ToListAsync();
            if (studentIds.Count == 0) return 0;

            var now = DateTime.Now;
            foreach (var sid in studentIds)
            {
                _context.ThongBaos.Add(new ThongBao
                {
                    MaSinhVien = sid,
                    TieuDe = dto.TieuDe.Trim(),
                    NoiDung = dto.NoiDung.Trim(),
                    Loai = "chung",
                    LienKet = "/student/notifications",
                    DaDoc = false,
                    NgayTao = now
                });
            }

            await _context.SaveChangesAsync();
            return studentIds.Count;
        }

        // 10. Support Info
        public StudentSupportInfoDto GetSupportInfo()
        {
            var opt = _portalOptions.Value;
            return new StudentSupportInfoDto
            {
                Regulations = opt.Regulations,
                RegistrationGuide = opt.RegistrationGuide,
                PaymentGuide = opt.PaymentGuide,
                CheckInOutProcess = opt.CheckInOutProcess,
                ContactInfo = opt.ContactInfo
            };
        }
    }
}
