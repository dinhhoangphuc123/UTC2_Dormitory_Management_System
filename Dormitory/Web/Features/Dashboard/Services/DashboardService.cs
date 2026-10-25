using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Dashboard.DTOs;

namespace Dormitory.Web.Features.Dashboard.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _context;

        public DashboardService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? academicYear = null)
        {
            var yearCode = string.IsNullOrWhiteSpace(academicYear) ? null : academicYear.Trim();
            var year = yearCode == null
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == yearCode);
            if (year == null) return new DashboardSummaryDto();

            int totalBeds = await _context.Giuongs.CountAsync();
            int occupiedBeds = await _context.Giuongs.CountAsync(g => g.DanhSachHopDong.Any(h =>
                h.KyHoc != null && h.KyHoc.MaNamHoc == yearCode &&
                h.NgayBatDau <= year.NgayKetThuc && (h.NgayTraPhongThucTe ?? h.NgayKetThuc) >= year.NgayBatDau));
            int totalStudents = await _context.HopDongs
                .Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == yearCode &&
                    h.NgayBatDau <= year.NgayKetThuc && (h.NgayTraPhongThucTe ?? h.NgayKetThuc) >= year.NgayBatDau)
                .Select(h => h.MaSinhVien)
                .Distinct()
                .CountAsync();
            int pendingApps = await _context.DonDangKys.CountAsync(d =>
                d.TrangThai == "choDuyet" &&
                d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == yearCode);

            var repairQuery = _context.YeuCauSuaChuas
                .Where(y => y.TrangThai == "moiGui" || y.TrangThai == "dangXuLy");
            var endExclusive = year.NgayKetThuc.Date.AddDays(1);
            repairQuery = repairQuery.Where(y => y.NgayGui >= year.NgayBatDau && y.NgayGui < endExclusive);
            int repairCount = await repairQuery.CountAsync();

            decimal totalFeeRevenue = await _context.ThanhToans
                .Where(t => t.HoaDon != null && t.HoaDon.HopDong != null &&
                    t.HoaDon.HopDong.KyHoc != null && t.HoaDon.HopDong.KyHoc.MaNamHoc == yearCode)
                .SumAsync(t => (decimal?)t.SoTien) ?? 0;
            decimal totalInvoiceAmount = await _context.ChiTietHoaDons
                .Where(line => line.HoaDon != null && line.HoaDon.HopDong != null &&
                    line.HoaDon.HopDong.KyHoc != null && line.HoaDon.HopDong.KyHoc.MaNamHoc == yearCode)
                .SumAsync(line => (decimal?)(line.ThanhTien ?? line.SoLuong * line.DonGia)) ?? 0;
            decimal debtAmount = Math.Max(0, totalInvoiceAmount - totalFeeRevenue);
            double collectedPct = totalInvoiceAmount > 0 ? (double)Math.Round(totalFeeRevenue / totalInvoiceAmount * 100, 1) : 0.0;
            double occupancyPct = totalBeds > 0 ? (double)Math.Round((double)occupiedBeds / totalBeds * 100, 1) : 0;

            // Load real buildings / zone occupancies
            var buildings = await _context.ToaNhas
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                            .ThenInclude(h => h.KyHoc)
                .AsSplitQuery()
                .ToListAsync();

            var zoneOccupancies = buildings.Select(b =>
            {
                int bBeds = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count);
                int bOcc = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count(g => g.DanhSachHopDong.Any(hd =>
                    hd.KyHoc?.MaNamHoc == yearCode &&
                    hd.NgayBatDau <= year.NgayKetThuc && (hd.NgayTraPhongThucTe ?? hd.NgayKetThuc) >= year.NgayBatDau)));
                double pct = bBeds > 0 ? Math.Round((double)bOcc / bBeds * 100, 1) : 0;
                return new ZoneOccupancyDto
                {
                    ZoneName = $"Tòa {b.MaToaNha} ({b.TenToaNha})",
                    Occupied = bOcc,
                    Total = bBeds,
                    Percent = pct
                };
            }).ToList();

            // Load real urgent tasks from database
            var urgentTasks = new List<UrgentTaskDto>();

            var pendingAppList = await _context.DonDangKys
                .Include(d => d.SinhVien)
                .Where(d => d.TrangThai == "choDuyet" &&
                    (yearCode == null || (d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == yearCode)))
                .OrderByDescending(d => d.NgayDangKy)
                .ThenBy(d => d.MaDonDangKy)
                .Take(5)
                .ToListAsync();

            foreach (var app in pendingAppList)
            {
                urgentTasks.Add(new UrgentTaskDto
                {
                    Id = $"app_{app.MaDonDangKy}",
                    Title = app.SinhVien?.HoTen ?? app.MaDonDangKy,
                    Subtitle = $"Đơn đăng ký mới ({app.MaDonDangKy})",
                    Tag = "Chờ duyệt",
                    TagType = "primary",
                    Icon = "how_to_reg",
                    ActionText = "Duyệt",
                    Type = "application",
                    Completed = false
                });
            }

            var openTickets = await _context.YeuCauSuaChuas
                .Include(y => y.Phong)
                .Where(y => y.TrangThai == "moiGui" || y.TrangThai == "dangXuLy")
                .Where(y => y.NgayGui >= year.NgayBatDau && y.NgayGui < endExclusive)
                .OrderByDescending(y => y.NgayGui)
                .ThenBy(y => y.MaYeuCau)
                .Take(5)
                .ToListAsync();

            foreach (var ticket in openTickets)
            {
                urgentTasks.Add(new UrgentTaskDto
                {
                    Id = $"repair_{ticket.MaYeuCau}",
                    Title = ticket.MoTa.Length > 40 ? ticket.MoTa[..40] + "..." : ticket.MoTa,
                    Subtitle = $"Phòng {ticket.MaPhong}",
                    Tag = "Cần xử lý",
                    TagType = "error",
                    Icon = "build",
                    ActionText = "Điều phối",
                    Type = "repair",
                    Completed = false
                });
            }

            return new DashboardSummaryDto
            {
                TotalStudents = totalStudents,
                TotalCapacity = totalBeds,
                OccupancyPercent = occupancyPct,
                TotalFeeRevenue = totalFeeRevenue,
                DebtAmount = debtAmount,
                CollectedPercent = (int)collectedPct,
                PendingApplicationsCount = pendingApps,
                RepairRequestsCount = repairCount,
                ZoneOccupancies = zoneOccupancies,
                UrgentTasks = urgentTasks
            };
        }

    }
}
