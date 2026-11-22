using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.Registrations.Services
{
    public class ReservationExpiryService : IReservationExpiryService
    {
        private static readonly SemaphoreSlim _Gate = new(1, 1);

        private readonly ApplicationDbContext _context;
        private readonly ILogger<ReservationExpiryService> _logger;
        private readonly RegistrationOptions _options;

        public ReservationExpiryService(
            ApplicationDbContext context,
            ILogger<ReservationExpiryService> logger,
            IOptions<RegistrationOptions>? registrationOptions = null)
        {
            _context = context;
            _logger = logger;
            _options = registrationOptions?.Value ?? new RegistrationOptions();
        }

        public async Task<int> ProcessExpiredReservationsAsync(CancellationToken cancellationToken = default)
        {
            await _Gate.WaitAsync(cancellationToken);
            try
            {
                var now = DateTime.Now;
                var expiredContracts = await _context.HopDongs
                    .Where(h => h.TrangThai == "choThanhToan" && h.HanGiuCho.HasValue && h.HanGiuCho.Value < now)
                    .ToListAsync(cancellationToken);

                if (expiredContracts.Count == 0)
                {
                    return 0;
                }

                int count = 0;
                foreach (var contract in expiredContracts)
                {
                    await _context.Entry(contract).ReloadAsync(cancellationToken);
                    if (contract.TrangThai != "choThanhToan")
                    {
                        continue;
                    }

                    var relatedInvoices = await _context.HoaDons
                        .Where(hd => hd.MaHopDong == contract.MaHopDong && hd.TrangThai == "chuaThanhToan")
                        .ToListAsync(cancellationToken);

                    // Không hủy nếu sinh viên đã nộp minh chứng và đang chờ BQL đối soát.
                    if (relatedInvoices.Any(i => !string.IsNullOrEmpty(i.AnhMinhChung) && string.IsNullOrEmpty(i.LyDoTuChoiMinhChung)))
                    {
                        continue;
                    }

                    contract.TrangThai = "daHuy";
                    contract.GhiChu = $"Hết hạn giữ chỗ {_options.HoldHours} giờ";

                    foreach (var invoice in relatedInvoices)
                    {
                        invoice.TrangThai = "daHuy";
                    }

                    if (!string.IsNullOrEmpty(contract.MaDonDangKy))
                    {
                        var don = await _context.DonDangKys
                            .FirstOrDefaultAsync(d => d.MaDonDangKy == contract.MaDonDangKy, cancellationToken);
                        if (don != null)
                        {
                            don.TrangThai = "hetHan";
                        }
                    }

                    _context.ThongBaos.Add(new ThongBao
                    {
                        MaSinhVien = contract.MaSinhVien,
                        TieuDe = "Hết hạn giữ chỗ phòng KTX",
                        NoiDung = $"Hồ sơ giữ chỗ của bạn cho hợp đồng {contract.MaHopDong} đã hết hạn sau {_options.HoldHours} giờ (lúc {contract.HanGiuCho:dd/MM/yyyy HH:mm}) do quá hạn thanh toán. Chỗ ở đã được giải phóng.",
                        Loai = "nhacHan",
                        LienKet = "/student/dashboard",
                        DaDoc = false,
                        NgayTao = now
                    });

                    count++;
                }

                if (count > 0)
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation("Đã xử lý hủy {Count} hợp đồng hết hạn giữ chỗ.", count);
                }
                return count;
            }
            finally
            {
                _Gate.Release();
            }
        }

        public async Task<int> ProcessUpcomingExpiryWarningsAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.Now;
            var threshold = now.AddHours(3);

            var warningContracts = await _context.HopDongs
                .Where(h => h.TrangThai == "choThanhToan" && h.HanGiuCho.HasValue && h.HanGiuCho.Value > now && h.HanGiuCho.Value <= threshold)
                .ToListAsync(cancellationToken);

            if (warningContracts.Count == 0)
            {
                return 0;
            }

            int count = 0;
            foreach (var contract in warningContracts)
            {
                bool alreadySent = await _context.ThongBaos
                    .AnyAsync(t => t.MaSinhVien == contract.MaSinhVien 
                                && t.Loai == "nhacHan" 
                                && t.TieuDe == "Sắp hết hạn giữ chỗ" 
                                && t.NgayTao >= now.AddHours(-12), cancellationToken);

                if (alreadySent) continue;

                _context.ThongBaos.Add(new ThongBao
                {
                    MaSinhVien = contract.MaSinhVien,
                    TieuDe = "Sắp hết hạn giữ chỗ",
                    NoiDung = $"Hạn thanh toán giữ chỗ của bạn sắp hết vào lúc {contract.HanGiuCho:dd/MM/yyyy HH:mm}. Vui lòng thanh toán sớm để không bị hủy phòng.",
                    Loai = "nhacHan",
                    LienKet = "/student/invoice",
                    DaDoc = false,
                    NgayTao = now
                });

                count++;
            }

            if (count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Đã gửi {Count} thông báo nhắc sắp hết hạn giữ chỗ.", count);
            }

            return count;
        }
    }
}
