using Dormitory.Web.Features.Reports.DTOs;

namespace Dormitory.Web.Features.Reports.Services
{
    public interface IBaoCaoService
    {
        Task<ReportSummaryDto> GetReportSummaryAsync(string? academicYear = null, string? scope = null);
    }
}

