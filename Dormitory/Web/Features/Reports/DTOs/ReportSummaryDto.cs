namespace Dormitory.Web.Features.Reports.DTOs
{
    public class ReportSummaryDto
    {
        public string Semester { get; set; } = "Năm học 2026-2027 · HK1";
        public int TotalRooms { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int VacantBeds { get; set; }
        public double OccupancyRate { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<BuildingOperationDto> BuildingOperations { get; set; } = new();
    }
}
