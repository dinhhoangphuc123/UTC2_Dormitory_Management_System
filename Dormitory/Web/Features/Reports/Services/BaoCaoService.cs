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

        public async Task<ReportSummaryDto> GetReportSummaryAsync(string? semester = null, string? scope = null)
        {
            var buildings = await _context.ToaNhas
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                .AsSplitQuery()
                .ToListAsync();

            var invoices = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                .ToListAsync();
            var revenueByBuilding = invoices
                .Where(h => h.HopDong?.Giuong?.Phong != null)
                .GroupBy(h => h.HopDong!.Giuong!.Phong!.MaToaNha)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(h => h.DanhSachThanhToan.Sum(payment => payment.SoTien)));
            var currentSemester = await _context.KyHocs
                .Where(k => k.NgayBatDau <= DateTime.Today && k.NgayKetThuc >= DateTime.Today)
                .OrderByDescending(k => k.NgayBatDau)
                .Select(k => k.TenKyHoc)
                .FirstOrDefaultAsync();

            var buildingOps = new List<BuildingOperationDto>();

            int totalRooms = 0;
            int totalBeds = 0;
            int totalOccupied = 0;

            foreach (var b in buildings)
            {
                int rCount = b.DanhSachPhong.Count;
                int bCount = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count);
                int occCount = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count(g => g.DanhSachHopDong.Any(hd => hd.TrangThai == "hieuLuc")));

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
            decimal totalRevenue = await _context.ThanhToans.SumAsync(t => (decimal?)t.SoTien) ?? 0;

            return new ReportSummaryDto
            {
                Semester = string.IsNullOrWhiteSpace(semester) ? currentSemester ?? string.Empty : semester,
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
