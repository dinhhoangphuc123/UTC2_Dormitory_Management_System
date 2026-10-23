namespace Dormitory.Web.Features.Students.DTOs
{
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
        public string PaymentStatus { get; set; } = "Chưa có hóa đơn";
        public decimal? DebtAmount { get; set; }
        public string ResidenceStatus { get; set; } = "Chưa nội trú";
        public string AdmissionDate { get; set; } = string.Empty;
        public string? BirthDate { get; set; }
        public string? PriorityCategory { get; set; }
    }

    public class TransferRoomDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string NewRoomNumber { get; set; } = string.Empty;
        public string NewBedNumber { get; set; } = string.Empty;
    }
}
