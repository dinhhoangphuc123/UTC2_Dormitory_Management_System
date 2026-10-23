namespace Dormitory.Web.Features.Maintenance.DTOs
{
    public class MaintenanceTicketDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Category { get; set; } = "Điện dân dụng";
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Reporter { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Technician { get; set; }
        public string Priority { get; set; } = "Bình thường";
        public string Status { get; set; } = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED
        public string CreatedAt { get; set; } = string.Empty;
    }
}
