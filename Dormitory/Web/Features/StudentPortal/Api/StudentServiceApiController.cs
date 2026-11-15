using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Middleware;
using Dormitory.Web.Shared.Models;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.StudentOnlyPolicy)]
    [SkipAcademicYearScope]
    [ApiController]
    [Route("api/me")]
    public class StudentServiceApiController : ControllerBase
    {
        private readonly IDichVuService _dichVuService;
        private readonly ICurrentUser? _currentUser;

        public StudentServiceApiController(IDichVuService dichVuService, ICurrentUser? currentUser = null)
        {
            _dichVuService = dichVuService;
            _currentUser = currentUser;
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServices()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var services = await _dichVuService.GetStudentServicesAsync(studentId);
            return Ok(ApiResponse<List<StudentServiceOptionDto>>.Ok(services));
        }

        public class RegisterServiceRequest
        {
            public int? SoLuong { get; set; }
            public string? NgayBatDau { get; set; }
        }

        [HttpPost("services/{serviceId}/register")]
        public async Task<IActionResult> Register(string serviceId, [FromBody] RegisterServiceRequest? req = null)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (success, errorMessage, registrationId) = await _dichVuService.RegisterServiceForStudentAsync(
                studentId, serviceId, req?.SoLuong, req?.NgayBatDau);
            if (!success)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể đăng ký dịch vụ."));

            return Ok(ApiResponse.Ok($"Đã gửi đơn đăng ký dịch vụ (mã đơn #{registrationId}). BQL sẽ duyệt trong 1-2 ngày làm việc."));
        }

        [HttpDelete("services/{registrationId:int}")]
        public async Task<IActionResult> Cancel(int registrationId)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (success, errorMessage) = await _dichVuService.CancelServiceForStudentAsync(studentId, registrationId);
            if (!success)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể hủy đăng ký dịch vụ."));

            return Ok(ApiResponse.Ok("Đã hủy đăng ký dịch vụ."));
        }
    }
}
