namespace Dormitory.Web.Features.Violations.DTOs
{
    public class CreateViolationDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = "A01";
        public string Violation { get; set; } = string.Empty;
        public string ViolationType { get; set; } = "cook";
        public string Penalty { get; set; } = "Khiển trách";
        public string PenaltyType { get; set; } = "reprimand";
        public string Notes { get; set; } = string.Empty;
    }
}

