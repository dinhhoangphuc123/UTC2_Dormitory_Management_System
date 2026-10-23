namespace Dormitory.Web.Features.Academic.DTOs
{
    public class CreateClassDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Faculty { get; set; } = string.Empty;
        public string Cohort { get; set; } = string.Empty;
    }
}
