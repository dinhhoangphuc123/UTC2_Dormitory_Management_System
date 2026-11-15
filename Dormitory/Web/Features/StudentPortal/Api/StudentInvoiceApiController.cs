using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Middleware;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.StudentOnlyPolicy)]
    [SkipAcademicYearScope]
    [ApiController]
    [Route("api/me")]
    public class StudentInvoiceApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly IHoaDonService _hoaDonService;
        private readonly ICurrentUser? _currentUser;
        private readonly IWebHostEnvironment _env;

        public StudentInvoiceApiController(
            IStudentPortalService portalService,
            IHoaDonService hoaDonService,
            IWebHostEnvironment env,
            ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _hoaDonService = hoaDonService;
            _env = env;
            _currentUser = currentUser;
        }

        private string GetAppDataPath() => Path.Combine(_env.ContentRootPath, "App_Data");

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

        [HttpGet("invoices/{id}/qr")]
        public async Task<IActionResult> GetInvoiceQr(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var qr = await _portalService.GetInvoiceQrAsync(studentId, id);
            if (qr == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hóa đơn hoặc chưa cấu hình tài khoản ngân hàng KTX."));
            }

            return Ok(ApiResponse<VietQrDto>.Ok(qr));
        }

        [HttpPost("invoices/{id}/payment-proof")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> SubmitPaymentProof(string id, IFormFile? proof)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (success, errorMessage) = await _hoaDonService.SubmitPaymentProofAsync(id, studentId, proof, GetAppDataPath());
            if (!success)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể nộp minh chứng thanh toán."));
            }

            return Ok(ApiResponse.Ok("Đã nộp minh chứng thanh toán. BQL sẽ đối soát và cập nhật trong 1-2 giờ làm việc."));
        }

        [HttpGet("invoices/{id}/payment-proof")]
        public async Task<IActionResult> GetOwnPaymentProof(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var (bytes, contentType) = await _hoaDonService.GetInvoiceProofAsync(id, studentId, GetAppDataPath());
            if (bytes == null || contentType == null)
            {
                return NotFound();
            }

            return File(bytes, contentType);
        }
    }
}
