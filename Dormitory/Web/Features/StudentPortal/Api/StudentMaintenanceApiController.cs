using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
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
    [Route("api/me/maintenance")]
    public class StudentMaintenanceApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;
        private readonly IWebHostEnvironment _env;

        public StudentMaintenanceApiController(
            IStudentPortalService portalService,
            IWebHostEnvironment env,
            ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _env = env;
            _currentUser = currentUser;
        }

        private string GetAppDataPath() => Path.Combine(_env.ContentRootPath, "App_Data");

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var tickets = await _portalService.GetMaintenanceTicketsAsync(studentId);
            return Ok(ApiResponse<List<StudentMaintenanceDto>>.Ok(tickets));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var ticket = await _portalService.GetMaintenanceTicketByIdAsync(studentId, id);
            if (ticket == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy phiếu yêu cầu sửa chữa."));
            }

            return Ok(ApiResponse<StudentMaintenanceDto>.Ok(ticket));
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] CreateMaintenanceRequestDto req)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (isValid, errorMessage) = CreateMaintenanceTicketValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin yêu cầu sửa chữa không hợp lệ."));
            }

            var (success, err, statusCode) = await _portalService.CreateMaintenanceTicketAsync(studentId, req, GetAppDataPath());
            if (!success)
            {
                if (statusCode == StatusCodes.Status409Conflict)
                {
                    return Conflict(ApiResponse.Fail(err ?? "Không thể gửi yêu cầu sửa chữa."));
                }
                return BadRequest(ApiResponse.Fail(err ?? "Không thể gửi yêu cầu sửa chữa."));
            }

            return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok("Gửi yêu cầu sửa chữa thành công!"));
        }

        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(int id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (bytes, contentType) = await _portalService.GetMaintenanceImageAsync(studentId, id, GetAppDataPath());
            if (bytes == null || contentType == null)
            {
                return NotFound();
            }

            return File(bytes, contentType);
        }
    }
}
