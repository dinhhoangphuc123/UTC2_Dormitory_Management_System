using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.Registrations.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Registrations.Api
{
    [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
    [ApiController]
    [Route("api/dondangky")]
    public class DonDangKyApiController : ControllerBase
    {
        private readonly IDonDangKyService _donDangKyService;
        private readonly ICurrentUser? _currentUser;

        public DonDangKyApiController(IDonDangKyService donDangKyService, ICurrentUser? currentUser = null)
        {
            _donDangKyService = donDangKyService;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery(Name = "status")] string? statusTab,
            [FromQuery] string? priority,
            [FromQuery] string? cohort,
            [FromQuery] string? gender,
            [FromQuery] string? academicYear)
        {
            var apps = await _donDangKyService.GetAllApplicationsAsync(statusTab, priority, cohort, gender, academicYear);
            return Ok(ApiResponse<List<ApplicationListItemDto>>.Ok(apps));
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(string id)
        {
            var result = await _donDangKyService.ApproveApplicationAsync(id, _currentUser?.StaffId, Request.Query["academicYear"].FirstOrDefault());
            if (result.Success)
            {
                return Ok(ApiResponse.Ok($"Đã duyệt hồ sơ đăng ký {id}."));
            }

            if (result.StatusCode == StatusCodes.Status409Conflict)
            {
                return Conflict(ApiResponse.Fail(result.ErrorMessage ?? "Phòng đã hết giường, hãy từ chối hoặc đề nghị sinh viên chọn phòng khác."));
            }

            return NotFound(ApiResponse.Fail(result.ErrorMessage ?? "Không tìm thấy hồ sơ đang chờ duyệt."));
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(string id, [FromBody] RejectApplicationDto? req)
        {
            var dto = req ?? new RejectApplicationDto { ApplicationId = id };
            dto.ApplicationId = id;
            var (isValid, errorMessage) = RejectApplicationValidator.Validate(dto);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool success = await _donDangKyService.RejectApplicationAsync(id, _currentUser?.StaffId, dto.Reason, Request.Query["academicYear"].FirstOrDefault());
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã từ chối đơn đăng ký {id}."));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ đang chờ duyệt."));
        }
    }
}
