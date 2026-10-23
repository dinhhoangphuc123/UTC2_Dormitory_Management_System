namespace Dormitory.Web.Features.Violations.DTOs
{
    public class ViolationRecordDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Violation { get; set; } = string.Empty;
        public string ViolationType { get; set; } = "cook"; // cook, noise, guest, gambling, electric, smoke
        public string Date { get; set; } = string.Empty;
        public string Penalty { get; set; } = "Khiển trách";
        public string PenaltyType { get; set; } = "reprimand"; // remind, reprimand, warning, expel
        public string Status { get; set; } = "Đã ghi nhận";
        public string Notes { get; set; } = string.Empty;
    }
}
