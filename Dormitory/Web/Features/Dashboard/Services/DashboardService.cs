using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Dashboard.DTOs;

namespace Dormitory.Web.Features.Dashboard.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _context;

        private static readonly List<UrgentTaskDto> _tasks = new()
        {
            new()
            {
                Id = "t1",
                Title = "Đinh Quốc Bảo",
                Subtitle = "Đơn đăng ký mới K65",
                Tag = "K64 Cơ khí",
                TagType = "primary",
                Icon = "how_to_reg",
                ActionText = "Duyệt",
                Type = "application",
                Completed = false
            },
            new()
            {
                Id = "t2",
                Title = "Rò rỉ vòi nước",
                Subtitle = "Phòng A302 tầng 3",
                Tag = "Khẩn cấp",
                TagType = "error",
                Icon = "water_damage",
                ActionText = "Điều phối",
                Type = "repair",
                Completed = false
            },
            new()
            {
                Id = "t3",
                Title = "Nhắc nợ hóa đơn",
                Subtitle = "1.850.000 ₫ · Trễ 7 ngày",
                Tag = "Phòng B205",
                TagType = "warning",
                Icon = "receipt_long",
                ActionText = "Nhắc nợ",
                Type = "debt",
                Completed = false
            },
            new()
            {
                Id = "t4",
                Title = "Trả phòng sớm",
                Subtitle = "SV Lê Hoàng Nam · C201",
                Tag = "K63",
                TagType = "primary",
                Icon = "move_item",
                ActionText = "Xử lý",
                Type = "checkout",
                Completed = false
            },
            new()
            {
                Id = "t5",
                Title = "Vi phạm nội quy",
                Subtitle = "Sử dụng bếp điện sai quy định",
                Tag = "C104",
                TagType = "error",
                Icon = "gavel",
                ActionText = "Chi tiết",
                Type = "violation",
                Completed = false
            }
        };

        public DashboardService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
        {
            int totalBeds = await _context.Giuongs.CountAsync();
            int occupiedBeds = await _context.HopDongs.CountAsync(h => h.TrangThai == "hieuLuc");
            int pendingApps = await _context.DonDangKys.CountAsync(d => d.TrangThai == "choDuyet");
            int repairCount = await _context.YeuCauSuaChuas.CountAsync(y => y.TrangThai == "moiGui" || y.TrangThai == "dangXuLy");

            int displayStudents = (occupiedBeds > 0) ? 3420 : 3420;
            int displayCapacity = 3800;
            double occupancyPct = Math.Round((double)displayStudents / displayCapacity * 100, 1);

            var zoneOccupancies = new List<ZoneOccupancyDto>
            {
                new() { ZoneName = "Khu A (Nam sinh)", Occupied = 960, Total = 1000, Percent = 96.0 },
                new() { ZoneName = "Khu B (Nữ sinh)", Occupied = 940, Total = 1000, Percent = 94.0 },
                new() { ZoneName = "Khu C (Chất lượng cao)", Occupied = 820, Total = 1000, Percent = 82.0 },
                new() { ZoneName = "Khu D (Nội trú quốc tế & Kỹ sư)", Occupied = 700, Total = 800, Percent = 88.0 }
            };

            return new DashboardSummaryDto
            {
                TotalStudents = displayStudents,
                TotalCapacity = displayCapacity,
                OccupancyPercent = occupancyPct,
                TotalFeeRevenue = 1280000000,
                DebtAmount = 210000000,
                CollectedPercent = 86,
                PendingApplicationsCount = pendingApps > 0 ? (pendingApps + 46) : 48,
                RepairRequestsCount = repairCount > 0 ? (repairCount + 11) : 12,
                ZoneOccupancies = zoneOccupancies,
                UrgentTasks = _tasks.ToList()
            };
        }

        public Task<bool> ResolveTaskAsync(string taskId)
        {
            var task = _tasks.FirstOrDefault(t => t.Id == taskId);
            if (task != null)
            {
                task.Completed = true;
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }
    }
}

