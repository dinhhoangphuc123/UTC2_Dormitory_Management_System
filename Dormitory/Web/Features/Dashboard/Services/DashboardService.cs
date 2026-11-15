using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Dashboard.DTOs;
using Dormitory.Web.Features.Rooms.Entities;

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

            int totalBeds = await _context.Giuongs.CountAsync(g =>
                g.LaDangHoat &&
                g.Phong != null && g.Phong.TrangThai == "hoatDong" &&
                g.Phong.ToaNha != null && g.Phong.ToaNha.TrangThai == "hoatDong");
            int occupiedBeds = await _context.Giuongs.CountAsync(g =>
                g.LaDangHoat &&
                g.Phong != null && g.Phong.TrangThai == "hoatDong" &&
                g.Phong.ToaNha != null && g.Phong.ToaNha.TrangThai == "hoatDong" &&
                g.DanhSachHopDong.Any(h =>
                    h.TrangThai != "daHuy" &&
                    h.KyHoc != null && h.KyHoc.MaNamHoc == yearCode &&
                    h.NgayBatDau <= year.NgayKetThuc && (h.NgayTraPhongThucTe ?? h.NgayKetThuc) >= year.NgayBatDau));
            int totalStudents = await _context.HopDongs
                .Where(h => h.TrangThai != "daHuy" &&
                    h.KyHoc != null && h.KyHoc.MaNamHoc == yearCode &&
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
                    .ThenInclude(p => p.LoaiPhong)
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                            .ThenInclude(h => h.KyHoc)
                .AsSplitQuery()
                .ToListAsync();

            var zoneOccupancies = buildings
                .Where(b => b.TrangThai == "hoatDong")
                .Select(b =>
            {
                var activeRooms = b.DanhSachPhong.Where(p => p.TrangThai == "hoatDong").ToList();
                int bBeds = activeRooms.Sum(p => p.DanhSachGiuong.Count(g => g.LaDangHoat));
                int bOcc = activeRooms.Sum(p => p.DanhSachGiuong.Count(g =>
                    g.LaDangHoat &&
                    g.DanhSachHopDong.Any(hd =>
                        hd.TrangThai != "daHuy" &&
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

            // Thống kê phòng đang thuê và số phòng theo loại dịch vụ (dữ liệu thật).
            var activeRooms = buildings
                .Where(b => b.TrangThai == "hoatDong")
                .SelectMany(b => b.DanhSachPhong.Where(p => p.TrangThai == "hoatDong"))
                .ToList();

            bool RoomIsRented(Phong p) => p.DanhSachGiuong.Any(g =>
                g.LaDangHoat &&
                g.DanhSachHopDong.Any(hd =>
                    hd.TrangThai != "daHuy" &&
                    hd.KyHoc != null && hd.KyHoc.MaNamHoc == yearCode &&
                    hd.NgayBatDau <= year.NgayKetThuc && (hd.NgayTraPhongThucTe ?? hd.NgayKetThuc) >= year.NgayBatDau));

            int totalRooms = activeRooms.Count;
            int occupiedRooms = activeRooms.Count(RoomIsRented);
            var roomTypeStats = activeRooms
                .GroupBy(p => string.IsNullOrWhiteSpace(p.LoaiPhong?.TenLoaiPhong) ? "Chưa phân loại" : p.LoaiPhong!.TenLoaiPhong.Trim())
                .Select(g => new RoomTypeStatDto
                {
                    Name = g.Key,
                    RoomCount = g.Count(),
                    OccupiedCount = g.Count(RoomIsRented)
                })
                .OrderByDescending(r => r.RoomCount)
                .ToList();

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

            // 1. Thống kê sinh viên theo khóa và giới tính (Cohort & Gender)
            var studentList = await _context.HopDongs
                .Where(h => h.TrangThai != "daHuy" &&
                    h.KyHoc != null && h.KyHoc.MaNamHoc == yearCode &&
                    h.NgayBatDau <= year.NgayKetThuc && (h.NgayTraPhongThucTe ?? h.NgayKetThuc) >= year.NgayBatDau)
                .Include(h => h.SinhVien)
                    .ThenInclude(s => s!.LopHoc)
                .Select(h => h.SinhVien)
                .Where(s => s != null)
                .Distinct()
                .ToListAsync();

            var cohortGenderStats = studentList
                .GroupBy(s =>
                {
                    if (s!.NamNhapHoc > 1960) return s.NamNhapHoc;
                    if (s.LopHoc != null && s.LopHoc.NienKhoa > 1960) return s.LopHoc.NienKhoa;
                    return DateTime.Now.Year;
                })
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    int yearVal = g.Key;
                    string cohortName = yearVal >= 2000 ? $"K{yearVal - 1959}" : $"Khóa {yearVal}";
                    int maleCount = g.Count(s => (s!.GioiTinh ?? "").Trim().ToLower() == "nam");
                    int femaleCount = g.Count(s => (s!.GioiTinh ?? "").Trim().ToLower() != "nam");
                    return new CohortGenderStatDto
                    {
                        CohortName = cohortName,
                        Year = yearVal,
                        MaleCount = maleCount,
                        FemaleCount = femaleCount
                    };
                })
                .ToList();

            // 2. Doanh thu lũy kế theo tháng: năm nay so với cùng kỳ năm trước.
            // Dùng năm dương lịch để biểu đồ luôn so sánh được hai năm liền kề.
            int currentYear = DateTime.Today.Year;
            int previousYear = currentYear - 1;
            var trendStart = new DateTime(previousYear, 1, 1);
            var trendEnd = DateTime.Today.Date.AddDays(1);

            var allPayments = await _context.ThanhToans
                .Where(t => t.NgayThanhToan >= trendStart && t.NgayThanhToan < trendEnd)
                .Select(t => new { t.NgayThanhToan, t.SoTien })
                .ToListAsync();

            var monthlyRevenueStats = new List<MonthlyRevenueStatDto>();
            decimal cumulativeCurrentYear = 0;
            decimal cumulativePreviousYear = 0;
            int lastMonthOfYear = DateTime.Today.Month;

            for (int m = 1; m <= lastMonthOfYear; m++)
            {
                cumulativeCurrentYear += allPayments
                    .Where(p => p.NgayThanhToan.Year == currentYear && p.NgayThanhToan.Month == m)
                    .Sum(p => p.SoTien);
                cumulativePreviousYear += allPayments
                    .Where(p => p.NgayThanhToan.Year == previousYear && p.NgayThanhToan.Month == m)
                    .Sum(p => p.SoTien);

                monthlyRevenueStats.Add(new MonthlyRevenueStatDto
                {
                    MonthLabel = $"Tháng {m}",
                    Month = m,
                    Year = currentYear,
                    Revenue = cumulativeCurrentYear,
                    PreviousYearRevenue = cumulativePreviousYear,
                    ExpectedRevenue = 0
                });
            }

            double revenueGrowthPercent = 0;
            if (cumulativePreviousYear > 0)
            {
                revenueGrowthPercent = Math.Round((double)((cumulativeCurrentYear - cumulativePreviousYear) / cumulativePreviousYear) * 100, 1);
            }

            // 3. Thống kê đơn đăng ký
            int totalApplicationsCount = await _context.DonDangKys.CountAsync(d =>
                d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == yearCode);
            int approvedApplicationsCount = await _context.DonDangKys.CountAsync(d =>
                d.TrangThai == "daDuyet" &&
                d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == yearCode);
            double approvalRate = totalApplicationsCount > 0
                ? Math.Round((double)approvedApplicationsCount / totalApplicationsCount * 100, 1)
                : 0;

            // 4. Thống kê phân loại sự cố sửa chữa
            var allRepairs = await _context.YeuCauSuaChuas
                .Where(y => y.NgayGui >= year.NgayBatDau && y.NgayGui < endExclusive)
                .Select(y => new { y.LoaiSuCo, y.TrangThai })
                .ToListAsync();

            var repairCategories = new List<RepairCategoryStatDto>();
            if (allRepairs.Count > 0)
            {
                var grouped = allRepairs
                    .GroupBy(r => string.IsNullOrWhiteSpace(r.LoaiSuCo) ? "Cơ sở vật chất" : r.LoaiSuCo.Trim())
                    .Select(g => new RepairCategoryStatDto
                    {
                        CategoryName = g.Key switch
                        {
                            "dien" or "Điện" => "Hệ thống điện",
                            "nuoc" or "Nước" => "Cấp thoát nước",
                            "thietBi" or "Thiết bị" => "Thiết bị nội thất",
                            "khac" or "Khác" => "Hạng mục khác",
                            _ => g.Key
                        },
                        Count = g.Count(),
                        Percent = Math.Round((double)g.Count() / allRepairs.Count * 100, 1)
                    })
                    .OrderByDescending(c => c.Count)
                    .ToList();
                repairCategories.AddRange(grouped);
            }

            // 5. Chuẩn bị dữ liệu chi tiết cho biểu đồ dòng tiền
            decimal cfTotal = totalFeeRevenue;
            decimal cfChange = revenueGrowthPercent != 0
                ? Math.Round(cfTotal * (decimal)(revenueGrowthPercent / 100), 2)
                : 0m;

            var cashFlowPoints = new List<CashFlowPointDto>();
            if (allPayments.Count >= 5)
            {
                var groupedByDay = allPayments
                    .GroupBy(p => p.NgayThanhToan.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new CashFlowPointDto
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        Value = g.Sum(x => x.SoTien)
                    })
                    .ToList();
                cashFlowPoints.AddRange(groupedByDay);
            }

            // Trục tung sinh theo dữ liệu thực thay vì dùng mốc cố định.
            var cashFlowTicks = new List<decimal>();
            var maxCashFlow = cashFlowPoints.Count > 0 ? cashFlowPoints.Max(p => p.Value) : 0m;
            if (maxCashFlow > 0)
            {
                var step = Math.Max(1m, Math.Ceiling(maxCashFlow / 4m / 100000m) * 100000m);
                for (int i = 1; i <= 4; i++)
                {
                    cashFlowTicks.Add(step * i);
                }
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
                TotalApplicationsCount = totalApplicationsCount,
                ApprovedApplicationsCount = approvedApplicationsCount,
                ApplicationsApprovalRate = approvalRate,
                RepairRequestsCount = repairCount,
                RevenueGrowthPercent = revenueGrowthPercent,
                ZoneOccupancies = zoneOccupancies,
                UrgentTasks = urgentTasks,
                CohortGenderStats = cohortGenderStats,
                MonthlyRevenueStats = monthlyRevenueStats,
                RepairCategoryStats = repairCategories,
                OccupiedRooms = occupiedRooms,
                TotalRooms = totalRooms,
                RoomOccupancyPercent = totalRooms > 0 ? Math.Round((double)occupiedRooms / totalRooms * 100, 1) : 0,
                RoomTypeStats = roomTypeStats,
                CashFlowTotal = cfTotal,
                CashFlowChange = cfChange,
                CashFlowChangeLabel = "So với tháng trước",
                CashFlowData = cashFlowPoints,
                CashFlowTicks = cashFlowTicks
            };
        }

    }
}
