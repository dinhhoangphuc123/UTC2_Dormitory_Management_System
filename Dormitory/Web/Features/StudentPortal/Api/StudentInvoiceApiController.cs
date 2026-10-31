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
    public class StudentInvoiceApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentInvoiceApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices([FromQuery] string? status, [FromQuery] string? type)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var invoices = await _portalService.GetInvoicesAsync(studentId, status, type);
            return Ok(ApiResponse<List<StudentInvoiceListItemDto>>.Ok(invoices));
        }

        [HttpGet("invoices/{id}")]
        public async Task<IActionResult> GetInvoiceById(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var invoice = await _portalService.GetInvoiceByIdAsync(studentId, id);
            if (invoice == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hóa đơn."));
            }

            return Ok(ApiResponse<StudentInvoiceDetailDto>.Ok(invoice));
        }

        [HttpGet("utilities")]
        public async Task<IActionResult> GetUtilities()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var utilities = await _portalService.GetUtilitiesAsync(studentId);
            return Ok(ApiResponse<StudentUtilityDto>.Ok(utilities ?? new StudentUtilityDto()));
        }
    }
}
