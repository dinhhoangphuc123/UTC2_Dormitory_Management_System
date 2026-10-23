using Dormitory.Web.Features.Dashboard.DTOs;

namespace Dormitory.Web.Features.Dashboard.Services
{
    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetDashboardSummaryAsync();
        Task<bool> ResolveTaskAsync(string taskId);
    }
}

