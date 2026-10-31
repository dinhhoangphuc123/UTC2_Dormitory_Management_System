using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Features.StudentPortal.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.StudentOnlyPolicy)]
    [ApiController]
    [Route("api/me")]
    public class StudentRegistrationApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentRegistrationApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet("rounds")]
        public async Task<IActionResult> GetRounds()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var rounds = await _portalService.GetRoundsAsync(studentId);
            return Ok(ApiResponse<List<RegistrationRoundDto>>.Ok(rounds));
        }

        [HttpGet("rounds/{id}/buildings")]
        public async Task<IActionResult> GetBuildings(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var buildings = await _portalService.GetBuildingsForRoundAsync(studentId, id);
            return Ok(ApiResponse<List<StudentBuildingDto>>.Ok(buildings));
        }

        [HttpGet("rounds/{id}/rooms")]
        public async Task<IActionResult> GetRooms(string id, [FromQuery] string? buildingId)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var rooms = await _portalService.GetRoomsForRoundAsync(studentId, id, buildingId);
            return Ok(ApiResponse<List<StudentRoomDto>>.Ok(rooms));
        }

        [HttpPost("applications")]
        public async Task<IActionResult> SubmitApplication([FromBody] SubmitApplicationRequestDto req)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = SubmitApplicationValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin đăng ký không hợp lệ."));
            }

            var (success, err, appId, statusCode) = await _portalService.SubmitApplicationAsync(studentId, req);
            if (!success)
            {
                if (statusCode == StatusCodes.Status409Conflict)
                {
                    return Conflict(ApiResponse.Fail(err ?? "Không thể gửi đơn đăng ký."));
                }
                return BadRequest(ApiResponse.Fail(err ?? "Không thể gửi đơn đăng ký."));
            }

            return StatusCode(StatusCodes.Status201Created, ApiResponse<string>.Ok(appId!, "Nộp đơn đăng ký nội trú thành công!"));
        }

        [HttpGet("applications")]
        public async Task<IActionResult> GetApplications()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var apps = await _portalService.GetApplicationsAsync(studentId);
            return Ok(ApiResponse<List<StudentApplicationDto>>.Ok(apps));
        }

        [HttpGet("applications/{id}")]
        public async Task<IActionResult> GetApplicationById(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var app = await _portalService.GetApplicationByIdAsync(studentId, id);
            if (app == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy đơn đăng ký."));
            }

            return Ok(ApiResponse<StudentApplicationDto>.Ok(app));
        }

        [HttpGet("applications/{id}/payment")]
        public async Task<IActionResult> GetPaymentInfo(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var paymentInfo = await _portalService.GetApplicationPaymentInfoAsync(studentId, id);
            if (paymentInfo == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin thanh toán giữ chỗ hoặc đơn chưa đủ điều kiện thanh toán."));
            }

            return Ok(ApiResponse<ApplicationPaymentInfoDto>.Ok(paymentInfo));
        }
    }
}
