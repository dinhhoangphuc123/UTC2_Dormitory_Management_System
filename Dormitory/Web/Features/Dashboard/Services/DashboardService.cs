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

        public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
        {
            int totalBeds = await _context.Giuongs.CountAsync();
            int occupiedBeds = await _context.Giuongs.CountAsync(g => g.DanhSachHopDong.Any(h => h.TrangThai == "hieuLuc"));
            int totalStudents = await _context.HopDongs
                .Where(h => h.TrangThai == "hieuLuc")
                .Select(h => h.MaSinhVien)
                .Distinct()
                .CountAsync();
            int pendingApps = await _context.DonDangKys.CountAsync(d => d.TrangThai == "choDuyet");
            int repairCount = await _context.YeuCauSuaChuas.CountAsync(y => y.TrangThai == "moiGui" || y.TrangThai == "dangXuLy");

            decimal totalFeeRevenue = await _context.ThanhToans.SumAsync(t => (decimal?)t.SoTien) ?? 0;
            decimal totalInvoiceAmount = await _context.ChiTietHoaDons.SumAsync(line => (decimal?)(line.ThanhTien ?? line.SoLuong * line.DonGia)) ?? 0;
            decimal debtAmount = Math.Max(0, totalInvoiceAmount - totalFeeRevenue);
            double collectedPct = totalInvoiceAmount > 0 ? (double)Math.Round(totalFeeRevenue / totalInvoiceAmount * 100, 1) : 0.0;
            double occupancyPct = totalBeds > 0 ? (double)Math.Round((double)occupiedBeds / totalBeds * 100, 1) : 0;

            // Load real buildings / zone occupancies
            var buildings = await _context.ToaNhas
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                .AsSplitQuery()
                .ToListAsync();

            var zoneOccupancies = buildings.Select(b =>
            {
                int bBeds = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count);
                int bOcc = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count(g => g.DanhSachHopDong.Any(hd => hd.TrangThai == "hieuLuc")));
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
                .Where(d => d.TrangThai == "choDuyet")
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
