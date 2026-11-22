using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.Invoices.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Invoices.Api
{
    [ApiController]
    [Route("api/hoadon")]
    public class HoaDonApiController : ControllerBase
    {
        private readonly IHoaDonService _hoaDonService;
        private readonly ICurrentUser? _currentUser;
        private readonly IWebHostEnvironment? _env;

        public HoaDonApiController(IHoaDonService hoaDonService, ICurrentUser? currentUser = null, IWebHostEnvironment? env = null)
        {
            _hoaDonService = hoaDonService;
            _currentUser = currentUser;
            _env = env;
        }

        private string GetAppDataPath() => Path.Combine(_env!.ContentRootPath, "App_Data");

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] string? category,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var invoices = await _hoaDonService.GetAllInvoicesAsync(building, category, status, search, academicYear);
            return Ok(ApiResponse<List<InvoiceItemDto>>.Ok(invoices));
        }

        // BQL và kế toán được lập, sửa nháp, gửi và đối soát thanh toán hóa đơn theo DFD 6.0.
        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateInvoiceDto req)
        {
            var (isValid, errorMessage) = CreateInvoiceValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var invoice = await _hoaDonService.CreateInvoiceAsync(req, Request.Query["academicYear"].FirstOrDefault());
            if (invoice == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng nội trú đang hiệu lực phù hợp với sinh viên và phòng."));
            }

            return Ok(ApiResponse<InvoiceItemDto>.Ok(invoice,
                $"Đã lưu nháp hóa đơn {invoice.Code}. Kiểm tra lại rồi bấm Gửi cho sinh viên để phát hành kèm mã VietQR."));
        }

        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPut("{invoiceId}")]
        public async Task<IActionResult> UpdateDraft(string invoiceId, [FromBody] UpdateInvoiceDraftDto req,
            [FromQuery] string? academicYear)
        {
            var (isValid, errorMessage) = UpdateInvoiceDraftValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var (success, serviceError) = await _hoaDonService.UpdateDraftInvoiceAsync(invoiceId, req, academicYear);
            if (!success)
            {
                return BadRequest(ApiResponse.Fail(serviceError ?? "Không thể chỉnh sửa hóa đơn nháp."));
            }

            return Ok(ApiResponse.Ok($"Đã cập nhật hóa đơn nháp {invoiceId}."));
        }

        public class SendInvoiceRequest
        {
            public string InvoiceId { get; set; } = string.Empty;
        }

        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] SendInvoiceRequest req, [FromQuery] string? academicYear)
        {
            if (string.IsNullOrWhiteSpace(req.InvoiceId))
            {
                return BadRequest(ApiResponse.Fail("Mã hóa đơn không được để trống."));
            }

            bool success = await _hoaDonService.SendInvoiceAsync(req.InvoiceId.Trim(), academicYear);
            if (!success)
            {
                return BadRequest(ApiResponse.Fail("Không thể gửi hóa đơn (hóa đơn không tồn tại hoặc đã gửi trước đó)."));
            }

            return Ok(ApiResponse.Ok($"Đã gửi hóa đơn {req.InvoiceId} và thông báo cho sinh viên!"));
        }

        public class ConfirmPaymentRequest
        {
            public string InvoiceId { get; set; } = string.Empty;
            public string PaymentMethod { get; set; } = "Chuyển khoản";
        }

        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPost("confirm-payment")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ConfirmPayment([FromForm] ConfirmPaymentRequest req, IFormFile? proof, [FromQuery] string? academicYear)
        {
            if (string.IsNullOrWhiteSpace(req.InvoiceId))
            {
                return BadRequest(ApiResponse.Fail("Mã hóa đơn không được để trống."));
            }

            bool success = await _hoaDonService.ConfirmPaymentAsync(
                req.InvoiceId.Trim(), req.PaymentMethod, academicYear, _currentUser?.StaffId,
                proof, _env != null ? GetAppDataPath() : null);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận thanh toán thành công cho hóa đơn {req.InvoiceId}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể xác nhận thanh toán."));
        }

        public class RejectPaymentProofRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPost("{invoiceId}/reject-payment-proof")]
        public async Task<IActionResult> RejectPaymentProof(string invoiceId, [FromBody] RejectPaymentProofRequest req,
            [FromQuery] string? academicYear)
        {
            var (success, errorMessage) = await _hoaDonService.RejectPaymentProofAsync(
                invoiceId, req?.Reason, academicYear, _currentUser?.StaffId);
            if (!success)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể từ chối minh chứng."));
            }

            return Ok(ApiResponse.Ok($"Đã từ chối minh chứng của hóa đơn {invoiceId}. Sinh viên có thể nộp lại trong thời hạn giữ chỗ."));
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet("{invoiceId}/student-proof")]
        public async Task<IActionResult> GetStudentProof(string invoiceId)
        {
            var (bytes, contentType) = await _hoaDonService.GetInvoiceProofAsync(invoiceId, appDataPath: _env != null ? GetAppDataPath() : null);
            if (bytes == null || contentType == null)
            {
                return NotFound();
            }

            return File(bytes, contentType);
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet("{invoiceId}/payments/{paymentId}/proof")]
        public async Task<IActionResult> GetPaymentProof(string invoiceId, string paymentId)
        {
            var (bytes, contentType) = await _hoaDonService.GetPaymentProofAsync(paymentId, _env != null ? GetAppDataPath() : null, invoiceId);
            if (bytes == null || contentType == null)
            {
                return NotFound();
            }

            return File(bytes, contentType);
        }
    }
}
