using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Mappings;
using Dormitory.Web.Features.Payments.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Invoices.Services
{
    public class HoaDonService : IHoaDonService
    {
        private readonly ApplicationDbContext _context;

        public HoaDonService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear) ||
                !await _context.NamHocs.AnyAsync(n => n.MaNamHoc == academicYear))
                return new List<InvoiceItemDto>();

            var invoices = await _context.HoaDons
                .Where(h => h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.SinhVien)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.DanhSachChiTietHoaDon)
                .AsSplitQuery()
                .OrderByDescending(h => h.NgayLap)
                .ToListAsync();

            var result = invoices.Select(h => h.ToInvoiceItemDto()).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(i => i.Code.ToLower().Contains(s) || i.StudentName.ToLower().Contains(s) || i.StudentId.ToLower().Contains(s) || i.Room.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "all")
            {
                result = result.Where(i => i.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "all")
            {
                result = result.Where(i => i.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                result = result.Where(i => i.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<InvoiceItemDto?> CreateInvoiceAsync(CreateInvoiceDto req, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear)) return null;
            if (req.Amount <= 0) return null;
            if (!DateTime.TryParseExact(
                    req.DueDate,
                    new[] { "dd/MM/yyyy", "yyyy-MM-dd" },
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out var dueDate))
            {
                return null;
            }

            var year = await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return null;

            var contracts = await _context.HopDongs
                .Include(h => h.SinhVien)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .Where(h => h.MaSinhVien == req.StudentId && h.TrangThai == "hieuLuc" && h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear)
                .ToListAsync();

            var requestedRoom = NormalizeCode(req.Room);
            var contract = contracts.FirstOrDefault(h =>
                h.Giuong?.Phong?.MaToaNha.Equals(req.Building, StringComparison.OrdinalIgnoreCase) == true &&
                NormalizeCode($"{h.Giuong.Phong.MaToaNha}-{h.Giuong.Phong.MaPhong.Split('_').Last()}") == requestedRoom);

            if (contract == null)
            {
                return null;
            }

            int invoiceMonth = req.Month is >= 1 and <= 12 ? req.Month.Value : DateTime.Today.Month;
            int invoiceYear = req.Year is >= 2000 and <= 2100 ? req.Year.Value : DateTime.Today.Year;
            var invoiceDate = new DateTime(invoiceYear, invoiceMonth, 1);
            if (invoiceDate < new DateTime(year.NgayBatDau.Year, year.NgayBatDau.Month, 1) ||
                invoiceDate > new DateTime(year.NgayKetThuc.Year, year.NgayKetThuc.Month, 1))
            {
                return null;
            }

            var loaiKhoan = req.Category switch
            {
                "phong" => "tienPhong",
                "diennuoc" => "dien",
                _ => "khac"
            };

            // Chống tạo trùng hóa đơn khi người dùng bấm nhiều lần.
            var existing = await _context.HoaDons
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.SinhVien)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.DanhSachChiTietHoaDon)
                .FirstOrDefaultAsync(h =>
                    h.MaHopDong == contract.MaHopDong &&
                    h.Thang == invoiceMonth && h.Nam == invoiceYear &&
                    h.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == loaiKhoan && d.NoiDung == req.Title.Trim()));
            if (existing != null)
            {
                return existing.ToInvoiceItemDto();
            }

            // Dùng chung công thức tính tổng để mọi hóa đơn có cùng quy tắc.
            var amount = InvoiceCalculator.CalculateTotal(req.Amount);
            var invoice = new HoaDon
            {
                MaHoaDon = Shared.Helpers.IdGenerator.Next("HD", new DateTime(invoiceYear, invoiceMonth, 1)),
                MaHopDong = contract.MaHopDong,
                Thang = invoiceMonth,
                Nam = invoiceYear,
                HanThanhToan = dueDate.Date,
                TrangThai = "chuaThanhToan",
                NgayLap = DateTime.Now
            };
            invoice.DanhSachChiTietHoaDon.Add(new()
            {
                LoaiKhoan = loaiKhoan,
                NoiDung = req.Title.Trim(),
                SoLuong = 1,
                DonGia = amount,
                ThanhTien = amount
            });

            // Gán hợp đồng trước khi lưu để hóa đơn tạo tay được gửi ngay,
            // sinh viên nhận thông báo mà không phải đợi BQL bấm Gửi.
            invoice.HopDong = contract;
            invoice.NgayGui = DateTime.Now;
            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = contract.MaSinhVien,
                TieuDe = $"Hóa đơn {invoice.MaHoaDon} đã được phát hành",
                NoiDung = $"Ký túc xá đã gửi hóa đơn tháng {invoice.Thang:D2}/{invoice.Nam} (số tiền phải nộp {amount:n0} đ, hạn nộp {invoice.HanThanhToan:dd/MM/yyyy}). " +
                          "Bạn vào mục Hóa đơn & Biên nhận để xem và thanh toán.",
                Loai = "hoaDon",
                LienKet = "/student/invoice",
                DaDoc = false,
                NgayTao = DateTime.Now
            });

            _context.HoaDons.Add(invoice);
            await _context.SaveChangesAsync();

            return invoice.ToInvoiceItemDto();
        }

        public async Task<bool> SendInvoiceAsync(string invoiceId, string? academicYear = null)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId &&
                    (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));

            if (invoice == null || invoice.NgayGui != null) return false;

            var total = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            var outstanding = PaymentRules.CalculateOutstanding(total, invoice.DanhSachThanhToan.Sum(t => t.SoTien));

            invoice.NgayGui = DateTime.Now;
            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = invoice.HopDong!.MaSinhVien,
                TieuDe = $"Hóa đơn {invoice.MaHoaDon} đã được phát hành",
                NoiDung = $"Ký túc xá đã gửi hóa đơn tháng {invoice.Thang:D2}/{invoice.Nam} (số tiền còn phải nộp {outstanding:n0} đ, hạn nộp {invoice.HanThanhToan:dd/MM/yyyy}). " +
                          "Bạn vào mục Hóa đơn & Biên nhận để xem và thanh toán.",
                Loai = "hoaDon",
                LienKet = "/student/invoice",
                DaDoc = false,
                NgayTao = DateTime.Now
            });
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod, string? academicYear = null, string? staffId = null,
            IFormFile? proofFile = null, string? appDataPath = null)
        {
            // Chứng từ BQL đính kèm được lưu tệp trước, chỉ gắn tên tệp vào phiếu thu khi giao dịch DB thành công.
            string? proofFileName = null;
            if (proofFile != null && proofFile.Length > 0 && !string.IsNullOrWhiteSpace(appDataPath))
            {
                var (fileName, error) = await PaymentProofStorage.SaveAsync(proofFile, appDataPath);
                if (fileName == null) return false;
                proofFileName = fileName;
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = _context.Database.IsRelational()
                    ? await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                    : await _context.Database.BeginTransactionAsync();
                try
                {
                    var invoice = await _context.HoaDons
                        .Include(h => h.HopDong)
                        .Include(h => h.DanhSachThanhToan)
                        .Include(h => h.DanhSachChiTietHoaDon)
                        .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId && (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));

                    if (invoice == null || invoice.TrangThai == "daThanhToan" || invoice.TrangThai == "daHuy")
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan")
                    {
                        if (Dormitory.Web.Features.Registrations.Services.RegistrationRules.IsReservationExpired(invoice.HopDong.HanGiuCho, DateTime.Now))
                        {
                            await tx.RollbackAsync();
                            return false;
                        }
                    }

                    var paymentType = PaymentRules.NormalizePaymentMethod(paymentMethod);
                    if (paymentType == null)
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    var baseTotal = invoice.DanhSachChiTietHoaDon
                        .Where(d => d.LoaiKhoan != "phatTreHan")
                        .Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);

                    // Áp phạt trễ hạn đúng một lần cho mỗi hóa đơn quá hạn.
                    int daysOverdue = (DateTime.Today - invoice.HanThanhToan.Date).Days;
                    var penalty = InvoiceCalculator.CalculateLatePenalty(baseTotal, daysOverdue);
                    bool hasPenalty = invoice.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == "phatTreHan");
                    if (penalty > 0 && !hasPenalty)
                    {
                        invoice.DanhSachChiTietHoaDon.Add(new()
                        {
                            MaHoaDon = invoice.MaHoaDon,
                            LoaiKhoan = "phatTreHan",
                            NoiDung = $"Phạt trễ hạn {daysOverdue} ngày",
                            SoLuong = 1,
                            DonGia = penalty,
                            ThanhTien = penalty
                        });
                        await _context.SaveChangesAsync();
                    }

                    var invoiceTotal = PaymentRules.CalculateInvoiceTotal(
                        invoice.DanhSachChiTietHoaDon.Select(d => (d.ThanhTien, d.SoLuong, d.DonGia)));
                    var outstanding = PaymentRules.CalculateOutstanding(
                        invoiceTotal, invoice.DanhSachThanhToan.Sum(t => t.SoTien));
                    if (outstanding <= 0)
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    _context.ThanhToans.Add(new ThanhToan
                    {
                        MaThanhToan = Shared.Helpers.IdGenerator.Next("TT"),
                        MaHoaDon = invoice.MaHoaDon,
                        SoTien = outstanding,
                        NgayThanhToan = DateTime.Now,
                        PhuongThuc = paymentType,
                        MaNhanVienThu = staffId,
                        AnhMinhChung = proofFileName
                    });
                    invoice.TrangThai = "daThanhToan";

                    if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan")
                    {
                        invoice.HopDong.TrangThai = "hieuLuc";
                        if (!string.IsNullOrEmpty(staffId))
                        {
                            invoice.HopDong.MaNhanVienLap = staffId;
                        }

                        _context.ThongBaos.Add(new Features.Students.Entities.ThongBao
                        {
                            MaSinhVien = invoice.HopDong.MaSinhVien,
                            TieuDe = "Xác nhận thanh toán thành công",
                            NoiDung = $"Đã nhận tiền cho hóa đơn {invoice.MaHoaDon}. Hợp đồng {invoice.HopDong.MaHopDong} đã chính thức có hiệu lực. Bạn có thể đến KTX làm thủ tục nhận phòng.",
                            Loai = "thanhToan",
                            LienKet = "/student/contract",
                            DaDoc = false,
                            NgayTao = DateTime.Now
                        });
                    }
                    else if (invoice.HopDong != null)
                    {
                        // Hóa đơn sinh hoạt phí hàng tháng khi tất toán cũng phải có biên nhận điện tử.
                        _context.ThongBaos.Add(new Features.Students.Entities.ThongBao
                        {
                            MaSinhVien = invoice.HopDong.MaSinhVien,
                            TieuDe = $"Hóa đơn {invoice.MaHoaDon} đã được thanh toán",
                            NoiDung = $"Ký túc xá đã nhận đủ {outstanding:n0} đ cho hóa đơn tháng {invoice.Thang:D2}/{invoice.Nam}. Cảm ơn bạn đã thanh toán đúng hạn.",
                            Loai = "thanhToan",
                            LienKet = "/student/invoice",
                            DaDoc = false,
                            NgayTao = DateTime.Now
                        });
                    }

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                    return true;
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<(bool Success, string? ErrorMessage)> SubmitPaymentProofAsync(string invoiceId, string studentId,
            IFormFile? proofFile, string appDataPath)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId &&
                    h.HopDong != null && h.HopDong.MaSinhVien == studentId);

            if (invoice == null) return (false, "Không tìm thấy hóa đơn.");
            if (invoice.TrangThai == "daThanhToan") return (false, "Hóa đơn đã được thanh toán, không cần nộp minh chứng.");

            var (fileName, error) = await PaymentProofStorage.SaveAsync(proofFile, appDataPath);
            if (fileName == null) return (false, error);

            // Nộp lại thì thay tệp cũ để không tồn đọng tệp rác.
            PaymentProofStorage.Delete(invoice.AnhMinhChung, appDataPath);
            invoice.AnhMinhChung = fileName;
            invoice.NgayNopMinhChung = DateTime.Now;
            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(byte[]? FileBytes, string? ContentType)> GetInvoiceProofAsync(string invoiceId, string? studentId = null, string? appDataPath = null)
        {
            if (string.IsNullOrWhiteSpace(appDataPath)) return (null, null);

            var query = _context.HoaDons.Where(h => h.MaHoaDon == invoiceId);
            if (!string.IsNullOrWhiteSpace(studentId))
                query = query.Where(h => h.HopDong != null && h.HopDong.MaSinhVien == studentId);

            var invoice = await query.FirstOrDefaultAsync();
            if (invoice == null || string.IsNullOrEmpty(invoice.AnhMinhChung)) return (null, null);

            return await PaymentProofStorage.ReadAsync(invoice.AnhMinhChung, appDataPath);
        }

        public async Task<(byte[]? FileBytes, string? ContentType)> GetPaymentProofAsync(string paymentId, string? appDataPath = null)
        {
            if (string.IsNullOrWhiteSpace(appDataPath)) return (null, null);

            var payment = await _context.ThanhToans.FirstOrDefaultAsync(t => t.MaThanhToan == paymentId);
            if (payment == null || string.IsNullOrEmpty(payment.AnhMinhChung)) return (null, null);

            return await PaymentProofStorage.ReadAsync(payment.AnhMinhChung, appDataPath);
        }

        private static string NormalizeCode(string value) =>
            new(value.Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
    }
}
