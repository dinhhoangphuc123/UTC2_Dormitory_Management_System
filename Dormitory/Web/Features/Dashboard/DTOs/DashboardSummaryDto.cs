namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class DashboardSummaryDto
    {
        public int TotalStudents { get; set; }
        public int TotalCapacity { get; set; }
        public double OccupancyPercent { get; set; }
        public decimal TotalFeeRevenue { get; set; }
        public decimal DebtAmount { get; set; }
        public int CollectedPercent { get; set; }
        public int PendingApplicationsCount { get; set; }
        public int TotalApplicationsCount { get; set; }
        public int ApprovedApplicationsCount { get; set; }
        public double ApplicationsApprovalRate { get; set; }
        public int RepairRequestsCount { get; set; }
        public double RevenueGrowthPercent { get; set; }

        public List<ZoneOccupancyDto> ZoneOccupancies { get; set; } = new();
        public List<UrgentTaskDto> UrgentTasks { get; set; } = new();
        public List<CohortGenderStatDto> CohortGenderStats { get; set; } = new();
        public List<MonthlyRevenueStatDto> MonthlyRevenueStats { get; set; } = new();
        public List<RepairCategoryStatDto> RepairCategoryStats { get; set; } = new();

        // Thống kê phòng thực tế: số phòng đã thuê và số phòng theo loại dịch vụ.
        public int OccupiedRooms { get; set; }
        public int TotalRooms { get; set; }
        public double RoomOccupancyPercent { get; set; }
        public List<RoomTypeStatDto> RoomTypeStats { get; set; } = new();

        public decimal CashFlowTotal { get; set; }
        public decimal CashFlowChange { get; set; }
        public string CashFlowChangeLabel { get; set; } = "Last month";
        public List<CashFlowPointDto> CashFlowData { get; set; } = new();
        public List<decimal> CashFlowCompare { get; set; } = new();
        public List<decimal> CashFlowTicks { get; set; } = new();
    }
}
