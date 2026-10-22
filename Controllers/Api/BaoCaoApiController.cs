using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
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

