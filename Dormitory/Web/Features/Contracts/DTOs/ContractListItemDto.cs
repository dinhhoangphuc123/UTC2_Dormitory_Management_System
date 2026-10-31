namespace Dormitory.Web.Features.Contracts.DTOs
{
    public class ContractListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string ContractNumber { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string AvatarInitials { get; set; } = string.Empty;
        public string Gender { get; set; } = "Nam";
        public string RoomNumber { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public string? ActualCheckInDate { get; set; }
        public string? HoldDeadline { get; set; }
        public int RemainingDays { get; set; }
        public decimal MonthlyFee { get; set; }
        public decimal DepositAmount { get; set; }
        public string DepositStatus { get; set; } = "Đã nộp";
        public string Status { get; set; } = "Hiệu lực";
        public string StatusCode { get; set; } = "hieuLuc";
        public string? StatusNote { get; set; }
        public string? Note { get; set; }
    }
}
