using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Reports.DTOs;

namespace Dormitory.Web.Features.Reports.Services
{
    public class BaoCaoService : IBaoCaoService
    {
        private readonly ApplicationDbContext _context;

        public BaoCaoService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ReportSummaryDto> GetReportSummaryAsync(string? academicYear = null, string? scope = null)
        {
            var yearCode = string.IsNullOrWhiteSpace(academicYear) ? null : academicYear.Trim();
            var year = yearCode == null
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == yearCode);
            if (year == null) return new ReportSummaryDto();

            var buildings = await _context.ToaNhas
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                            .ThenInclude(h => h.KyHoc)
                .AsSplitQuery()
                .ToListAsync();

            var invoices = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.KyHoc)
                .ToListAsync();
            if (yearCode != null)
            {
                invoices = invoices
                    .Where(invoice => invoice.HopDong?.KyHoc?.MaNamHoc == yearCode)
                    .ToList();
            }
            var revenueByBuilding = invoices
                .Where(h => h.HopDong?.Giuong?.Phong != null)
                .GroupBy(h => h.HopDong!.Giuong!.Phong!.MaToaNha)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(h => h.DanhSachThanhToan.Sum(payment => payment.SoTien)));
            var currentAcademicYear = await _context.NamHocs
                .Where(n => n.NgayBatDau <= DateTime.Today && n.NgayKetThuc >= DateTime.Today)
                .OrderByDescending(n => n.NgayBatDau)
                .Select(n => new { n.MaNamHoc, n.NgayBatDau, n.NgayKetThuc })
                .FirstOrDefaultAsync();

            var buildingOps = new List<BuildingOperationDto>();

            int totalRooms = 0;
            int totalBeds = 0;
            int totalOccupied = 0;

            foreach (var b in buildings)
            {
                int rCount = b.DanhSachPhong.Count;
                int bCount = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count);
                int occCount = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count(g => g.DanhSachHopDong.Any(hd =>
                    hd.KyHoc?.MaNamHoc == yearCode &&
                    hd.NgayBatDau <= year.NgayKetThuc && (hd.NgayTraPhongThucTe ?? hd.NgayKetThuc) >= year.NgayBatDau)));

                int vacant = Math.Max(0, bCount - occCount);
                double rate = bCount > 0 ? Math.Round((double)occCount / bCount * 100, 1) : 0;
                decimal revenue = revenueByBuilding.GetValueOrDefault(b.MaToaNha);

                totalRooms += rCount;
                totalBeds += bCount;
                totalOccupied += occCount;

                buildingOps.Add(new BuildingOperationDto
                {
                    Name = $"Tòa {b.MaToaNha} ({b.TenToaNha})",
                    Rooms = rCount,
                    Beds = bCount,
                    Occupied = occCount,
                    Vacant = vacant,
                    Rate = rate,
                    Revenue = $"{revenue:N0} đ",
                    Status = rate >= 95 ? "Gần đầy" : (rate >= 70 ? "Đang hoạt động" : "Còn nhiều chỗ"),
                    StatusColor = rate >= 95 ? "warning" : (rate >= 70 ? "stable" : "info")
                });
            }

            int vacantBeds = Math.Max(0, totalBeds - totalOccupied);
            double totalRate = totalBeds > 0 ? Math.Round((double)totalOccupied / totalBeds * 100, 1) : 0.0;
            decimal totalRevenue = invoices.Sum(invoice => invoice.DanhSachThanhToan.Sum(payment => payment.SoTien));
            var yearLabel = year != null
                ? $"{year.NgayBatDau:yyyy}–{year.NgayKetThuc:yyyy} ({year.MaNamHoc})"
                : yearCode ?? (currentAcademicYear == null
                    ? string.Empty
                    : $"{currentAcademicYear.NgayBatDau:yyyy}–{currentAcademicYear.NgayKetThuc:yyyy} ({currentAcademicYear.MaNamHoc})");

            return new ReportSummaryDto
            {
                AcademicYear = yearLabel,
                TotalRooms = totalRooms,
                TotalBeds = totalBeds,
                OccupiedBeds = totalOccupied,
                VacantBeds = vacantBeds,
                OccupancyRate = totalRate,
                TotalRevenue = totalRevenue,
                BuildingOperations = buildingOps
            };
        }
    }
}
