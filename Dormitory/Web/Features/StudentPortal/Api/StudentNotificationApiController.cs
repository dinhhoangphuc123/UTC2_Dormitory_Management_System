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
    [Route("api/me/notifications")]
    public class StudentNotificationApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentNotificationApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            var notifications = await _portalService.GetNotificationsAsync(studentId, unreadOnly);
            return Ok(ApiResponse<List<StudentNotificationDto>>.Ok(notifications));
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            var count = await _portalService.GetUnreadNotificationCountAsync(studentId);
            return Ok(ApiResponse<object>.Ok(new { count }));
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            var success = await _portalService.MarkNotificationAsReadAsync(studentId, id);
            if (!success)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông báo."));
            }

            return Ok(ApiResponse.Ok("Đã đánh dấu thông báo là đã đọc."));
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được sinh viên hiện tại."));
            }

            await _portalService.MarkAllNotificationsAsReadAsync(studentId);
            return Ok(ApiResponse.Ok("Đã đánh dấu tất cả thông báo là đã đọc."));
        }
    }
}
