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
                if (status.Equals("choXacNhan", StringComparison.OrdinalIgnoreCase))
                {
                    result = result.Where(i => i.PaymentStatus.Equals("choXacNhan", StringComparison.OrdinalIgnoreCase)).ToList();
                }
                else if (status.Equals("daNhanThanhToan", StringComparison.OrdinalIgnoreCase))
                {
                    result = result.Where(i => i.PaymentStatus.Equals("daNhanThanhToan", StringComparison.OrdinalIgnoreCase) || i.Status.Equals("paid", StringComparison.OrdinalIgnoreCase)).ToList();
                }
                else if (status.Equals("chuaThanhToan", StringComparison.OrdinalIgnoreCase))
                {
                    result = result.Where(i => i.PaymentStatus.Equals("chuaThanhToan", StringComparison.OrdinalIgnoreCase) && !i.IsDraft).ToList();
                }
                else
                {
                    result = result.Where(i => i.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
                }
            }

            return result;
        }

        public async Task<InvoiceItemDto?> CreateInvoiceAsync(CreateInvoiceDto req, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear)) return null;
            if (req.Amount <= 0 || req.Amount > 1_000_000_000m) return null;
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
                    h.Thang == invoiceMonth && h.Nam == invoiceYear && h.TrangThai != "daHuy" &&
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
                // Hóa đơn lập tay lưu nháp trước; chỉ khi BQL bấm Gửi sinh viên mới nhận được.
                TrangThai = "nhap",
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

            invoice.HopDong = contract;
            _context.HoaDons.Add(invoice);
            await _context.SaveChangesAsync();

            return invoice.ToInvoiceItemDto();
        }

        public async Task<(bool Success, string? ErrorMessage)> UpdateDraftInvoiceAsync(
            string invoiceId, UpdateInvoiceDraftDto req, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(invoiceId)) return (false, "Mã hóa đơn không được để trống.");
            if (!DateTime.TryParseExact(
                    req.DueDate,
                    new[] { "dd/MM/yyyy", "yyyy-MM-dd" },
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out var dueDate))
            {
                return (false, "Hạn thanh toán không hợp lệ.");
            }

            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId &&
                    (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));

            if (invoice == null) return (false, "Không tìm thấy hóa đơn.");
            if (invoice.TrangThai != "nhap") return (false, "Chỉ chỉnh sửa được hóa đơn nháp chưa gửi sinh viên.");
            if (invoice.DanhSachChiTietHoaDon.Count != 1)
                return (false, "Hóa đơn điện nước nhiều khoản phải chỉnh sửa ở trang Điện nước & Dịch vụ.");

            var amount = InvoiceCalculator.CalculateTotal(req.Amount);
            var line = invoice.DanhSachChiTietHoaDon.First();
            line.NoiDung = req.Title.Trim();
            line.SoLuong = 1;
            line.DonGia = amount;
            line.ThanhTien = amount;
            invoice.HanThanhToan = dueDate.Date;

            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<bool> SendInvoiceAsync(string invoiceId, string? academicYear = null)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId &&
                    (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));

            if (invoice == null || invoice.NgayGui != null || invoice.TrangThai == "daHuy" || invoice.TrangThai == "daThanhToan")
                return false;

            var total = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            var outstanding = PaymentRules.CalculateOutstanding(total, invoice.DanhSachThanhToan.Sum(t => t.SoTien));

            // Nháp chuyển thành hóa đơn chính thức khi BQL bấm gửi.
            if (invoice.TrangThai == "nhap") invoice.TrangThai = "chuaThanhToan";
            invoice.NgayGui = DateTime.Now;
            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = invoice.HopDong!.MaSinhVien,
                TieuDe = $"Hóa đơn {invoice.MaHoaDon} đã được phát hành",
                NoiDung = $"Ký túc xá đã gửi hóa đơn tháng {invoice.Thang:D2}/{invoice.Nam} (số tiền còn phải nộp {outstanding:n0} đ, hạn nộp {invoice.HanThanhToan:dd/MM/yyyy}). " +
                          "Bạn vào mục Hóa đơn & Biên nhận, mở hóa đơn để quét mã VietQR đã điền sẵn số tiền và nội dung chuyển khoản, sau đó gửi ảnh minh chứng để BQL đối soát.",
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

                    if (invoice == null || invoice.TrangThai == "daThanhToan" || invoice.TrangThai == "daHuy" || invoice.TrangThai == "nhap")
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    // Chặn xác nhận nhầm hóa đơn có minh chứng đã bị từ chối mà sinh viên chưa nộp lại (trừ trường hợp BQL đính kèm chứng từ mới).
                    if (!string.IsNullOrEmpty(invoice.LyDoTuChoiMinhChung) && proofFileName == null)
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
                    var paymentRefDate = invoice.NgayNopMinhChung?.Date ?? DateTime.Today;
                    int daysOverdue = (paymentRefDate - invoice.HanThanhToan.Date).Days;
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
                        MaNhanVienThu = !string.IsNullOrWhiteSpace(staffId) && await _context.NhanViens.AnyAsync(n => n.MaNhanVien == staffId) ? staffId : null,
                        AnhMinhChung = proofFileName ?? (!string.IsNullOrEmpty(invoice.AnhMinhChung) ? invoice.AnhMinhChung : null)
                    });
                    invoice.TrangThai = "daThanhToan";

                    if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan")
                    {
                        invoice.HopDong.TrangThai = "hieuLuc";
                        if (!string.IsNullOrEmpty(staffId))
                        {
                            invoice.HopDong.MaNhanVienLap = await _context.NhanViens.AnyAsync(n => n.MaNhanVien == staffId) ? staffId : invoice.HopDong.MaNhanVienLap;
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
            if (invoice.TrangThai == "nhap") return (false, "Hóa đơn chưa được gửi cho sinh viên nên chưa thể nộp minh chứng.");
            if (invoice.TrangThai == "daHuy") return (false, "Hóa đơn đã bị hủy, không thể nộp minh chứng.");
            if (invoice.TrangThai == "daThanhToan") return (false, "Hóa đơn đã được thanh toán, không cần nộp minh chứng.");

            if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan" &&
                Features.Registrations.Services.RegistrationRules.IsReservationExpired(invoice.HopDong.HanGiuCho, DateTime.Now))
            {
                return (false, "Đã hết thời hạn giữ chỗ 24 giờ, không thể nộp minh chứng thanh toán.");
            }

            var (fileName, error) = await PaymentProofStorage.SaveAsync(proofFile, appDataPath);
            if (fileName == null) return (false, error);

            // Nộp lại thì thay tệp cũ để không tồn đọng tệp rác.
            PaymentProofStorage.Delete(invoice.AnhMinhChung, appDataPath);
            invoice.AnhMinhChung = fileName;
            invoice.NgayNopMinhChung = DateTime.Now;
            // Nộp lại nghĩa là phản hồi lý do từ chối trước đó.
            invoice.LyDoTuChoiMinhChung = null;
            invoice.NgayTuChoiMinhChung = null;
            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool Success, string? ErrorMessage)> RejectPaymentProofAsync(
            string invoiceId, string? reason, string? academicYear = null, string? staffId = null)
        {
            if (string.IsNullOrWhiteSpace(reason)) return (false, "Vui lòng nhập lý do từ chối minh chứng.");

            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId);
            if (invoice == null) return (false, "Không tìm thấy hóa đơn.");
            if (invoice.TrangThai == "daThanhToan") return (false, "Hóa đơn đã được thanh toán, không thể từ chối.");
            if (string.IsNullOrEmpty(invoice.AnhMinhChung)) return (false, "Sinh viên chưa nộp minh chứng để từ chối.");

            invoice.LyDoTuChoiMinhChung = reason.Trim();
            invoice.NgayTuChoiMinhChung = DateTime.Now;

            if (invoice.HopDong != null)
            {
                // Hóa đơn giữ chỗ nói rõ hạn 24h; hóa đơn thường nhắc hạn thanh toán.
                string deadlineText = invoice.HopDong.HanGiuCho is DateTime hold
                    ? $"trước {hold:HH:mm dd/MM/yyyy}"
                    : $"trước hạn thanh toán {invoice.HanThanhToan:dd/MM/yyyy}";
                _context.ThongBaos.Add(new Features.Students.Entities.ThongBao
                {
                    MaSinhVien = invoice.HopDong.MaSinhVien,
                    TieuDe = "Minh chứng thanh toán bị từ chối",
                    NoiDung = ($"Minh chứng cho hóa đơn {invoice.MaHoaDon} chưa hợp lệ. Lý do: {reason.Trim()}. Vui lòng nộp lại minh chứng {deadlineText}.").Length > 490
                        ? ($"Minh chứng cho hóa đơn {invoice.MaHoaDon} chưa hợp lệ. Lý do: {reason.Trim()}. Vui lòng nộp lại minh chứng {deadlineText}.")[..490]
                        : $"Minh chứng cho hóa đơn {invoice.MaHoaDon} chưa hợp lệ. Lý do: {reason.Trim()}. Vui lòng nộp lại minh chứng {deadlineText}.",
                    Loai = "thanhToan",
                    LienKet = "/student/invoice",
                    DaDoc = false,
                    NgayTao = DateTime.Now
                });
            }

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

        public async Task<(byte[]? FileBytes, string? ContentType)> GetPaymentProofAsync(string paymentId, string? appDataPath = null, string? invoiceId = null)
        {
            if (string.IsNullOrWhiteSpace(appDataPath)) return (null, null);

            var payment = await _context.ThanhToans.FirstOrDefaultAsync(t => t.MaThanhToan == paymentId && (string.IsNullOrWhiteSpace(invoiceId) || t.MaHoaDon == invoiceId.Trim()));
            if (payment == null || string.IsNullOrEmpty(payment.AnhMinhChung)) return (null, null);

            return await PaymentProofStorage.ReadAsync(payment.AnhMinhChung, appDataPath);
        }

        private static string NormalizeCode(string value) =>
            new(value.Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
    }
}
