using Dormitory.Web.Features.Dashboard.DTOs;

namespace Dormitory.Web.Features.Dashboard.Services
{
    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? academicYear = null);
    }
}
