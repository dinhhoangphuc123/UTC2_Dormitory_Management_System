using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Features.StudentPortal.Validators;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
    [ApiController]
    [Route("api/thongbao")]
    public class ThongBaoApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;

        public ThongBaoApiController(IStudentPortalService portalService)
        {
            _portalService = portalService;
        }

        [HttpPost]
        public async Task<IActionResult> Broadcast([FromBody] BroadcastNotificationDto dto)
        {
            var (isValid, errorMessage) = BroadcastNotificationValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Dữ liệu không hợp lệ."));
            }

            var count = await _portalService.BroadcastNotificationAsync(dto);
            return Ok(ApiResponse<object>.Ok(new { count }, $"Đã phát thông báo thành công đến {count} sinh viên."));
        }
    }
}
