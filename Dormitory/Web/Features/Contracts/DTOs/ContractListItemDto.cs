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
        public int RemainingDays { get; set; }
        public decimal MonthlyFee { get; set; }
        public decimal DepositAmount { get; set; }
        public string DepositStatus { get; set; } = "Đã nộp"; // Đã nộp, Đã hoàn
        public string Status { get; set; } = "Hiệu lực"; // Hiệu lực, Sắp hết hạn, Chờ thanh lý, Đã thanh lý
        public string? StatusNote { get; set; }
        public string? Note { get; set; }
    }
}
