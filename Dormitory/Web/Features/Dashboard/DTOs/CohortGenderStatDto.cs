namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class CohortGenderStatDto
    {
        public string CohortName { get; set; } = string.Empty;
        public int Year { get; set; }
        public int MaleCount { get; set; }
        public int FemaleCount { get; set; }
        public int TotalCount => MaleCount + FemaleCount;
        public double MalePercent => TotalCount > 0 ? Math.Round((double)MaleCount / TotalCount * 100, 1) : 0;
        public double FemalePercent => TotalCount > 0 ? Math.Round((double)FemaleCount / TotalCount * 100, 1) : 0;
    }
}
