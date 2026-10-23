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
        public int RepairRequestsCount { get; set; }

        public List<ZoneOccupancyDto> ZoneOccupancies { get; set; } = new();
        public List<UrgentTaskDto> UrgentTasks { get; set; } = new();
    }
}
