namespace Dormitory.Web.Features.Maintenance.DTOs
{
    public class AssignTicketDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string Technician { get; set; } = "Phạm Thành";
        public string Deadline { get; set; } = "Trong ngày hôm nay";
    }
}

