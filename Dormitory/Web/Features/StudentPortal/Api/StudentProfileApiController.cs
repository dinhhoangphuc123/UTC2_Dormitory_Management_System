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
    public class StudentProfileApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentProfileApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var profile = await _portalService.GetProfileAsync(studentId);
            if (profile == null) return NotFound(ApiResponse.Fail("Không tìm thấy thông tin hồ sơ."));

            return Ok(ApiResponse<StudentProfileDto>.Ok(profile));
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = UpdateProfileValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool success = await _portalService.UpdateProfileAsync(studentId, dto);
            if (!success) return NotFound(ApiResponse.Fail("Không tìm thấy sinh viên."));

            return Ok(ApiResponse.Ok("Cập nhật thông tin liên hệ thành công."));
        }

        [HttpGet("guardians")]
        public async Task<IActionResult> GetGuardians()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var guardians = await _portalService.GetGuardiansAsync(studentId);
            return Ok(ApiResponse<List<GuardianDto>>.Ok(guardians));
        }

        [HttpPost("guardians")]
        public async Task<IActionResult> AddGuardian([FromBody] CreateGuardianDto dto)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = GuardianValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var (success, err) = await _portalService.AddGuardianAsync(studentId, dto);
            if (!success)
            {
                return BadRequest(ApiResponse.Fail(err ?? "Không thể thêm người liên hệ."));
            }

            return Ok(ApiResponse.Ok("Thêm thông tin người liên hệ thành công."));
        }

        [HttpPut("guardians/{id}")]
        public async Task<IActionResult> UpdateGuardian(string id, [FromBody] CreateGuardianDto dto)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = GuardianValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool success = await _portalService.UpdateGuardianAsync(studentId, id, dto);
            if (!success)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin người liên hệ."));
            }

            return Ok(ApiResponse.Ok("Cập nhật người liên hệ thành công."));
        }

        [HttpDelete("guardians/{id}")]
        public async Task<IActionResult> DeleteGuardian(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            bool success = await _portalService.DeleteGuardianAsync(studentId, id);
            if (!success)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin người liên hệ."));
            }

            return Ok(ApiResponse.Ok("Xóa thông tin người liên hệ thành công."));
        }

        [HttpGet("profile-change-requests")]
        public async Task<IActionResult> GetProfileChangeRequests()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var list = await _portalService.GetProfileChangeRequestsAsync(studentId);
            return Ok(ApiResponse<List<ProfileChangeRequestDto>>.Ok(list));
        }

        [HttpPost("profile-change-requests")]
        public async Task<IActionResult> CreateProfileChangeRequest([FromBody] CreateProfileChangeRequestDto dto)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = ProfileChangeRequestValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            await _portalService.CreateProfileChangeRequestAsync(studentId, dto);
            return Ok(ApiResponse.Ok("Đã gửi yêu cầu điều chỉnh thông tin hồ sơ tới Ban Quản lý."));
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto dto)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = ChangePasswordValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var (success, err) = await _portalService.ChangePasswordAsync(studentId, dto.CurrentPassword, dto.NewPassword);
            if (!success)
            {
                return BadRequest(ApiResponse.Fail(err ?? "Không thể đổi mật khẩu."));
            }

            return Ok(ApiResponse.Ok("Đổi mật khẩu thành công."));
        }
    }
}
