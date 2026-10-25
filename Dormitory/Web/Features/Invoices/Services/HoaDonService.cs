using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Mappings;
using Dormitory.Web.Features.Payments.Entities;

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
            if (!DateTime.TryParseExact(
                    req.DueDate,
                    new[] { "dd/MM/yyyy", "yyyy-MM-dd" },
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out var dueDate))
            {
                return null;
            }

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

            var amount = req.Amount;
            var invoice = new HoaDon
            {
                MaHoaDon = $"HD-{DateTime.Today:yyMM}-{Guid.NewGuid().ToString("N")[..8]}",
                MaHopDong = contract.MaHopDong,
                Thang = DateTime.Today.Month,
                Nam = DateTime.Today.Year,
                HanThanhToan = dueDate.Date,
                TrangThai = "chuaThanhToan",
                NgayLap = DateTime.Now
            };
            invoice.DanhSachChiTietHoaDon.Add(new()
            {
                LoaiKhoan = req.Category switch
                {
                    "phong" => "tienPhong",
                    "diennuoc" => "dien",
                    _ => "khac"
                },
                NoiDung = req.Title.Trim(),
                SoLuong = 1,
                DonGia = amount,
                ThanhTien = amount
            });

            _context.HoaDons.Add(invoice);
            await _context.SaveChangesAsync();

            invoice.HopDong = contract;
            return invoice.ToInvoiceItemDto();
        }

        public async Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod, string? academicYear = null)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.DanhSachChiTietHoaDon)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId && h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear);

            if (invoice == null || invoice.TrangThai == "daThanhToan")
            {
                return false;
            }

            var method = paymentMethod.ToLowerInvariant();
            var paymentType = method.Contains("vnpay") || method.Contains("ví điện tử")
                ? "viDienTu"
                : method.Contains("chuyển khoản") || method.Contains("chuyen khoan")
                    ? "chuyenKhoan"
                    : method.Contains("tiền mặt") || method.Contains("tien mat")
                        ? "tienMat"
                        : null;

            var invoiceTotal = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            var outstanding = invoiceTotal - invoice.DanhSachThanhToan.Sum(t => t.SoTien);
            if (paymentType == null || outstanding <= 0)
            {
                return false;
            }

            _context.ThanhToans.Add(new ThanhToan
            {
                MaThanhToan = $"TT-{Guid.NewGuid().ToString("N")[..8]}",
                MaHoaDon = invoice.MaHoaDon,
                SoTien = outstanding,
                NgayThanhToan = DateTime.Now,
                PhuongThuc = paymentType
            });
            invoice.TrangThai = "daThanhToan";
            await _context.SaveChangesAsync();
            return true;
        }

        private static string NormalizeCode(string value) =>
            new(value.Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
    }
}
