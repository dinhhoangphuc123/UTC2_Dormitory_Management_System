using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
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
            [FromQuery] string? search)
        {
            var invoices = await _hoaDonService.GetAllInvoicesAsync(building, category, status, search);
            return Ok(ApiResponse<List<InvoiceItemDto>>.Ok(invoices));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateInvoiceDto req)
        {
            var invoice = await _hoaDonService.CreateInvoiceAsync(req);
            return Ok(ApiResponse<InvoiceItemDto>.Ok(invoice, $"Đã tạo hóa đơn {invoice.Code} thành công!"));
        }

        [HttpPost("confirm-payment")]
        public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPaymentDto req)
        {
            bool success = await _hoaDonService.ConfirmPaymentAsync(req);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận thanh toán thành công cho hóa đơn {req.InvoiceId}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể xác nhận thanh toán."));
        }

        [HttpPost("send-reminders")]
        public async Task<IActionResult> SendReminders()
        {
            int count = await _hoaDonService.SendRemindersAsync();
            return Ok(ApiResponse.Ok($"Đã gửi thông báo nhắc nợ qua SMS và Email KTX tới {count} sinh viên!"));
        }
    }
}

