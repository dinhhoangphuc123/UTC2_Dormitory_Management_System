using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.StudentOnlyPolicy)]
    [ApiController]
    [Route("api/me")]
    public class StudentPortalApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentPortalApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            var dashboard = await _portalService.GetDashboardAsync(studentId);
            if (dashboard == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin sinh viên."));
            }

            return Ok(ApiResponse<StudentDashboardDto>.Ok(dashboard));
        }

        [HttpGet("support-info")]
        public IActionResult GetSupportInfo()
        {
            var info = _portalService.GetSupportInfo();
            return Ok(ApiResponse<StudentSupportInfoDto>.Ok(info));
        }
    }
}
