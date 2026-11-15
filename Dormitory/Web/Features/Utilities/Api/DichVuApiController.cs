using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Models;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Utilities.Api
{
    [ApiController]
    [Route("api/dichvu")]
    public class DichVuApiController : ControllerBase
    {
        private readonly IDichVuService _dichVuService;
        private readonly ICurrentUser? _currentUser;

        public DichVuApiController(IDichVuService dichVuService, ICurrentUser? currentUser = null)
        {
            _dichVuService = dichVuService;
            _currentUser = currentUser;
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var services = await _dichVuService.GetCatalogAsync();
            return Ok(ApiResponse<List<ServiceItemDto>>.Ok(services));
        }

        [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.KeToan}")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SaveServiceDto req)
        {
            var (success, errorMessage, data) = await _dichVuService.CreateServiceAsync(req);
            if (!success || data == null)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể thêm dịch vụ."));

            return Ok(ApiResponse<ServiceItemDto>.Ok(data, $"Đã thêm dịch vụ {data.Name}."));
        }

        [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.KeToan}")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] SaveServiceDto req)
        {
            var (success, errorMessage, data) = await _dichVuService.UpdateServiceAsync(id, req);
            if (!success || data == null)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể cập nhật dịch vụ."));

            return Ok(ApiResponse<ServiceItemDto>.Ok(data, $"Đã cập nhật dịch vụ {data.Name}."));
        }

        [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.KeToan}")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var (success, errorMessage) = await _dichVuService.DeleteServiceAsync(id);
            if (!success)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể xóa dịch vụ."));

            return Ok(ApiResponse.Ok($"Đã xóa dịch vụ {id}."));
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet("dangky")]
        public async Task<IActionResult> GetRegistrations([FromQuery] string? status, [FromQuery] string? academicYear)
        {
            var registrations = await _dichVuService.GetRegistrationsAsync(status, academicYear);
            return Ok(ApiResponse<List<ServiceRegistrationDto>>.Ok(registrations));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("dangky/{id}/approve")]
        public async Task<IActionResult> ApproveRegistration(int id)
        {
            var (success, errorMessage) = await _dichVuService.ApproveRegistrationAsync(id, _currentUser?.StaffId);
            if (!success)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể duyệt đơn dịch vụ."));

            return Ok(ApiResponse.Ok($"Đã duyệt đơn đăng ký dịch vụ #{id}. Sinh viên đã nhận được thông báo."));
        }

        public class RejectRegistrationRequest
        {
            public string? Reason { get; set; }
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("dangky/{id}/reject")]
        public async Task<IActionResult> RejectRegistration(int id, [FromBody] RejectRegistrationRequest req)
        {
            var (success, errorMessage) = await _dichVuService.RejectRegistrationAsync(id, _currentUser?.StaffId, req.Reason);
            if (!success)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể từ chối đơn dịch vụ."));

            return Ok(ApiResponse.Ok($"Đã từ chối đơn đăng ký dịch vụ #{id}. Sinh viên đã nhận được thông báo."));
        }
    }
}
