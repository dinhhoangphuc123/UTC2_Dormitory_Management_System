namespace Dormitory.Web.Features.Violations.DTOs
{
    public class CreateViolationDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string ViolationTypeId { get; set; } = string.Empty;
        public string PenaltyType { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
