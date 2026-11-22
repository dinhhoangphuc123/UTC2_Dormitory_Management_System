using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Entities;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Payments.Services
{
    public class ThanhToanService : IThanhToanService
    {
        private readonly ApplicationDbContext _context;

        public ThanhToanService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> ProcessPaymentAsync(ConfirmPaymentDto req, string? academicYear = null, string? staffId = null,
            IFormFile? proofFile = null, string? appDataPath = null)
        {
            // Chứng từ đính kèm được lưu tệp trước, chỉ gắn tên tệp vào phiếu thu khi giao dịch DB thành công.
            string? proofFileName = null;
            if (proofFile != null && proofFile.Length > 0 && !string.IsNullOrWhiteSpace(appDataPath))
            {
                var (fileName, error) = await PaymentProofStorage.SaveAsync(proofFile, appDataPath);
                if (fileName == null) return false;
                proofFileName = fileName;
            }

            // Mọi thay đổi (phiếu thu, trạng thái hóa đơn, hiệu lực hợp đồng, thông báo)
            // phải ghi cùng hoặc rollback cùng để không bị lệch tiền/đơn.
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
                        .FirstOrDefaultAsync(h => h.MaHoaDon == req.InvoiceId && (academicYear == null || (h.HopDong != null && h.HopDong.KyHoc != null && h.HopDong.KyHoc.MaNamHoc == academicYear)));
                    if (invoice == null || invoice.TrangThai == "daThanhToan" || invoice.TrangThai == "daHuy" || invoice.TrangThai == "nhap")
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

                    var paymentType = Invoices.Services.PaymentRules.NormalizePaymentMethod(req.PaymentMethod);
                    var invoiceTotal = Invoices.Services.PaymentRules.CalculateInvoiceTotal(
                        invoice.DanhSachChiTietHoaDon.Select(d => (d.ThanhTien, d.SoLuong, d.DonGia)));
                    var outstanding = Invoices.Services.PaymentRules.CalculateOutstanding(
                        invoiceTotal, invoice.DanhSachThanhToan.Sum(t => t.SoTien));
                    if (paymentType == null || req.Amount <= 0 || req.Amount > outstanding)
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    string? validStaffId = null;
                    if (!string.IsNullOrWhiteSpace(staffId))
                    {
                        var trimmedStaff = staffId.Trim();
                        if (await _context.NhanViens.AnyAsync(n => n.MaNhanVien == trimmedStaff))
                        {
                            validStaffId = trimmedStaff;
                        }
                    }

                    var thanhToan = new ThanhToan
                    {
                        MaThanhToan = Shared.Helpers.IdGenerator.Next("TT"),
                        MaHoaDon = invoice.MaHoaDon,
                        SoTien = req.Amount,
                        NgayThanhToan = DateTime.Now,
                        PhuongThuc = paymentType,
                        GhiChu = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                        MaNhanVienThu = validStaffId,
                        AnhMinhChung = proofFileName
                    };
                    _context.ThanhToans.Add(thanhToan);

                    bool isContractActivation = false;

                    if (req.Amount == outstanding)
                    {
                        invoice.TrangThai = "daThanhToan";

                        if (invoice.HopDong != null && invoice.HopDong.TrangThai == "choThanhToan")
                        {
                            isContractActivation = true;
                            invoice.HopDong.TrangThai = "hieuLuc";
                            if (!string.IsNullOrEmpty(validStaffId))
                            {
                                invoice.HopDong.MaNhanVienLap = validStaffId;
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

                    if (!isContractActivation && req.Amount == outstanding && invoice.HopDong != null)
                    {
                        // Hóa đơn sinh hoạt phí hàng tháng khi tất toán cũng phải có biên nhận điện tử.
                        _context.ThongBaos.Add(new Features.Students.Entities.ThongBao
                        {
                            MaSinhVien = invoice.HopDong.MaSinhVien,
                            TieuDe = $"Hóa đơn {invoice.MaHoaDon} đã được thanh toán",
                            NoiDung = $"Ký túc xá đã nhận đủ {req.Amount:n0} đ cho hóa đơn tháng {invoice.Thang:D2}/{invoice.Nam}. Cảm ơn bạn đã thanh toán đúng hạn.",
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

        public async Task<decimal> GetTotalRevenueAsync(string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear)) return 0;
            return await _context.ThanhToans
                .AsNoTracking()
                .Where(t => t.HoaDon != null && t.HoaDon.HopDong != null && t.HoaDon.HopDong.KyHoc != null && t.HoaDon.HopDong.KyHoc.MaNamHoc == academicYear)
                .SumAsync(t => t.SoTien);
        }
    }
}
