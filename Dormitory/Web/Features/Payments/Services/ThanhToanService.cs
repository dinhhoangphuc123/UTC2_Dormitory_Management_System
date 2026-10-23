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

        public async Task<bool> ProcessPaymentAsync(ConfirmPaymentDto req)
        {
            var invoice = await _context.HoaDons.FirstOrDefaultAsync(h => h.MaHoaDon == req.InvoiceId);
            if (invoice != null)
            {
                invoice.TrangThai = "daThanhToan";
                var payment = new ThanhToan
                {
                    MaThanhToan = $"TT-{DateTime.Now.Ticks % 1000000}",
                    MaHoaDon = invoice.MaHoaDon,
                    SoTien = req.Amount > 0 ? req.Amount : 1480000,
                    NgayThanhToan = DateTime.Now,
                    PhuongThuc = req.PaymentMethod.Contains("VNPAY") ? "viDienTu" : (req.PaymentMethod.Contains("khoản") ? "chuyenKhoan" : "tienMat"),
                    GhiChu = req.Note ?? "Thanh toán qua cổng KTX"
                };
                _context.ThanhToans.Add(payment);
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<decimal> GetTotalRevenueAsync()
        {
            return await _context.ThanhToans.SumAsync(t => t.SoTien);
        }
    }
}

