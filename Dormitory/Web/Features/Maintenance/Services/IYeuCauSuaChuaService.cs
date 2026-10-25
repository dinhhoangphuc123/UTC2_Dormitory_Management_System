using Dormitory.Web.Features.Maintenance.DTOs;

namespace Dormitory.Web.Features.Maintenance.Services
{
    public interface IYeuCauSuaChuaService
    {
        Task<List<MaintenanceTicketDto>> GetAllTicketsAsync(string? building = null, string? category = null, string? priority = null, string? status = null, string? search = null, string? academicYear = null);
        Task<MaintenanceTicketDto?> CreateTicketAsync(CreateTicketDto req, string? academicYear = null);
        Task<bool> AssignTicketAsync(AssignTicketDto req, string? academicYear = null);
        Task<bool> CompleteTicketAsync(string ticketId, string? academicYear = null);
    }
}
