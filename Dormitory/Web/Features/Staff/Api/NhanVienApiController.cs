using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Services;
using Dormitory.Web.Features.Staff.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Staff.Api
{
    [ApiController]
    [Route("api/nhanvien")]
    public class NhanVienApiController : ControllerBase
    {
        private readonly INhanVienService _nhanVienService;
        private readonly ICurrentUser? _currentUser;

        public NhanVienApiController(INhanVienService nhanVienService, ICurrentUser? currentUser = null)
        {
            _nhanVienService = nhanVienService;
            _currentUser = currentUser;
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? department,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var staff = await _nhanVienService.GetAllStaffAsync(department, role, status, search);
            return Ok(ApiResponse<List<StaffItemDto>>.Ok(staff));
        }

        [Authorize(Roles = RoleNames.Admin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStaffDto req)
        {
            var (isValid, errorMessage) = CreateStaffValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            try
            {
                var staff = await _nhanVienService.CreateStaffAsync(req);
                var message = $"Đã thêm thành công nhân viên {staff.Name} ({staff.Code})! " +
                              $"Tên đăng nhập: {staff.Username}. Mật khẩu tạm: {staff.InitialPassword} (hãy đổi sau lần đăng nhập đầu tiên).";
                return Ok(ApiResponse<StaffItemDto>.Ok(staff, message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse.Fail(ex.Message));
            }
        }

        [Authorize(Roles = RoleNames.Admin)]
        [HttpPost("{id}/toggle-status")]
        public async Task<IActionResult> ToggleAccountAccess(string id)
        {
            bool success = await _nhanVienService.ToggleAccountAccessAsync(id, _currentUser?.StaffId);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã thay đổi trạng thái hoạt động tài khoản thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể thay đổi trạng thái tài khoản (nhân viên không tồn tại, chưa có tài khoản hoặc là tài khoản quản trị đang đăng nhập)."));
        }
    }
}
