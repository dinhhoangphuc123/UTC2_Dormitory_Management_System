using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Services;
using Dormitory.Web.Features.Payments.Validators;

namespace Dormitory.Web.Features.Payments.Api
{
    [ApiController]
    [Route("api/thanhtoan")]
    public class ThanhToanApiController : ControllerBase
    {
        private readonly IThanhToanService _thanhToanService;

        public ThanhToanApiController(IThanhToanService thanhToanService)
        {
            _thanhToanService = thanhToanService;
        }

        [HttpPost("confirm")]
        public async Task<IActionResult> Confirm([FromBody] ConfirmPaymentDto req, [FromQuery] string? academicYear)
        {
            var (isValid, errorMessage) = ConfirmPaymentValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool success = await _thanhToanService.ProcessPaymentAsync(req, academicYear);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận thanh toán cho hóa đơn {req.InvoiceId}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể ghi nhận thanh toán."));
        }

        [HttpGet("total-revenue")]
        public async Task<IActionResult> GetTotalRevenue([FromQuery] string? academicYear)
        {
            var total = await _thanhToanService.GetTotalRevenueAsync(academicYear);
            return Ok(ApiResponse<decimal>.Ok(total));
        }
    }
}

