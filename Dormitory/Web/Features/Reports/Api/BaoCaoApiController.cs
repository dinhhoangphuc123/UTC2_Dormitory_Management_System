using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Reports.Api
{
    [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
    [ApiController]
    [Route("api/baocao")]
    public class BaoCaoApiController : ControllerBase
    {
        private readonly IBaoCaoService _baoCaoService;

        public BaoCaoApiController(IBaoCaoService baoCaoService)
        {
            _baoCaoService = baoCaoService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? academicYear,
            [FromQuery] string? scope)
        {
            var summary = await _baoCaoService.GetReportSummaryAsync(academicYear, scope);
            return Ok(ApiResponse<ReportSummaryDto>.Ok(summary));
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export(
            [FromQuery] string? academicYear,
            [FromQuery] string? scope)
        {
            var fileBytes = await _baoCaoService.ExportDashboardAndReportExcelAsync(academicYear, scope);
            var safeYear = string.IsNullOrWhiteSpace(academicYear) ? "KTX" : academicYear.Trim();
            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"BaoCaoTongQuanKTX_{safeYear}.xlsx");
        }
    }
}
