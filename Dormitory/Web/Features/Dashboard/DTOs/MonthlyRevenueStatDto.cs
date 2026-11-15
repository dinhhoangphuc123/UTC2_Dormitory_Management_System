namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class MonthlyRevenueStatDto
    {
        public string MonthLabel { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        // Doanh thu lũy kế đến tháng này của năm hiện tại và cùng kỳ năm trước.
        public decimal Revenue { get; set; }
        public decimal PreviousYearRevenue { get; set; }
        public decimal ExpectedRevenue { get; set; }
    }
}
