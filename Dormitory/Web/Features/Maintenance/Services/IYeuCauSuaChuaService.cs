using Dormitory.Web.Features.Maintenance.DTOs;

namespace Dormitory.Web.Features.Maintenance.Services
{
    public interface IYeuCauSuaChuaService
    {
        Task<List<MaintenanceTicketDto>> GetAllTicketsAsync(string? building = null, string? category = null, string? priority = null, string? status = null, string? search = null);
        Task<MaintenanceTicketDto> CreateTicketAsync(CreateTicketDto req);
        Task<bool> AssignTicketAsync(AssignTicketDto req);
        Task<bool> CompleteTicketAsync(string ticketId);
    }
}

