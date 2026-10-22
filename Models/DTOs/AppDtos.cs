namespace Quan_ly_Ky_tuc_xa.Models.DTOs
{
    // Auth DTOs
    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; } = true;
    }

    public class UserProfileDto
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Quản lý, Kế toán, Sinh viên, Quản trị viên
        public string Avatar { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
    }

    // Dashboard DTOs
    public class DashboardSummaryDto
    {
        public int TotalStudents { get; set; }
        public int TotalCapacity { get; set; }
        public double OccupancyPercent { get; set; }
        public decimal TotalFeeRevenue { get; set; }
        public decimal DebtAmount { get; set; }
        public int CollectedPercent { get; set; }
        public int PendingApplicationsCount { get; set; }
        public int RepairRequestsCount { get; set; }

        public List<ZoneOccupancyDto> ZoneOccupancies { get; set; } = new();
        public List<UrgentTaskDto> UrgentTasks { get; set; } = new();
    }

    public class ZoneOccupancyDto
    {
        public string ZoneName { get; set; } = string.Empty;
        public int Occupied { get; set; }
        public int Total { get; set; }
        public double Percent { get; set; }
    }

    public class UrgentTaskDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Subtitle { get; set; } = string.Empty;
        public string Tag { get; set; } = string.Empty;
        public string TagType { get; set; } = "primary"; // primary, warning, error, neutral
        public string Icon { get; set; } = "info";
        public string ActionText { get; set; } = "Xử lý";
        public string Type { get; set; } = "application"; // application, repair, debt, checkout, violation
        public bool Completed { get; set; } = false;
    }

    // Student DTOs
    public class SinhVienListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Cccd { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Gender { get; set; } = "Nam";
        public string Cohort { get; set; } = string.Empty; // K64, K65
        public string Major { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Hometown { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = "Đủ"; // Đủ, Nợ, Chưa đóng
        public decimal? DebtAmount { get; set; }
        public string ResidenceStatus { get; set; } = "Đang ở"; // Đang ở, Tạm vắng, Đã trả phòng
        public string AdmissionDate { get; set; } = string.Empty;
        public string? BirthDate { get; set; }
        public string? PriorityCategory { get; set; }
    }

    // Contract DTOs
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

    public class CreateContractRequestDto
    {
        public string StudentName { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string RoomNumber { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public decimal MonthlyFee { get; set; } = 500000;
        public decimal DepositAmount { get; set; } = 500000;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
    }

    // Application DTOs
    public class ApplicationListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string ApplicationCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string Major { get; set; } = string.Empty;
        public string Cohort { get; set; } = "K65";
        public string Gender { get; set; } = "Nam";
        public string AvatarUrl { get; set; } = string.Empty;
        public string PriorityCategory { get; set; } = string.Empty;
        public string RoomPreference { get; set; } = string.Empty;
        public double ScoreDX { get; set; } = 9.0;
        public string EntranceScore { get; set; } = string.Empty;
        public string Hometown { get; set; } = string.Empty;
        public string ProofDocument { get; set; } = string.Empty;
        public string SubmittedAt { get; set; } = string.Empty;
        public string Status { get; set; } = "Chờ duyệt"; // Chờ duyệt, Đã duyệt, Bị từ chối
    }

    // Room and Bed DTOs
    public class RoomListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public string BuildingName { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public int Capacity { get; set; } = 8;
        public int Occupied { get; set; }
        public string Gender { get; set; } = "Nam";
        public string RoomType { get; set; } = "Tiêu chuẩn";
        public decimal PricePerMonth { get; set; } = 500000;
        public string Status { get; set; } = "Còn chỗ"; // Đầy, Còn chỗ, Bảo trì
        public List<BedItemDto> Beds { get; set; } = new();
    }

    public class BedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? Mssv { get; set; }
        public string Status { get; set; } = "Giường trống"; // Đang ở, Giường trống, Bảo trì
    }
}

