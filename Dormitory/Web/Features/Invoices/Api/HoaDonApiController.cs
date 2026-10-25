using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.Invoices.Validators;

namespace Dormitory.Web.Features.Invoices.Api
{
    [ApiController]
    [Route("api/hoadon")]
    public class HoaDonApiController : ControllerBase
    {
        private readonly IHoaDonService _hoaDonService;

        public HoaDonApiController(IHoaDonService hoaDonService)
        {
            _hoaDonService = hoaDonService;
        }

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

            return Ok(ApiResponse<InvoiceItemDto>.Ok(invoice, $"Đã tạo hóa đơn {invoice.Code} thành công!"));
        }

        public class ConfirmPaymentRequest
        {
            public string InvoiceId { get; set; } = string.Empty;
            public string PaymentMethod { get; set; } = "Tiền mặt (BQL)";
        }

        [HttpPost("confirm-payment")]
        public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPaymentRequest req, [FromQuery] string? academicYear)
        {
            bool success = await _hoaDonService.ConfirmPaymentAsync(req.InvoiceId, req.PaymentMethod, academicYear);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận thanh toán thành công cho hóa đơn {req.InvoiceId}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể xác nhận thanh toán."));
        }
    }
}
