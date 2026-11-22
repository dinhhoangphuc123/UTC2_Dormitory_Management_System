namespace Dormitory.Web.Features.Registrations.DTOs
{
    public class ApplicationListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string ApplicationCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string Major { get; set; } = string.Empty;
        public string Cohort { get; set; } = string.Empty;
        public string Gender { get; set; } = "Nam";
        public string AvatarUrl { get; set; } = string.Empty;
        public string PriorityCategory { get; set; } = string.Empty;
        public string RoomPreference { get; set; } = string.Empty;
        public double? ScoreDX { get; set; }
        public string EntranceScore { get; set; } = string.Empty;
        public string Hometown { get; set; } = string.Empty;
        public string ProofDocument { get; set; } = string.Empty;
        public string SubmittedAt { get; set; } = string.Empty;
        public string Status { get; set; } = "Chờ duyệt"; // Chờ duyệt, Đã duyệt, Bị từ chối
        public string ClassName { get; set; } = string.Empty;
        public int? IntakeYear { get; set; }
        public string DateOfBirth { get; set; } = string.Empty;
        public string Cccd { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string RoundCode { get; set; } = string.Empty;
        public string RoundName { get; set; } = string.Empty;
        public string BuildingName { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string RoomTypeName { get; set; } = string.Empty;
        public decimal? MonthlyFee { get; set; }
        public string? RejectionReason { get; set; }
        public string? Note { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovedAt { get; set; }
    /// <summary>Sinh viên đã từng có hợp đồng lưu trú tại KTX (đã từng ở KTX).</summary>
    public bool HasStayedBefore { get; set; }

    /// <summary>Trạng thái thu phí: daNhanThanhToan, choXacNhan, chuaThanhToan.</summary>
    public string PaymentStatus { get; set; } = "chuaThanhToan";

    /// <summary>Hóa đơn gắn với hợp đồng của đơn đăng ký (dùng để xem minh chứng).</summary>
    public string? InvoiceId { get; set; }
    public string? ProofSubmittedAt { get; set; }
    public string? ProofRejectionReason { get; set; }
    public string? ProofRejectedAt { get; set; }
    }

    public class RejectApplicationDto
    {
        public string ApplicationId { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}
