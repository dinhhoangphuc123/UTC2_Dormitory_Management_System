using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;

namespace Dormitory.Web.Features.Reports.Api
{
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
            [FromQuery] string? semester,
            [FromQuery] string? scope)
        {
            var summary = await _baoCaoService.GetReportSummaryAsync(semester, scope);
            return Ok(ApiResponse<ReportSummaryDto>.Ok(summary));
        }
    }
}

