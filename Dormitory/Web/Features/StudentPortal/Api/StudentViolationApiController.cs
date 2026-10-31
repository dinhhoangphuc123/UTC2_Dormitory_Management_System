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
    public class StudentViolationApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentViolationApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet("violations")]
        public async Task<IActionResult> GetViolations()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            var violations = await _portalService.GetViolationsAsync(studentId);
            return Ok(ApiResponse<List<StudentViolationDto>>.Ok(violations));
        }
    }
}
