using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Entities;

namespace Dormitory.Web.Features.Payments.Services
{
    public class ThanhToanService : IThanhToanService
    {
        private readonly ApplicationDbContext _context;

        public ThanhToanService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> ProcessPaymentAsync(ConfirmPaymentDto req, string? academicYear = null, string? staffId = null)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.DanhSachChiTietHoaDon)
                .FirstOrDefaultAsync(h => h.MaHoaDon == req.InvoiceId && (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));
            if (invoice == null || invoice.TrangThai == "daThanhToan")
            {
                return false;
            }

            if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan")
            {
                if (Dormitory.Web.Features.Registrations.Services.RegistrationRules.IsReservationExpired(invoice.HopDong.HanGiuCho, DateTime.Now))
                {
                    return false;
                }
            }

            var method = (req.PaymentMethod ?? string.Empty).ToLowerInvariant().Replace(" ", "").Replace("-", "");
            var paymentType = method.Contains("vnpay") || method.Contains("vidientu") || method.Contains("víđiệntử")
                ? "viDienTu"
                : method.Contains("chuyenkhoan") || method.Contains("chuyểnkhoản")
                    ? "chuyenKhoan"
                    : method.Contains("tienmat") || method.Contains("tiềnmặt")
                        ? "tienMat"
                        : null;
            var invoiceTotal = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            var outstanding = invoiceTotal - invoice.DanhSachThanhToan.Sum(t => t.SoTien);
            if (paymentType == null || req.Amount <= 0 || req.Amount > outstanding)
            {
                return false;
            }

            _context.ThanhToans.Add(new ThanhToan
            {
                MaThanhToan = $"TT-{Guid.NewGuid().ToString("N")[..8]}",
                MaHoaDon = invoice.MaHoaDon,
                SoTien = req.Amount,
                NgayThanhToan = DateTime.Now,
                PhuongThuc = paymentType,
                GhiChu = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                MaNhanVienThu = staffId
            });
            if (req.Amount == outstanding)
            {
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
            }
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> GetTotalRevenueAsync(string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear)) return 0;
            return await _context.ThanhToans
                .Where(t => t.HoaDon != null && t.HoaDon.HopDong != null && t.HoaDon.HopDong.KyHoc != null && t.HoaDon.HopDong.KyHoc.MaNamHoc == academicYear)
                .SumAsync(t => t.SoTien);
        }
    }
}
