namespace Dormitory.Web.Features.Academic.DTOs
{
    public class CreateClassDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Faculty { get; set; } = "Khoa Công nghệ thông tin";
        public string FacultyKey { get; set; } = "cntt";
        public string Advisor { get; set; } = string.Empty;
        public string Cohort { get; set; } = "k65";
        public int TotalStudents { get; set; } = 50;
        public int Residents { get; set; } = 25;
    }
}

