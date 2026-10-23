namespace Dormitory.Web.Features.Maintenance.DTOs
{
    public class AssignTicketDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string Technician { get; set; } = string.Empty;
        public string Deadline { get; set; } = string.Empty;
    }
}
