using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Services;
using Dormitory.Web.Features.Payments.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Payments.Api
{
    [ApiController]
    [Route("api/thanhtoan")]
    public class ThanhToanApiController : ControllerBase
    {
        private readonly IThanhToanService _thanhToanService;
        private readonly ICurrentUser? _currentUser;
        private readonly IWebHostEnvironment? _env;

        public ThanhToanApiController(IThanhToanService thanhToanService, ICurrentUser? currentUser = null, IWebHostEnvironment? env = null)
        {
            _thanhToanService = thanhToanService;
            _currentUser = currentUser;
            _env = env;
        }

        [Authorize(Policy = RoleNames.ManagerOrAccountantPolicy)]
        [HttpPost("confirm")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Confirm([FromForm] ConfirmPaymentDto req, IFormFile? proof, [FromQuery] string? academicYear)
        {
            var (isValid, errorMessage) = ConfirmPaymentValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool success = await _thanhToanService.ProcessPaymentAsync(
                req, academicYear, _currentUser?.StaffId, proof,
                _env != null ? Path.Combine(_env.ContentRootPath, "App_Data") : null);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận thanh toán cho hóa đơn {req.InvoiceId}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể ghi nhận thanh toán."));
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet("total-revenue")]
        public async Task<IActionResult> GetTotalRevenue([FromQuery] string? academicYear)
        {
            var total = await _thanhToanService.GetTotalRevenueAsync(academicYear);
            return Ok(ApiResponse<decimal>.Ok(total));
        }
    }
}
