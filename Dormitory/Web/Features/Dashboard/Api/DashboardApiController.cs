using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Dashboard.DTOs;
using Dormitory.Web.Features.Dashboard.Services;

namespace Dormitory.Web.Features.Dashboard.Api
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardApiController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardApiController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var summary = await _dashboardService.GetDashboardSummaryAsync();
            return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary));
        }

        [HttpPost("tasks/{taskId}/resolve")]
        public async Task<IActionResult> ResolveTask(string taskId)
        {
            bool success = await _dashboardService.ResolveTaskAsync(taskId);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã xử lý đầu việc thành công!"));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy tác vụ tương ứng."));
        }
    }
}

