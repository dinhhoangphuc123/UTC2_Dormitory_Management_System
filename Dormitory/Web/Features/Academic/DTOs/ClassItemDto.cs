namespace Dormitory.Web.Features.Academic.DTOs
{
    public class ClassItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Faculty { get; set; } = string.Empty;
        public string FacultyKey { get; set; } = string.Empty; // cntt, ktvt, ck, ktxd, dt, ct
        public string Advisor { get; set; } = string.Empty;
        public string Cohort { get; set; } = string.Empty; // k62, k63, k64, k65
        public int Residents { get; set; }
        public int TotalStudents { get; set; }
        public double Rate { get; set; }
    }
}
