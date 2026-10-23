namespace Dormitory.Web.Features.Maintenance.DTOs
{
    public class CreateTicketDto
    {
        public string Building { get; set; } = "A2";
        public string Room { get; set; } = string.Empty;
        public string Category { get; set; } = "Điện dân dụng";
        public string Priority { get; set; } = "Bình thường";
        public string Reporter { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}

