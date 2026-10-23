namespace Dormitory.Web.Features.Registrations.DTOs
{
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

    public class RejectApplicationDto
    {
        public string ApplicationId { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}

