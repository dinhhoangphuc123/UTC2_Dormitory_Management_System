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

        public async Task<bool> ProcessPaymentAsync(ConfirmPaymentDto req, string? academicYear = null)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.DanhSachChiTietHoaDon)
                .FirstOrDefaultAsync(h => h.MaHoaDon == req.InvoiceId && h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear);
            if (invoice == null || invoice.TrangThai == "daThanhToan")
            {
                return false;
            }

            var method = req.PaymentMethod?.ToLowerInvariant() ?? string.Empty;
            var paymentType = method.Contains("vnpay") || method.Contains("ví điện tử")
                ? "viDienTu"
                : method.Contains("chuyển khoản") || method.Contains("chuyen khoan")
                    ? "chuyenKhoan"
                    : method.Contains("tiền mặt") || method.Contains("tien mat")
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
                GhiChu = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim()
            });
            if (req.Amount == outstanding)
            {
                invoice.TrangThai = "daThanhToan";
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
